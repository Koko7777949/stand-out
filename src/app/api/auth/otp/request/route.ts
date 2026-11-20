import { requestOtp, normalizePhone } from '@/lib/otp'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { ensureBootstrap } from '@/lib/bootstrap'

// طلب كود دخول عبر واتساب — الكود بيتابعت عبر مزود واتساب (UltraMsg/Meta/GreenAPI/Twilio)،
// ولو واتساب مش مربوط بيحاول SMS، وفي وضع التطوير بيرجع على الشاشة
export async function POST(req: Request) {
  await ensureBootstrap()
  const body = await readJson<{ phone?: string }>(req)
  if (!body?.phone) return fail('اكتب رقم الموبايل.')

  const phone = normalizePhone(body.phone)
  if (!phone) return fail('الرقم مش رقم موبايل مصري صحيح.')

  const r = await requestOtp(phone, 'whatsapp', req)
  if (!r.ok) return fail(r.error, 429, { retryAfterSec: r.retryAfterSec })
  return ok({ phone, devCode: r.devCode, expiresInSec: r.expiresInSec })
}
