import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'
import { completePayment, audit } from '@/lib/payments'

// تأكيد / رفض دفعة يدويًا — بعد ما الأدمن يتأكد من التحويل في حسابه
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const { id } = await params
  const body = await readJson<{ action?: string; txnId?: string }>(req)
  if (!body?.action) return fail('حدد الإجراء: تأكيد أو رفض.')

  const payment = await db.payment.findUnique({ where: { id }, include: { order: true } })
  if (!payment) return fail('مفيش دفعة بالبيانات دي.', 404)

  if (body.action === 'complete') {
    if (payment.status === 'PAID') return ok({ already: true })
    const txn = (body.txnId || `admin_${admin.id.slice(-6)}_${Date.now().toString(36)}`).slice(0, 60)
    const r = await completePayment(payment.id, txn)
    if (!r.ok) return fail(r.error, r.status || 400)
    await audit(admin.id, 'payment_manually_completed', 'payment', payment.id, `order=${payment.orderId} txn=${txn}`)
    return ok({ status: 'PAID' })
  }

  if (body.action === 'fail') {
    if (payment.status === 'PAID') return fail('الدفعة اتأكدت من قبل — مش ممكن ترفضها. استخدم أدوات الاسترجاع.')
    await db.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    await audit(admin.id, 'payment_rejected', 'payment', payment.id, `order=${payment.orderId}`)
    return ok({ status: 'FAILED' })
  }

  return fail('إجراء غير معروف.')
}
