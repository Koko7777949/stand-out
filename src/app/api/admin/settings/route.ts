import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'
import { getSettings, setSettings, EDITABLE_SETTING_KEYS } from '@/lib/settings'
import { sendSms, sendEmail, sendWhatsApp, whatsappConfigured } from '@/lib/notify'
import { audit } from '@/lib/payments'
import { normalizePhone } from '@/lib/otp'
import { ensureBootstrap } from '@/lib/bootstrap'

// إعدادات النظام — قراءة للمسؤولين، تعديل يخزن في قاعدة البيانات
// الأسرار (أكواد المزودات) بترجع masked — ومش بتتكتب لو الأدمن سبها زي ما هي
function maskSecret(v: string | undefined | null): string {
  if (!v) return ''
  return '••••••' + String(v).slice(-4)
}

function isMasked(v: unknown): boolean {
  return typeof v === 'string' && v.startsWith('••••••')
}

async function settingsPayload() {
  const s = await getSettings()

  const smsMisrDb = !!(s.smsMisrUsername && s.smsMisrPassword && s.smsMisrToken)
  const smsMisrEnv = !!(process.env.SMSMISR_USERNAME && process.env.SMSMISR_PASSWORD && process.env.SMSMISR_TOKEN)
  const emailDb = !!s.resendApiKey
  const emailEnv = !!process.env.RESEND_API_KEY

  const smsConfigured = s.smsProvider === 'custom' ? !!s.smsGatewayUrl : (smsMisrDb || smsMisrEnv)
  const emailConfigured = s.emailProvider === 'custom' ? !!s.emailGatewayUrl : (emailDb || emailEnv)
  const waConfigured = await whatsappConfigured()

  const adminPasswordRow = await db.setting.findUnique({ where: { key: 'adminPasswordHash' } })

  return {
    ...s,
    ultramsgToken: maskSecret(s.ultramsgToken),
    metaWhatsappToken: maskSecret(s.metaWhatsappToken),
    greenApiToken: maskSecret(s.greenApiToken),
    twilioAuthToken: maskSecret(s.twilioAuthToken),
    whatsappGatewayKey: maskSecret(s.whatsappGatewayKey),
    smsMisrPassword: maskSecret(s.smsMisrPassword),
    smsMisrToken: maskSecret(s.smsMisrToken),
    smsGatewayKey: maskSecret(s.smsGatewayKey),
    resendApiKey: maskSecret(s.resendApiKey),
    emailGatewayKey: maskSecret(s.emailGatewayKey),
    smsConfigured,
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
  if (clean.whatsappProvider && !['ultramsg', 'meta', 'greenapi', 'twilio', 'custom'].includes(clean.whatsappProvider)) {
    return fail('مزود واتساب غير معروف.')
  }
  if (clean.smsProvider && !['smsmisr', 'custom'].includes(clean.smsProvider)) {
    return fail('مزود الـ SMS غير معروف.')
  }
  if (clean.emailProvider && !['resend', 'custom'].includes(clean.emailProvider)) {
    return fail('مزود الإيميل غير معروف.')
  }
  if (clean.smsMisrEnvironment && !['1', '2'].includes(clean.smsMisrEnvironment)) {
    return fail('بيئة SMSMisr لازم تكون 1 (تجربة) أو 2 (إنتاج).')
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

// اختبار المزودات — بيبعت رسالة تجربة للرقم/الايميل اللي الأدمن يحدده
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
    const sent = await sendWhatsApp(phone, 'رسالة تجربة من لوحة تحكم Stand Out — مزود واتساب شغال وجاهز يستقبل أكواد الدخول')
    await audit(admin.id, 'whatsapp_test', 'setting', null, sent ? 'delivered' : 'failed')
    return sent
      ? ok({ sent: true })
      : fail('الإرسال على واتساب فشل — راجع بيانات المزود (Instance/Token أو رقم الواتساب الرسمي) أو شغّل بوابة مخصصة.')
  }

  if (channel === 'sms') {
    const phone = normalizePhone(target)
    if (!phone) return fail('رقم التجربة مش صحيح.')
    const sent = await sendSms(phone, 'رسالة تجربة من لوحة تحكم Stand Out — مزود الرسائل شغال وجاهز يستقبل أكواد الدخول')
    await audit(admin.id, 'sms_test', 'setting', null, sent ? 'delivered' : 'failed')
    return sent
      ? ok({ sent: true })
      : fail('الإرسال فشل — راجع بيانات المزود (اسم المستخدم/كلمة السر/التوكن) أو شغّل بوابة مخصصة.')
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
