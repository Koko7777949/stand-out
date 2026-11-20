import { db } from '@/lib/db'

// تحرير المقاعد اللي خلص وقت الاحتفاظ فيها — بتتنادى قبل أي قراءة متعلقة
export async function expireStaleHolds() {
  const stale = await db.order.findMany({
    where: { status: 'HELD', holdExpiresAt: { lt: new Date() } },
    select: { id: true, eventId: true },
    take: 50,
  })
  for (const o of stale) {
    try {
      await db.$transaction(async (tx) => {
        const r = await tx.order.updateMany({
          where: { id: o.id, status: 'HELD' },
          data: { status: 'EXPIRED' },
        })
        if (r.count === 0) return
        await tx.ticket.updateMany({
          where: { orderId: o.id, status: { in: ['DRAFT', 'HELD'] } },
          data: { status: 'EXPIRED' },
        })
        await tx.$executeRawUnsafe(
          'UPDATE Event SET heldCount = MAX(0, heldCount - 1) WHERE id = ?',
          o.eventId,
        )
      })
    } catch {
      // متزامن مع عملية تانية — اللفة الجاية بتلقطه
    }
  }
}

export async function getPublicEvent() {
  await expireStaleHolds()
  // الايفنت المفعّل من لوحة الأدمن هو الوحيد اللي بيظهر للعامة
  const ev = await db.event.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!ev) return null
  return {
    id: ev.id,
    name: ev.name,
    startsAt: ev.startsAt.toISOString(),
    venue: ev.venue,
    city: ev.city,
    capacity: ev.capacity,
    soldCount: ev.soldCount,
    priceMinor: ev.priceMinor,
    currency: ev.currency,
    holdMinutes: ev.holdMinutes,
    bookingOpensAt: ev.bookingOpensAt.toISOString(),
    bookingClosesAt: ev.bookingClosesAt.toISOString(),
    ageMin: ev.ageMin,
    ageMax: ev.ageMax,
    settings: JSON.parse(ev.settings || '{}'),
  }
}

export function formatEgp(minor: number): string {
  return `${(minor / 100).toLocaleString('en-US')} جنيه`
}

export const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية', 'القليوبية',
  'كفر الشيخ', 'الغربية', 'المنوفية', 'البحيرة', 'الإسماعيلية', 'بورسعيد',
  'السويس', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا',
  'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح', 'شمال سيناء',
  'جنوب سيناء', 'دمياط',
]

export const PAYMENT_METHODS = [
  { id: 'instapay', label: 'InstaPay', hint: 'تحويل فوري بين الحسابات' },
  { id: 'vodafone_cash', label: 'Vodafone Cash', hint: 'محفظة إلكترونية' },
  { id: 'orange_cash', label: 'Orange Cash', hint: 'محفظة إلكترونية' },
  { id: 'etisalat_cash', label: 'e& money', hint: 'محفظة إلكترونية' },
  { id: 'we_pay', label: 'WE Pay', hint: 'محفظة إلكترونية' },
  { id: 'card', label: 'Visa / Mastercard', hint: 'كروت بنكية وميزة' },
] as const

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id']
