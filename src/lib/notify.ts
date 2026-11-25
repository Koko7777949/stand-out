import { getSettings } from '@/lib/settings'

// ---- مزودات الرسائل ----
// الموبايل: كود التحقق بيوصل على واتساب الرقم اللي عايزين نتحقق منه (بدون SMS نهائيًا)
//   UltraMsg : POST https://api.ultramsg.com/{instance}/messages/chat — JSON { token, to, body, priority, referenceId, msgId, mentions }
//              to بصيغة دولية: 01200506224 ← 201200506224 — الرد الناجح: { sent: "true", id: "..." }
//              البيانات من متغيرات البيئة: ULTRAMSG_INSTANCE + ULTRAMSG_TOKEN (سيرفر فقط)
// الإيميل: Resend (خطة مجانية 100 رسالة/يوم)
//   POST https://api.resend.com/emails — Bearer RESEND_API_KEY
//   { "from": "Stand Out <onboarding@resend.dev>", "to": ["..."], "subject", "text", "html" }

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const ARABIC_RE = /[\u0600-\u06FF]/

// 01200506224 → 201200506224 (الصيغة الدولية اللي المزود بيقبلها)
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

// ===================== WhatsApp (UltraMsg) =====================

// UltraMsg — مزود واتساب المعتمد للموقع: instance + token من متغيرات البيئة
// الطلب مطابق للمثال الرسمي بالحرف — كل الحقول موجودة حتى الفاضية منها:
// { token, to, body, priority, referenceId, msgId, mentions }
async function sendViaUltraMsg(to: string, message: string): Promise<boolean> {
  const instance = (process.env.ULTRAMSG_INSTANCE || '').trim()
  const token = (process.env.ULTRAMSG_TOKEN || '').trim()
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

// هل واتساب مربوط؟ (بيتستخدم في منطق كود التطوير وفي فحص التجربة)
export async function whatsappConfigured(): Promise<boolean> {
  return !!(process.env.ULTRAMSG_INSTANCE && process.env.ULTRAMSG_TOKEN)
}

// إرسال واتساب — القناة الوحيدة لأكواد الموبايل (بدون SMS)
export async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  return sendViaUltraMsg(to, message)
}

// ===================== Email (Resend) =====================

// Resend بيرد 200 مع { id } عند النجاح
async function sendViaResend(to: string, subject: string, code: string): Promise<boolean> {
  const s = await getSettings()
  const apiKey = process.env.RESEND_API_KEY || s.resendApiKey || ''
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
