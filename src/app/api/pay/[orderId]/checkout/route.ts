import { ok, fail, readJson } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'
import { createCheckout } from '@/lib/payments'
import { PAYMENT_METHODS } from '@/lib/event-data'
import { limit, getClientIp } from '@/lib/rate-limit'

const METHOD_IDS = PAYMENT_METHODS.map((m) => m.id)

export async function POST(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return fail('سجل دخول الأول.', 401)

  const gate = limit(`checkout:${user.id}:${getClientIp(req)}`, 10, 60 * 1000)
  if (!gate.ok) return fail('ضغط كتير على بوابة الدفع. استنى دقيقة.', 429)

  const { orderId } = await params
  const body = await readJson<{ method: string }>(req)
  if (!body?.method || !METHOD_IDS.includes(body.method as never)) {
    return fail('اختار طريقة دفع من القايمة.')
  }

  const res = await createCheckout(orderId, user.id, body.method)
  if (!res.ok) {
    return fail(res.error, res.code === 'hold_expired' ? 410 : 400, { code: res.code })
  }
  return ok(res)
}
