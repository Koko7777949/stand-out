import { ok } from '@/lib/api-helpers'
import { revokeSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session'

export async function POST(req: Request) {
  await revokeSession(req)
  const res = ok({ message: 'خرجت من حسابك.' })
  ;(res.cookies as unknown as { set: (o: unknown) => void }).set({
    name: SESSION_COOKIE,
    value: '',
    ...sessionCookieOptions(0),
  })
  return res
}
