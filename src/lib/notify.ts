import { getSettings } from '@/lib/settings'

// ---- مزودات الرسائل الحقيقية ----
// WhatsApp (الأساسي لأكواد الموبايل — حسب طلب صاحب الموقع):
//   ultramsg : POST https://api.ultramsg.com/{instance}/messages/chat — JSON { token, to, body }
//              to بصيغة دولية: 201200506224 — الرد الناجح: { sent: "true", id: "..." }
//   meta     : WhatsApp Cloud API الرسمي — POST https://graph.facebook.com/v21.0/{phoneId}/messages
//              Bearer token — نص حر جوه نافذة 24 ساعة، أو Template معتمد بمتغير {{1}} للكود
//   greenapi : POST https://api.green-api.com/waInstance{id}/sendMessage/{token} — { chatId: "2012...@c.us", message }
//   twilio   : POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json — Basic auth
//              From/To بصيغة whatsapp:+20... — الرد 201/200 عند النجاح
//   custom   : بوابة مخصصة POST JSON { to, message, sender } + Bearer اختياري
// SMS (احتياطي لو واتساب مش مربوط):
//   SMSMisr  : POST https://smsmisr.com/api/SMS — form-urlencoded
//              { environment, username, password, token, Phone, Message, sender, language }
//              الرد الناجح: { "code": "1901" }
// Email: Resend (خطة مجانية 100 رسالة/يوم و 3000/شهر)
//   POST https://api.resend.com/emails — Bearer RESEND_API_KEY
//   { "from": "Stand Out <onboarding@resend.dev>", "to": ["..."], "subject", "text", "html" }
// وكل ده ممكن يتظبط من لوحة تحكم الأدمن أو من متغيرات البيئة.

const SMSMISR_ENDPOINT = 'https://smsmisr.com/api/SMS'
const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const ARABIC_RE = /[\u0600-\u06FF]/

// 01200506224 → 201200506224 (الصيغة الدولية اللي المزودات بيقبلوها)
function toInternationalPhone(egyptianLocal: string): string {
  const digits = egyptianLocal.replace(/\D/g, '')
  return digits.startsWith('20') ? digits : '20' + digits.replace(/^0/, '')
}

function timeout(ms: number): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(ms)
  } catch {
    return undefined
  }
}

function brandedEmailHtml(subject: string, code: string): string {
  return `<div style="margin:0;padding:32px 16px;background:#f4efe6;font-family:Arial,Tahoma,sans-serif;direction:rtl;text-align:center">
  <div style="max-width:440px;margin:0 auto;background:#fffbf2;border:3px solid #211434;border-radius:20px;box-shadow:6px 6px 0 0 #211434;overflow:hidden">
    <div style="background:#211434;padding:18px">
      <span style="display:inline-block;background:#c6da91;color:#211434;font-weight:900;font-size:15px;letter-spacing:1px;padding:6px 14px;border-radius:10px">STAND OUT</span>
    </div>
    <div style="padding:28px 24px">
      <h2 style="margin:0 0 10px;color:#211434;font-size:19px">${subject}</h2>
      <p style="margin:0 0 18px;color:#6d5f80;font-size:13px">الكود بتاعك:</p>
      <div style="display:inline-block;background:#e5d1ff;border:3px solid #211434;border-radius:14px;padding:14px 28px;font-size:34px;font-weight:900;letter-spacing:10px;color:#211434;direction:ltr">${code}</div>
      <p style="margin:18px 0 0;color:#6d5f80;font-size:12px">الكود صالح لمدة 5 دقايق — لو مش انت اللي طلبته، تجاهل الرسالة وخليك آمن.</p>
    </div>
  </div>
</div>`
}

// ===================== WhatsApp =====================

// UltraMsg — أسهل وأرخص مزود واتساب لمصر: instance + token من لوحة الحساب
// الطلب مطابق للمثال الرسمي بالحرف — كل الحقول موجودة حتى الفاضية منها:
// { token, to, body, priority, referenceId, msgId, mentions }
async function sendViaUltraMsg(to: string, message: string): Promise<boolean> {
  const s = await getSettings()
  const instance = (s.ultramsgInstance || process.env.ULTRAMSG_INSTANCE || '').trim()
  const token = (s.ultramsgToken || process.env.ULTRAMSG_TOKEN || '').trim()
  if (!instance || !token) return false
  try {
    const res = await fetch(`https://api.ultramsg.com/${encodeURIComponent(instance)}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        to: toInternationalPhone(to),
        body: message,
        priority: 10,
        referenceId: '',
        msgId: '',
        mentions: '',
      }),
      signal: timeout(12000),
    })
    if (!res.ok) {
      console.error(`[ultramsg] HTTP ${res.status}`)
      return false
    }
    const data = (await res.json().catch(() => null)) as {
      sent?: boolean | string; success?: boolean | string; id?: string; MessageID?: string; error?: string | null
    } | null
    // UltraMsg ممكن يرد HTTP 200 مع {"success":"false","error":"..."} — نفحص الرفض الصريح الأول
    const rejected =
      !data ||
      String(data.sent ?? '') === 'false' ||
      String(data.success ?? '') === 'false' ||
      (typeof data.error === 'string' && data.error.trim() !== '')
    if (rejected) {
      console.error('[ultramsg] rejected:', JSON.stringify(data))
      return false
    }
    return (
      data.sent === true ||
      String(data.sent) === 'true' ||
      data.success === true ||
      String(data.success) === 'true' ||
      !!data.id ||
      !!data.MessageID
    )
  } catch (err) {
    console.error('[ultramsg] request failed:', err)
    return false
  }
}

// Meta WhatsApp Cloud API — الرسمي. لو محدد اسم Template معتمد بنبعت Template بمتغير {{1}} = الكود،
// لو مش محدد بنبعت نص حر (بيشتغل لو المستخدم كلم الرقم قبل كده جوه 24 ساعة).
async function sendViaMetaWhatsapp(to: string, message: string, code?: string): Promise<boolean> {
  const s = await getSettings()
  const token = s.metaWhatsappToken || process.env.META_WHATSAPP_TOKEN || ''
  const phoneId = s.metaPhoneNumberId || process.env.META_PHONE_NUMBER_ID || ''
  if (!token || !phoneId) return false

  const intl = toInternationalPhone(to)
  const templateName = (s.metaWhatsappTemplateName || '').trim()
  let payload: unknown
  if (templateName && code) {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: intl,
      type: 'template',
      template: {
        name: templateName,
        language: { code: s.metaWhatsappTemplateLang || 'ar' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: code }] }],
      },
    }
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: intl,
      type: 'text',
      text: { preview_url: false, body: message },
    }
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: timeout(12000),
    })
    return res.ok
  } catch {
    return false
  }
}

// Green API — مزود واتساب تاني منتشر (instance + token)
async function sendViaGreenApi(to: string, message: string): Promise<boolean> {
  const s = await getSettings()
  const id = s.greenApiInstance || process.env.GREEN_API_INSTANCE || ''
  const token = s.greenApiToken || process.env.GREEN_API_TOKEN || ''
  if (!id || !token) return false
  try {
    const res = await fetch(`https://api.green-api.com/waInstance${encodeURIComponent(id)}/sendMessage/${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${toInternationalPhone(to)}@c.us`, message }),
      signal: timeout(12000),
    })
    if (!res.ok) return false
    const data = (await res.json().catch(() => null)) as { idMessage?: string } | null
    return !!data?.idMessage
  } catch {
    return false
  }
}

// Twilio WhatsApp — From/To لازم يبدأوا بـ whatsapp:
async function sendViaTwilioWhatsapp(to: string, message: string): Promise<boolean> {
  const s = await getSettings()
  const sid = s.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || ''
  const authToken = s.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN || ''
  const from = s.twilioWhatsappFrom || process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'
  if (!sid || !authToken) return false
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
        To: `whatsapp:+${toInternationalPhone(to)}`,
        Body: message,
      }).toString(),
      signal: timeout(12000),
    })
    return res.ok
  } catch {
    return false
  }
}

// بوابة واتساب مخصصة (أي مزود بيقبل POST JSON: to / message / sender)
async function sendViaCustomWhatsapp(to: string, message: string): Promise<boolean> {
  const s = await getSettings()
  if (!s.whatsappGatewayUrl) return false
  try {
    const res = await fetch(s.whatsappGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(s.whatsappGatewayKey ? { Authorization: `Bearer ${s.whatsappGatewayKey}` } : {}),
      },
      body: JSON.stringify({
        to: toInternationalPhone(to),
        message,
        text: message,
        body: message,
        sender: s.smsSenderName || 'StandOut',
      }),
      signal: timeout(10000),
    })
    return res.ok
  } catch {
    return false
  }
}

// هل واتساب مربوط ومظبوط؟ (بيتستخدم في منطق الاحتياطي وفي لوحة الأدمن)
export async function whatsappConfigured(): Promise<boolean> {
  const s = await getSettings()
  const p = s.whatsappProvider || 'ultramsg'
  if (p === 'ultramsg') {
    return !!(s.ultramsgInstance && s.ultramsgToken) ||
      !!(process.env.ULTRAMSG_INSTANCE && process.env.ULTRAMSG_TOKEN)
  }
  if (p === 'meta') {
    return !!(s.metaWhatsappToken && s.metaPhoneNumberId) ||
      !!(process.env.META_WHATSAPP_TOKEN && process.env.META_PHONE_NUMBER_ID)
  }
  if (p === 'greenapi') {
    return !!(s.greenApiInstance && s.greenApiToken) ||
      !!(process.env.GREEN_API_INSTANCE && process.env.GREEN_API_TOKEN)
  }
  if (p === 'twilio') {
    return !!(s.twilioAccountSid && s.twilioAuthToken) ||
      !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  }
  if (p === 'custom') return !!s.whatsappGatewayUrl
  return false
}

// إرسال واتساب — بيفحص المزود المختار من الإعدادات، و code بيتبعت للمزودات اللي شغالة بـ Template
export async function sendWhatsApp(to: string, message: string, code?: string): Promise<boolean> {
  const s = await getSettings()
  const p = s.whatsappProvider || 'ultramsg'
  switch (p) {
    case 'meta': return sendViaMetaWhatsapp(to, message, code)
    case 'greenapi': return sendViaGreenApi(to, message)
    case 'twilio': return sendViaTwilioWhatsapp(to, message)
    case 'custom': return sendViaCustomWhatsapp(to, message)
    default: return sendViaUltraMsg(to, message)
  }
}

// ===================== SMS (احتياطي) =====================

// SMSMisr بيرد JSON { code: "1901" } عند النجاح — أي كود تاني يعتبر فشل بسببه
async function sendViaSmsMisr(to: string, message: string): Promise<boolean> {
  const s = await getSettings()
  const username = s.smsMisrUsername || process.env.SMSMISR_USERNAME || ''
  const password = s.smsMisrPassword || process.env.SMSMISR_PASSWORD || ''
  const token = s.smsMisrToken || process.env.SMSMISR_TOKEN || ''
  if (!username || !password || !token) return false

  const payload: Record<string, string> = {
    environment: s.smsMisrEnvironment === '1' ? '1' : '2', // 1 تجريبية / 2 إنتاج
    username,
    password,
    token,
    Phone: toInternationalPhone(to),
    Message: message,
    sender: s.smsMisrSender || s.smsSenderName || 'StandOut',
    language: ARABIC_RE.test(message) ? '2' : '1', // 2 = عربي (Unicode)
  }

  try {
    const res = await fetch(SMSMISR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload).toString(),
      signal: timeout(10000),
    })
    if (!res.ok) return false
    const data = (await res.json().catch(() => null)) as { code?: string | number } | null
    return String(data?.code ?? '') === '1901'
  } catch {
    return false
  }
}

// بوابة مخصصة (Victory Links أو أي مزود بيقبل POST JSON: to / message / sender)
async function sendViaCustomSms(to: string, message: string): Promise<boolean> {
  const s = await getSettings()
  if (!s.smsGatewayUrl) return false
  try {
    const res = await fetch(s.smsGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(s.smsGatewayKey ? { Authorization: `Bearer ${s.smsGatewayKey}` } : {}),
      },
      body: JSON.stringify({ to, message, text: message, sender: s.smsSenderName || 'StandOut' }),
      signal: timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function sendSms(to: string, message: string): Promise<boolean> {
  const s = await getSettings()
  const provider = s.smsProvider === 'custom' ? 'custom' : 'smsmisr'
  return provider === 'custom'
    ? sendViaCustomSms(to, message)
    : sendViaSmsMisr(to, message)
}

// ===================== Email (Resend) =====================

// Resend بيرد 200 مع { id } عند النجاح
async function sendViaResend(to: string, subject: string, code: string): Promise<boolean> {
  const s = await getSettings()
  const apiKey = s.resendApiKey || process.env.RESEND_API_KEY || ''
  if (!apiKey) return false

  const address = s.emailFromAddress || process.env.RESEND_FROM || 'onboarding@resend.dev'
  const from =
    process.env.EMAIL_FROM ||
    `${s.emailFromName || 'Stand Out'} <${address}>`

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: `${subject} — كود التحقق: ${code} (صالح 5 دقايق)`,
        html: brandedEmailHtml(subject, code),
      }),
      signal: timeout(10000),
    })
    return res.ok
  } catch {
    return false
  }
}

// بوابة إيميل مخصصة (POST JSON: to / subject / html)
async function sendViaCustomEmail(to: string, subject: string, code: string): Promise<boolean> {
  const s = await getSettings()
  if (!s.emailGatewayUrl) return false
  const html = brandedEmailHtml(subject, code)
  try {
    const res = await fetch(s.emailGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(s.emailGatewayKey ? { Authorization: `Bearer ${s.emailGatewayKey}` } : {}),
      },
      body: JSON.stringify({
        to,
        from: `${s.emailFromName || 'Stand Out'} <${s.emailFromAddress || 'no-reply@standout.app'}>`,
        subject,
        text: `${subject} — كود التحقق: ${code}`,
        html,
      }),
      signal: timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const s = await getSettings()
  const provider = s.emailProvider === 'custom' ? 'custom' : 'resend'
  return provider === 'custom'
    ? sendViaCustomEmail(to, subject, body)
    : sendViaResend(to, subject, body)
}
