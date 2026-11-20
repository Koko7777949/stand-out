import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'
import { expireStaleHolds, getPublicEvent, GOVERNORATES } from '@/lib/event-data'
import { generateSerial, randomId } from '@/lib/security'
import { audit } from '@/lib/payments'
import { limit, getClientIp } from '@/lib/rate-limit'
import { z } from 'zod'

const BookingSchema = z.object({
  holderName: z.string().trim().min(2, 'الاسم قصير جداً').max(60, 'الاسم طويل جداً'),
  holderAge: z.coerce.number().int('العمر لازم يكون رقم'),
  governorate: z.string().trim().min(2),
  consent: z.literal(true, { message: 'لازم توافق على الشروط والسياسة الخاصة' }),
})

export async function POST(req: Request) {
  const user = await getSessionUser(req)
  if (!user) return fail('سجل دخول الأول.', 401)
  if (!user.phoneVerifiedAt) return fail('لازم تأكد رقم موبايلك قبل الحجز.', 403)

  const gate = limit(`order:${getClientIp(req)}`, 8, 60 * 1000)
  if (!gate.ok) return fail('ضغط كتير. استنى دقيقة.', 429)

  const body = await readJson<Record<string, unknown>>(req)
  if (!body) return fail('بيانات ناقصة.')
  const parsed = BookingSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || 'بيانات مش صحيحة.')
  }
  const { holderName, holderAge, governorate, consent } = parsed.data

  await expireStaleHolds()
  const ev = await getPublicEvent()
  if (!ev) return fail('مفيش ايفنت مفتوح حالياً.', 404)
  const now = new Date()
  if (now < new Date(ev.bookingOpensAt)) return fail('الحجز لسه مفتحش. استنى إعلان موعد الفتح.')
  if (now > new Date(ev.bookingClosesAt)) return fail('الحجز اتقفل للايفنت ده.')
  if (holderAge < ev.ageMin || holderAge > ev.ageMax) {
    return fail(`العمر مسموح من ${ev.ageMin} لـ ${ev.ageMax} سنة.`)
  }
  if (!GOVERNORATES.includes(governorate)) return fail('اختار محافظة من القايمة.')

  // تذكرة واحدة لكل حساب
  const existing = await db.ticket.findFirst({
    where: { userId: user.id, status: { in: ['HELD', 'ISSUED', 'USED'] } },
  })
  if (existing) {
    if (existing.status === 'ISSUED') return fail('عندك تذكرة مؤكدة بالفعل. افتح "تذكرتك".', 409)
    return fail('عندك حجز شغال بالفعل. كمّل الدفع.', 409, { existingOrderId: existing.orderId })
  }

  // حجز المقعد — عملية ذرّية ضد البيع الزيادة
  let order = null as null | { id: string; holdExpiresAt: Date; amountMinor: number }
  try {
    await db.$transaction(async (tx) => {
      const bumped = await tx.$executeRawUnsafe(
        'UPDATE Event SET heldCount = heldCount + 1 WHERE id = ? AND soldCount + heldCount < capacity',
        ev.id,
      )
      if (bumped === 0) throw new Error('SOLD_OUT')
      const holdExpiresAt = new Date(now.getTime() + ev.holdMinutes * 60 * 1000)
      order = await tx.order.create({
        data: {
          userId: user.id,
          eventId: ev.id,
          status: 'HELD',
          amountMinor: ev.priceMinor, // السعر من قاعدة البيانات — مش من العميل
          currency: ev.currency,
          holdExpiresAt,
        },
      })
      let serial = generateSerial()
      for (let i = 0; i < 5; i++) {
        const clash = await tx.ticket.findUnique({ where: { serial } })
        if (!clash) break
        serial = generateSerial()
      }
      await tx.ticket.create({
        data: {
          orderId: order.id,
          userId: user.id,
          eventId: ev.id,
          status: 'HELD',
          holderName,
          holderAge,
          governorate,
          serial,
        },
      })
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'SOLD_OUT') return fail('المقاعد خلصت. اتمنى لك التوفيق في الدعوة الجاية.')
    return fail('حصل مشكلة في الحجز. جرّب تاني.')
  }

  await audit(user.id, 'order_held', 'order', order!.id, `seat held ${ev.holdMinutes}m`)

  // ايفنت مجاني (السعر صفر) — التذكرة بتتفعل فورًا من غير باب الدفع خالص
  if (order!.amountMinor === 0) {
    try {
      await db.$transaction(async (tx) => {
        const nowFree = new Date()
        await tx.payment.create({
          data: {
            orderId: order!.id,
            provider: 'free_entry',
            providerRef: randomId('free'),
            status: 'PAID',
            amountMinor: 0,
            method: 'free',
            idempotencyKey: randomId('idem'),
          },
        })
        await tx.order.update({
          where: { id: order!.id },
          data: { status: 'PAID', paidAt: nowFree, paymentMethod: 'free' },
        })
        await tx.$executeRawUnsafe(
          'UPDATE Event SET soldCount = soldCount + 1, heldCount = MAX(0, heldCount - 1) WHERE id = ?',
          ev.id,
        )
        await tx.ticket.updateMany({
          where: { orderId: order!.id, status: { in: ['DRAFT', 'HELD'] } },
          data: { status: 'ISSUED', issuedAt: nowFree },
        })
      })
      await audit(user.id, 'free_ticket_issued', 'order', order!.id, 'price=0 auto-issued')
      return ok({
        order: {
          id: order!.id,
          status: 'PAID',
          amountMinor: 0,
          holdExpiresAt: order!.holdExpiresAt.toISOString(),
          holdMinutes: ev.holdMinutes,
        },
      })
    } catch {
      // لو فشل التفعيل الفوري بيرجع للدفع العادي — الحالة HELD متسجلة
    }
  }

  return ok({
    order: {
      id: order!.id,
      status: 'HELD',
      amountMinor: order!.amountMinor,
      holdExpiresAt: order!.holdExpiresAt.toISOString(),
      holdMinutes: ev.holdMinutes,
    },
  })
}
