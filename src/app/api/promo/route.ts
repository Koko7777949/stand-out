import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { limit, getClientIp } from '@/lib/rate-limit'
import { ensureBootstrap } from '@/lib/bootstrap'

// التحقق من كود السفير — المستخدم بيكتبه في طلب المراجعة وقت الدفع
// الكود بيتقري بحروف كبيرة ومش بنكشف غير اسم السفير (من غير أي بيانات حساسة)
export async function POST(req: Request) {
  await ensureBootstrap()
  const body = await readJson<{ code?: string }>(req)
  const code = (body?.code || '').trim().toUpperCase().slice(0, 24)
  if (!code) return fail('اكتب كود السفير الأول.')

  const gate = limit(`promo:${getClientIp(req)}`, 20, 10 * 60 * 1000)
  if (!gate.ok) return fail('محاولات كتير على الكودات. استنى شوية.', 429, { retryAfterSec: gate.retryAfterSec })

  const amb = await db.ambassador.findUnique({ where: { code } })
  if (!amb || !amb.active) return fail('كود السفير غير صحيح أو غير مفعّل.', 404)

  return ok({ ok: true, code: amb.code, name: amb.name })
}
