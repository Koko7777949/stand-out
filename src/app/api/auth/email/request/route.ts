import { requestOtp, normalizeEmail } from '@/lib/otp'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { ensureBootstrap } from '@/lib/bootstrap'

// طلب كود تحقق على الإيميل عند التسجيل بالايميل
// الكود بيتبعت عبر Resend أو البوابة اللي الأدمن ربطها، وفي وضع التطوير بيرجع على الشاشة
export async function POST(req: Request) {
  await ensureBootstrap()
  const body = await readJson<{ email?: string }>(req)
  if (!body?.email) return fail('اكتب الإيميل بتاعك.')

  const email = normalizeEmail(body.email)
  if (!email) return fail('الإيميل مش صحيح — راجعه وجرّب تاني.')

  const r = await requestOtp(email, 'email', req)
  if (!r.ok) return fail(r.error, 429, { retryAfterSec: r.retryAfterSec })
  return ok({ email, devCode: r.devCode, expiresInSec: r.expiresInSec })
}
