import { db } from '@/lib/db'
import { verifyOtp, normalizeEmail } from '@/lib/otp'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { limit, getClientIp } from '@/lib/rate-limit'
import { createSession, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session'
import { captureReferral, uniqueReferralCode } from '@/lib/referrals'
import { isAdminRole } from '@/lib/guards'
import { issueAdminTicket } from '@/lib/security'
import { ensureBootstrap } from '@/lib/bootstrap'

// تأكيد التسجيل بالايميل — الكود بيتأكد من قناة Email
// حساب الأدمن بيطلب طبقة تانية (كلمة سر) بعد الكود — زي الدخول برقم الموبايل
export async function POST(req: Request) {
  const body = await readJson<{ name?: string; email: string; code: string; refCode?: string }>(req)
  if (!body?.email || !body?.code) return fail('اكتب الكود اللي وصلك على الإيميل.')

  await ensureBootstrap()

  const gate = limit(`otp:verify:${getClientIp(req)}`, 12, 10 * 60 * 1000)
  if (!gate.ok) return fail('محاولات كتير. استنى دقيقة وجرّب تاني.', 429)

  const email = normalizeEmail(body.email)
  if (!email) return fail('الإيميل مش صحيح.')

  const v = await verifyOtp(email, 'email', body.code.trim())
  if (!v.ok) return fail(v.error)

  let user = await db.user.findUnique({ where: { email } })
  if (!user) {
    const name = (body.name || '').trim().slice(0, 60)
    if (name.length < 2) return fail('اكتب اسمك الكامل — بيظهر على التذكرة.')

    let referralCode = ''
    for (let i = 0; i < 8; i++) {
      try {
        referralCode = await uniqueReferralCode()
        break
      } catch { /* retry */ }
    }
    user = await db.user.create({
      data: {
        name,
        email,
        emailVerifiedAt: new Date(),
        provider: 'email',
        referralCode,
        consentAt: new Date(),
        lastLoginAt: new Date(),
      },
    })
    await captureReferral(user.id, body.refCode, req)
  } else {
    if (user.status !== 'active') return fail('الحساب ده موقوف. كلم الدعم.', 403)
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  }

  if (isAdminRole(user.role)) {
    return ok({
      needsAdminPassword: true,
      adminTicket: issueAdminTicket(user.id),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  }

  const { token, expiresAt } = await createSession(user.id, req)
  const res = ok({ user: { id: user.id, name: user.name, email: user.email, referralCode: user.referralCode } })
  const opts = sessionCookieOptions(Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  ;(res.cookies as unknown as { set: (o: unknown) => void }).set({ name: SESSION_COOKIE, value: token, ...opts })
  return res
}
