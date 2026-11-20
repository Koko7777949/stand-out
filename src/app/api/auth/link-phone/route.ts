import { db } from '@/lib/db'
import { requestOtp, verifyOtp, normalizePhone } from '@/lib/otp'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'

// ربط رقم موبايل متحقق منه لحساب اتسجل بحساب Google — شرط قبل الحجز
export async function POST(req: Request) {
  const user = await getSessionUser(req)
  if (!user) return fail('لازم تسجل دخول الأول.', 401)

  const body = await readJson<{ phone: string; code: string; mode: 'request' | 'verify' }>(req)
  if (!body?.phone) return fail('اكتب رقم الموبايل.')

  const phone = normalizePhone(body.phone)
  if (!phone) return fail('الرقم مش رقم موبايل مصري صحيح.')

  const taken = await db.user.findUnique({ where: { phone } })
  if (taken && taken.id !== user.id) return fail('الرقم ده مربوط بحساب تاني.')

  if (body.mode === 'request') {
    const r = await requestOtp(phone, 'whatsapp', req)
    if (!r.ok) return fail(r.error, 429)
    return ok({ phone, devCode: r.devCode, expiresInSec: r.expiresInSec })
  }

  if (!body.code) return fail('اكتب الكود.')
  const v = await verifyOtp(phone, 'whatsapp', body.code.trim())
  if (!v.ok) return fail(v.error)

  await db.user.update({
    where: { id: user.id },
    data: { phone, phoneVerifiedAt: new Date() },
  })
  return ok({ phone })
}
