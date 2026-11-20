import { db } from '@/lib/db'
import { sha256, randomToken, hashIp } from '@/lib/security'
import { getClientIp } from '@/lib/rate-limit'

export const SESSION_COOKIE = 'sou_session'
const SESSION_DAYS = 30

export async function createSession(userId: string, req: Request) {
  const token = randomToken(32)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt,
      ipHash: hashIp(getClientIp(req)),
      deviceInfo: (req.headers.get('user-agent') || '').slice(0, 180),
    },
  })
  return { token, expiresAt }
}

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: false, // البيئة الحالية بتشتغل خلف بروكسي — في الإنتاج بتتقلب true مع HTTPS
    path: '/',
    maxAge: maxAgeSec,
  }
}

export function readSessionToken(req: Request): string | null {
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
  return m ? decodeURIComponent(m[1]) : null
}

export async function getSessionUser(req: Request) {
  const token = readSessionToken(req)
  if (!token) return null
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  })
  if (!session) return null
  if (session.revokedAt || session.expiresAt < new Date()) return null
  if (session.user.status !== 'active') return null
  return session.user
}

export async function revokeSession(req: Request) {
  const token = readSessionToken(req)
  if (!token) return
  await db.session.updateMany({
    where: { tokenHash: sha256(token), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}
