import { db } from '@/lib/db'
import { sha256, randomDigits } from '@/lib/security'
import { limit, getClientIp } from '@/lib/rate-limit'
import { sendWhatsApp, sendEmail } from '@/lib/notify'
import { getSettings } from '@/lib/settings'

// أرقام مصر: 01[0125] + 8 أرقام
const EGY_PHONE = /^01[0125]\d{8}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// أكواد الموبايل بتتبعت واتساب على الرقم اللي عايزين نتحقق منه — بدون SMS نهائيًا (حسب طلب صاحب الموقع)
export type OtpChannel = 'whatsapp' | 'email'

export function normalizePhone(raw: string): string | null {
  const t = raw.replace(/[\s\-()\u200f\u200e]/g, '')
  let p = t
  if (p.startsWith('+20')) p = '0' + p.slice(3)
  else if (p.startsWith('20') && p.length === 12) p = '0' + p.slice(2)
  if (!EGY_PHONE.test(p)) return null
  return p
}

export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase()
  if (!EMAIL.test(e) || e.length > 120) return null
  return e
}

export type OtpRequestResult =
  | { ok: true; expiresInSec: number; devCode?: string }
  | { ok: false; error: string; retryAfterSec?: number }

// طلب كود تحقق — واتساب للموبايل أو Email للإيميل
// كود الموبايل بيوصل رسالة واتساب (UltraMsg) على الرقم المطلوب التحقق منه — بدون SMS
// ولو واتساب مش مربوط ببيانات المزود (وضع تطوير) الكود بيرجع للشاشة
export async function requestOtp(target: string, channel: OtpChannel, req: Request): Promise<OtpRequestResult> {
  // لكل هدف: 3 طلبات كل 10 دقائق
  const byTarget = limit(`otp:${channel}:${target}`, 3, 10 * 60 * 1000)
  if (!byTarget.ok) {
    return { ok: false, error: 'ضغطت كتير على الإرسال. جرّب تاني بعد دقيقة.', retryAfterSec: byTarget.retryAfterSec }
  }
  // لكل IP: 15 طلب في الساعة
  const byIp = limit(`otp:ip:${getClientIp(req)}`, 15, 60 * 60 * 1000)
  if (!byIp.ok) {
    return { ok: false, error: 'محاولات كتير من نفس الشبكة. جرّب بعد شوية.', retryAfterSec: byIp.retryAfterSec }
  }

  const recent = await db.otpCode.findFirst({
    where: { target, channel, createdAt: { gt: new Date(Date.now() - 60 * 1000) } },
  })
  if (recent) {
    return { ok: false, error: 'استنى دقيقة قبل ما تبعت كود جديد.', retryAfterSec: 60 }
  }

  const code = randomDigits(6)
  await db.otpCode.create({
    data: {
      target,
      channel,
      codeHash: sha256(`${code}:sou-otp:${channel}`),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      ipHash: null,
    },
  })

  // الإرسال الفعلي — واتساب للموبايل (UltraMsg) والإيميل للبريد
  let delivered = false
  if (channel === 'whatsapp') {
    const message = `كود التحقق بتاعك لدخول Stand Out: ${code} — صالح 5 دقايق`
    delivered = await sendWhatsApp(target, message)
  } else {
    delivered = await sendEmail(target, 'كود التحقق — Stand Out', code)
  }

  // لو الرسالة وصلت فعلًا مفيش داعي نعرض الكود على الشاشة حتى في وضع التطوير
  if (delivered) return { ok: true, expiresInSec: 300 }

  const s = await getSettings()
  const devCode = s.hideDevOtp === '1' ? undefined : code
  return { ok: true, expiresInSec: 300, devCode }
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; error: string }

export async function verifyOtp(target: string, channel: OtpChannel, code: string): Promise<OtpVerifyResult> {
  const rec = await db.otpCode.findFirst({
    where: { target, channel, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!rec) return { ok: false, error: 'الكود انتهى صلاحيته. ابعت كود جديد.' }
  if (rec.attempts >= 5) {
    await db.otpCode.update({ where: { id: rec.id }, data: { consumedAt: new Date() } })
    return { ok: false, error: 'محاولات كتير غلط. ابعت كود جديد.' }
  }
  const hash = sha256(`${code}:sou-otp:${channel}`)
  await db.otpCode.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } })
  if (hash !== rec.codeHash) return { ok: false, error: 'الكود غلط. بص على الرسالة تاني.' }
  await db.otpCode.update({ where: { id: rec.id }, data: { consumedAt: new Date() } })
  return { ok: true }
}
