import { db } from '@/lib/db'

// إعدادات النظام — بتتخزن في قاعدة البيانات وبتتدار من لوحة تحكم الأدمن
// أكواد الموبايل بتبعت واتساب عبر UltraMsg — بياناته من متغيرات البيئة (ULTRAMSG_INSTANCE / ULTRAMSG_TOKEN) ومش من اللوحة
// الإيميل: Resend (أو بوابة مخصصة POST JSON)
export const SETTING_DEFAULTS: Record<string, string> = {
  siteName: 'Stand Out',
  tagline: 'قمة Stand Out السنوية — مكانك بين الأوائل',
  supportEmail: '',
  supportPhone: '',

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

// مفاتيح مزودات قديمة — اتشالت من اللوحة نهائيًا (واتساب/SMS بقوا من البيئة فقط)
// أي قيم قديمة متخزنة في قاعدة البيانات بتتجاهل ومش بترجع في أي قراءة
export const LEGACY_PROVIDER_KEYS = new Set([
  'whatsappProvider', 'ultramsgInstance', 'ultramsgToken',
  'metaWhatsappToken', 'metaPhoneNumberId', 'metaWhatsappTemplateName', 'metaWhatsappTemplateLang',
  'greenApiInstance', 'greenApiToken',
  'twilioAccountSid', 'twilioAuthToken', 'twilioWhatsappFrom',
  'whatsappGatewayUrl', 'whatsappGatewayKey',
  'smsProvider', 'smsMisrUsername', 'smsMisrPassword', 'smsMisrToken', 'smsMisrSender', 'smsMisrEnvironment',
  'smsGatewayUrl', 'smsGatewayKey', 'smsSenderName',
])

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
    if (LEGACY_PROVIDER_KEYS.has(r.key)) continue // مزودات واتساب/SMS بقوا من البيئة فقط
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
