import { db } from '@/lib/db'
import { ok } from '@/lib/api-helpers'
import { hashIp, hashDevice } from '@/lib/security'
import { limit, getClientIp } from '@/lib/rate-limit'

// تسجيل نقرات روابط الدعوة — للإحصائيات بس، مفيش أي بيانات شخصية
export async function POST(req: Request) {
  const gate = limit(`click:${getClientIp(req)}`, 30, 60 * 1000)
  if (!gate.ok) return ok()
  const body = await (async () => {
    try { return (await req.json()) as { code: string } } catch { return null }
  })()
  if (!body?.code || typeof body.code !== 'string' || body.code.length > 16) return ok()
  await db.referralClick.create({
    data: {
      code: body.code.toUpperCase().slice(0, 16),
      ipHash: hashIp(getClientIp(req)),
      uaHash: hashDevice(req.headers.get('user-agent')),
    },
  })
  return ok()
}
