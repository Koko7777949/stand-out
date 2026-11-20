import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { verifyAdminTicket, verifyPassword } from '@/lib/security'
import { limit, getClientIp } from '@/lib/rate-limit'
import { createSession, sessionCookieOptions, SESSION_COOKIE } from '@/lib/session'
import { isAdminRole } from '@/lib/guards'
import { getPrivateSetting } from '@/lib/settings'

// الطبقة التانية لتسجيل دخول الأدمن — كلمة السر بعد تأكيد كود الـ SMS
// التذكرة بتيجي من /api/auth/otp/verify (أو email/verify) وتنتهي بعد 5 دقايق
export async function POST(req: Request) {
  const gate = limit(`admpass:${getClientIp(req)}`, 8, 10 * 60 * 1000)
  if (!gate.ok) return fail('محاولات كتير على كلمة السر. استنى دقيقة وجرّب تاني.', 429)

  const body = await readJson<{ adminTicket?: string; password?: string }>(req)
  if (!body?.adminTicket || !body?.password) return fail('اكتب كلمة سر الأدمن.')

  const ticket = verifyAdminTicket(body.adminTicket)
  if (!ticket) return fail('وقت الخطوة دي خلص — ابعت كود تاني وابدأ من الأول.')

  const user = await db.user.findUnique({ where: { id: ticket.userId } })
  if (!user || user.status !== 'active' || !isAdminRole(user.role)) {
    return fail('الحساب ده مفيهوش صلاحية أدمن.', 403)
  }

  const storedHash = await getPrivateSetting('adminPasswordHash')
  if (!storedHash) return fail('مفيش كلمة سر متظبطة للنظام — كلم المسؤول الأعلى.', 500)

  if (!verifyPassword(body.password, storedHash)) {
    return fail('كلمة السر غلط. جرّب تاني.')
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

  const { token, expiresAt } = await createSession(user.id, req)
  const res = ok({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      referralCode: user.referralCode,
    },
  })
  const opts = sessionCookieOptions(Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  ;(res.cookies as unknown as { set: (o: unknown) => void }).set({ name: SESSION_COOKIE, value: token, ...opts })
  return res
}
