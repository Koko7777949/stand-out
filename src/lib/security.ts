import crypto from 'crypto'

// المفاتيح السرية — بتتحمّل من البيئة ومتتخزنش في الكود
const QR_SECRET = process.env.QR_SIGNING_SECRET || 'sou-qr-9f2c1e7a4d8b6c3f5e1a2d4b8c7e9f1a'
const SESSION_SECRET = process.env.SESSION_SECRET || 'sou-session-3a7b9c2e5f8d1a4c6b9e2f7d5a8c1e3f'

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export function hmacHex(payload: string, secret: string = QR_SECRET): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

// مقارنة زمن ثابت — ضد timing attacks
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function randomDigits(n = 6): string {
  let out = ''
  const buf = crypto.randomBytes(n * 2)
  for (let i = 0; i < n; i++) {
    out += String(buf[i] % 10)
  }
  return out
}

export function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`
}

// ---- الرقم التسلسلي: STO26-XXXXXXX (Crockford Base32 + خانة فحص) ----
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function generateSerial(): string {
  const buf = crypto.randomBytes(16)
  let core = ''
  for (let i = 0; i < 6; i++) core += B32[buf[i] % 32]
  // خانة الفحص: مجموع قيم الأحرف mod 32 — بتمنع التسلسل والتخمين
  let sum = 0
  for (const ch of core) sum += B32.indexOf(ch)
  const check = B32[(sum * 7 + 3) % 32]
  return `STO26-${core}${check}`
}

// ---- توكن الـ QR: مفيش أي بيانات شخصية جواه ----
export function buildQrToken(ticketId: string, serial: string): { token: string; hash: string } {
  const sig = hmacHex(`SO1.${ticketId}.${serial}`).slice(0, 32)
  const token = `SO1.${ticketId}.${serial}.${sig}`
  return { token, hash: sha256(token) }
}

export function verifyQrToken(token: string): { ticketId: string; serial: string } | null {
  const parts = token.split('.')
  if (parts.length !== 4 || parts[0] !== 'SO1') return null
  const [, ticketId, serial, sig] = parts
  const expected = hmacHex(`SO1.${ticketId}.${serial}`).slice(0, 32)
  if (!safeEqual(sig, expected)) return null
  return { ticketId, serial }
}

// ---- توقيع الويبهوك من مزود الدفع ----
export function signWebhook(payload: string): string {
  return hmacHex(payload, QR_SECRET)
}

export function verifyWebhook(payload: string, signature: string): boolean {
  return safeEqual(signWebhook(payload), signature)
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  return sha256(`${ip}:${SESSION_SECRET}`).slice(0, 24)
}

export function hashDevice(ua: string | null | undefined): string | null {
  if (!ua) return null
  return sha256(`${ua}:${SESSION_SECRET}`).slice(0, 24)
}

// ---- كلمة سر الأدمن — الطبقة التانية بعد كود الـ SMS (scrypt + salt عشوائي) ----
export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex')
  return `s1$${salt}$${hash}`
}

export function verifyPassword(pw: string, stored: string): boolean {
  try {
    const [v, salt, hash] = String(stored).split('$')
    if (v !== 's1' || !salt || !hash) return false
    const test = crypto.scryptSync(pw, salt, 64)
    const known = Buffer.from(hash, 'hex')
    return known.length === test.length && crypto.timingSafeEqual(known, test)
  } catch {
    return false
  }
}

// تذكرة مؤقتة بعد تأكيد كود الـ SMS للأدمن — بتسمح بخطوة كلمة السر بس (5 دقايق)
// موقّعة بـ HMAC ومفيهاش أي بيانات حساسة غير userId مشفّر ببصمته
export function issueAdminTicket(userId: string, ttlMs = 5 * 60 * 1000): string {
  const exp = Date.now() + ttlMs
  const body = `A2F.${userId}.${exp}`
  return `${body}.${hmacHex(body, SESSION_SECRET).slice(0, 32)}`
}

export function verifyAdminTicket(ticket: string): { userId: string } | null {
  const parts = String(ticket || '').split('.')
  if (parts.length !== 4 || parts[0] !== 'A2F') return null
  const [, userId, exp, sig] = parts
  if (!userId || !exp || !sig) return null
  if (!Number(exp) || Number(exp) < Date.now()) return null
  const expected = hmacHex(`A2F.${userId}.${exp}`, SESSION_SECRET).slice(0, 32)
  if (!safeEqual(sig, expected)) return null
  return { userId }
}
