import { db } from '@/lib/db'
import { verifyOtp, normalizePhone } from '@/lib/otp'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { limit, getClientIp } from '@/lib/rate-limit'
import { createSession, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session'
import { captureReferral, uniqueReferralCode } from '@/lib/referrals'
import { isAdminRole } from '@/lib/guards'
import { issueAdminTicket } from '@/lib/security'
import { ensureBootstrap } from '@/lib/bootstrap'

// دخول / تسجيل برقم الموبايل — الكود بيتأكد من قناة واتساب
// لو الرقم ده بتاع أدمن — الجلسة مش بتتعمل هنا:
// بيرجع تذكرة مؤقتة لخطوة كلمة السر (الطبقة التانية) في /api/auth/admin/confirm
export async function POST(req: Request) {
  const body = await readJson<{ phone: string; code: string; refCode?: string }>(req)
  if (!body?.phone || !body?.code) return fail('اكتب الكود اللي وصلك.')

  await ensureBootstrap()

  const gate = limit(`otp:verify:${getClientIp(req)}`, 12, 10 * 60 * 1000)
  if (!gate.ok) return fail('محاولات كتير. استنى دقيقة وجرّب تاني.', 429)

  const phone = normalizePhone(body.phone)
  if (!phone) return fail('الرقم مش صحيح.')

  const v = await verifyOtp(phone, 'whatsapp', body.code.trim())
  if (!v.ok) return fail(v.error)

  let user = await db.user.findUnique({ where: { phone } })
  if (!user) {
    let referralCode = ''
    for (let i = 0; i < 8; i++) {
      try {
        referralCode = await uniqueReferralCode()
        break
      } catch { /* retry */ }
    }
    user = await db.user.create({
      data: {
        name: '',
        phone,
        phoneVerifiedAt: new Date(),
        provider: 'phone',
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

  // حساب أدمن؟ لازم طبقة تانية: كلمة السر — الجلسة بتتعمل بعد تأكيدها
  if (isAdminRole(user.role)) {
    return ok({
      needsAdminPassword: true,
      adminTicket: issueAdminTicket(user.id),
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    })
  }

  const { token, expiresAt } = await createSession(user.id, req)
  const res = ok({ user: { id: user.id, name: user.name, phone: user.phone, referralCode: user.referralCode } })
  const opts = sessionCookieOptions(Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  ;(res.cookies as unknown as { set: (o: unknown) => void }).set({ name: SESSION_COOKIE, value: token, ...opts })
  return res
}
