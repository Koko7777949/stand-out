import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'
import { getSettings, setSettings, EDITABLE_SETTING_KEYS } from '@/lib/settings'
import { sendEmail, sendWhatsApp, whatsappConfigured } from '@/lib/notify'
import { audit } from '@/lib/payments'
import { normalizePhone } from '@/lib/otp'
import { ensureBootstrap } from '@/lib/bootstrap'

// إعدادات النظام — قراءة للمسؤولين، تعديل يخزن في قاعدة البيانات
// مزود واتساب (UltraMsg) بقى من متغيرات البيئة فقط ومش بيرجع في الإعدادات نهائيًا
// أسرار الإيميل بترجع masked — ومش بتتكتب لو الأدمن سبها زي ما هي
function maskSecret(v: string | undefined | null): string {
  if (!v) return ''
  return '••••••' + String(v).slice(-4)
}

function isMasked(v: unknown): boolean {
  return typeof v === 'string' && v.startsWith('••••••')
}

async function settingsPayload() {
  const s = await getSettings()
  const emailDb = !!s.resendApiKey
  const emailEnv = !!process.env.RESEND_API_KEY
  const emailConfigured = s.emailProvider === 'custom' ? !!s.emailGatewayUrl : (emailDb || emailEnv)
  const waConfigured = await whatsappConfigured()

  const adminPasswordRow = await db.setting.findUnique({ where: { key: 'adminPasswordHash' } })

  return {
    ...s,
    resendApiKey: maskSecret(s.resendApiKey),
    emailGatewayKey: maskSecret(s.emailGatewayKey),
    emailConfigured,
    whatsappConfigured: waConfigured,
    adminPasswordSet: !!adminPasswordRow?.value,
  }
}

export async function GET(req: Request) {
  await ensureBootstrap()
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)
  return ok({ settings: await settingsPayload() })
}

export async function PUT(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const body = await readJson<Record<string, string>>(req)
  if (!body) return fail('بيانات ناقصة.')

  const clean: Record<string, string> = {}
  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE_SETTING_KEYS.includes(k)) continue
    // لو القيمة mask مش بنكتبها — معناها الأدمن مسابها زي ما هي
    if (isMasked(v)) continue
    clean[k] = String(v)
  }

  // تحقق من القيم الجديدة
  if (clean.emailProvider && !['resend', 'custom'].includes(clean.emailProvider)) {
    return fail('مزود الإيميل غير معروف.')
  }
  if (clean.supportPhone) {
    const p = normalizePhone(clean.supportPhone)
    if (!p) return fail('رقم التواصل مش رقم موبايل صحيح.')
    clean.supportPhone = p
  }
  if (clean.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean.supportEmail)) {
    return fail('إيميل التواصل مش صحيح.')
  }
  if (clean.emailFromAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean.emailFromAddress.replace(/^.*</, '').replace(/>.*$/, ''))) {
    return fail('عنوان المرسل (from) مش إيميل صحيح.')
  }
  if (clean.hideDevOtp && !['0', '1'].includes(clean.hideDevOtp)) return fail('قيمة إخفاء الكود مش صحيحة.')

  await setSettings(clean)
  await audit(admin.id, 'settings_updated', 'setting', null, Object.keys(clean).join(','))
  return ok({ settings: await settingsPayload() })
}

// اختبار القنوات — رسالة تجربة للرقم/الايميل اللي الأدمن يحدده
// واتساب بيتبعت عبر UltraMsg (من متغيرات البيئة)
export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const body = await readJson<{ channel?: string; target?: string }>(req)
  const channel = body?.channel
  const target = (body?.target || '').trim()
  if (!channel || !target) return fail('حدد القناة والهدف.')

  if (channel === 'whatsapp') {
    const phone = normalizePhone(target)
    if (!phone) return fail('رقم التجربة مش صحيح.')
    const sent = await sendWhatsApp(phone, 'رسالة تجربة من لوحة تحكم Stand Out — كود الدخول بيوصل واتساب على الرقم المطلوب التحقق منه')
    await audit(admin.id, 'whatsapp_test', 'setting', null, sent ? 'delivered' : 'failed')
    return sent
      ? ok({ sent: true })
      : fail('الإرسال على واتساب فشل — راجع ULTRAMSG_INSTANCE و ULTRAMSG_TOKEN في متغيرات البيئة.')
  }

  if (channel === 'email') {
    const email = target.toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('إيميل التجربة مش صحيح.')
    const sent = await sendEmail(email, 'رسالة تجربة — Stand Out', '000000')
    await audit(admin.id, 'email_test', 'setting', null, sent ? 'delivered' : 'failed')
    return sent
      ? ok({ sent: true })
      : fail('الإرسال فشل — راجع مفتاح Resend أو عنوان المرسل (from).')
  }

  return fail('قناة غير معروفة.')
}
