import { db } from '@/lib/db'

// إعدادات النظام — بتتخزن في قاعدة البيانات وبتتدار من لوحة تحكم الأدمن
// مزودات الرسائل الحقيقية: SMSMisr للـ SMS و Resend للإيميل
// وممكن كمان بوابة مخصصة (Victory Links أو غيرها) عبر رابط POST JSON
export const SETTING_DEFAULTS: Record<string, string> = {
  siteName: 'Stand Out',
  tagline: 'قمة Stand Out السنوية — مكانك بين الأوائل',
  supportEmail: '',
  supportPhone: '',

  // مزود واتساب — الأساسي لأكواد التحقق على الموبايل (حسب طلب صاحب الموقع)
  // القيم: ultramsg | meta | greenapi | twilio | custom
  whatsappProvider: 'ultramsg',
  ultramsgInstance: '',
  ultramsgToken: '',
  metaWhatsappToken: '',
  metaPhoneNumberId: '',
  metaWhatsappTemplateName: '', // Template معتمد بمتغير {{1}} للكود — نص حر لو فاضي
  metaWhatsappTemplateLang: 'ar',
  greenApiInstance: '',
  greenApiToken: '',
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioWhatsappFrom: 'whatsapp:+14155238886',
  // بوابة واتساب مخصصة (POST JSON: to / message / sender)
  whatsappGatewayUrl: '',
  whatsappGatewayKey: '',

  // مزود SMS (احتياطي لو واتساب مش مربوط): smsmisr | custom
  smsProvider: 'smsmisr',
  smsMisrUsername: '',
  smsMisrPassword: '',
  smsMisrToken: '',
  smsMisrSender: 'StandOut',
  smsMisrEnvironment: '2', // 1 = بيئة تجريبية، 2 = إنتاج
  // بوابة مخصصة (احتياطي لأي مزود تاني زي Victory Links)
  smsGatewayUrl: '',
  smsGatewayKey: '',
  smsSenderName: 'StandOut',

  // مزود الإيميل: resend | custom
  emailProvider: 'resend',
  resendApiKey: '',
  emailFromName: 'Stand Out',
  emailFromAddress: 'onboarding@resend.dev',
  // بوابة مخصصة (احتياطي)
  emailGatewayUrl: '',
  emailGatewayKey: '',

  hideDevOtp: '0',

  // نقاط الدعوة — نقاط ثابتة لكل صديق مؤهل + مكافآت المستويات
  pointsPerReferral: '10',
}

// المفاتيح المسموح تعديلها من اللوحة — أي مفتاح تاني بيرفض
export const EDITABLE_SETTING_KEYS = Object.keys(SETTING_DEFAULTS)

// مفاتيح داخلية حساسة — عمرها ما بترجع في قراءة الإعدادات للواجهة
// (كلمة سر الأدمن بتتغير من endpoint خاص بيها بس)
export const PRIVATE_SETTING_KEYS = new Set([
  'adminPasswordHash',
  'adminPasswordChangedAt',
  'bootstrapV2',
])

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany()
  const out = { ...SETTING_DEFAULTS }
  for (const r of rows) {
    if (PRIVATE_SETTING_KEYS.has(r.key)) continue
    out[r.key] = r.value
  }
  return out
}

export async function getPrivateSetting(key: string): Promise<string> {
  if (!PRIVATE_SETTING_KEYS.has(key)) return ''
  const row = await db.setting.findUnique({ where: { key } })
  return row?.value ?? ''
}

export async function setSettingPrivate(key: string, value: string) {
  if (!PRIVATE_SETTING_KEYS.has(key)) return
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

export async function setSettings(entries: Record<string, string>) {
  const list = Object.entries(entries)
    .filter(([k]) => EDITABLE_SETTING_KEYS.includes(k))
    .map(([k, v]) =>
      db.setting.upsert({
        where: { key: k },
        update: { value: String(v).slice(0, 500) },
        create: { key: k, value: String(v).slice(0, 500) },
      })
    )
  await Promise.all(list)
}
