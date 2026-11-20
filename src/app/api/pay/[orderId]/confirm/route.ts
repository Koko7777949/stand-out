import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'
import { limit } from '@/lib/rate-limit'
import { audit } from '@/lib/payments'

// تأكيد المستخدم إنه حوّل الفلوس — بيسجّل ادعاء الدفع ويبعد الطلب تحت مراجعة الفريق.
// التحويلات اليدوية (InstaPay/المحافظ) بتتأكد من الأدمن بعد ما يشوف الفلوس في حسابه —
// التذكرة مش بتتفعل إلا بعد تأكيد الأدمن أو ويبهوك مزود الدفع الحقيقي.
export async function POST(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return fail('سجل دخول الأول.', 401)

  const gate = limit(`confirm:${user.id}`, 10, 60 * 1000)
  if (!gate.ok) return fail('محاولات كتير. استنى دقيقة.', 429)

  const { orderId } = await params
  const body = await readJson<{ paymentId: string }>(req)
  if (!body?.paymentId) return fail('بيانات ناقصة.')

  const payment = await db.payment.findUnique({ where: { id: body.paymentId }, include: { order: true } })
  if (!payment || payment.orderId !== orderId || payment.order.userId !== user.id) {
    return fail('مفيش عملية دفع بالبيانات دي.', 404)
  }
  if (payment.status === 'PAID') {
    return ok({ status: 'PAID', already: true })
  }
  if (payment.status !== 'PENDING') {
    return fail('العملية دي مش قابلة للتأكيد — ابدأ دفعة جديدة.', 409)
  }

  // ادعاء الدفع: الطلب بيتحول لوضع PENDING (تحت المراجعة) والاحتفاظ بالمقعد بيمتد 24 ساعة
  // عشان الفريق يلحق يراجع التحويل من غير ما المقعد يرجع للناس
  const now = new Date()
  await db.order.update({
    where: { id: orderId },
    data: {
      status: 'PENDING',
      holdExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
  })
  await audit(user.id, 'payment_claimed', 'payment', payment.id, `order=${orderId} method=${payment.method} ref=${payment.providerRef.slice(-10).toUpperCase()}`)

  return ok({ status: 'PENDING_VERIFICATION' })
}
