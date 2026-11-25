import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'
import { limit } from '@/lib/rate-limit'
import { audit } from '@/lib/payments'
import { expireStaleHolds } from '@/lib/event-data'

// تسجيل كود السفير على الطلب — من مساحة "كود السفير" اللي تحت طلب المراجعة
// بيتقبل قبل أو بعد تأكيد الدفع، وطول ما الطلب مش متأكد نهائيًا
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return fail('سجل دخول الأول.', 401)

  const gate = limit(`promo-apply:${user.id}`, 10, 60 * 1000)
  if (!gate.ok) return fail('محاولات كتير. استنى دقيقة.', 429)

  const { id: orderId } = await params
  const body = await readJson<{ promoCode?: string }>(req)
  const code = (body?.promoCode || '').trim().toUpperCase().slice(0, 24)
  if (!code) return fail('اكتب كود السفير الأول.')

  await expireStaleHolds()
  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order || order.userId !== user.id) return fail('مفيش طلب بالبيانات دي.', 404)
  if (!['HELD', 'PENDING', 'REVIEW'].includes(order.status)) {
    return fail('الطلب مش قابل للتعديل في الوضع الحالي.', 409)
  }
  if (order.promoCode) return fail('الطلب متسجل قبل كده بكود سفير تاني.', 409)

  const amb = await db.ambassador.findUnique({ where: { code } })
  if (!amb || !amb.active) return fail('كود السفير غير صحيح أو غير مفعّل.', 404)

  const [updated] = await db.$transaction([
    db.order.update({ where: { id: order.id }, data: { promoCode: amb.code } }),
    db.ambassador.update({ where: { id: amb.id }, data: { uses: { increment: 1 } } }),
  ])
  await audit(user.id, 'promo_applied', 'order', order.id, `code=${amb.code}`)

  return ok({ applied: true, code: updated.promoCode, name: amb.name })
}
