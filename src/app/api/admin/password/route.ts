import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireSuper } from '@/lib/guards'
import { hashPassword, verifyPassword } from '@/lib/security'
import { audit } from '@/lib/payments'
import { limit, getClientIp } from '@/lib/rate-limit'
import { setSettingPrivate, getPrivateSetting } from '@/lib/settings'

// تغيير كلمة سر الأدمن — للمسؤول الأعلى بس، ولازم كلمة السر الحالية
// الكلمة بتتخزن scrypt + salt عشوائي — ومش بترجع للواجهة أبداً
export async function POST(req: Request) {
  const superAdmin = await requireSuper(req)
  if (!superAdmin) return fail('تغيير كلمة السر للمسؤول الأعلى بس.', 403)

  const gate = limit(`admpasschange:${getClientIp(req)}`, 5, 10 * 60 * 1000)
  if (!gate.ok) return fail('محاولات كتير. استنى دقيقة وجرّب تاني.', 429)

  const body = await readJson<{ currentPassword?: string; newPassword?: string }>(req)
  const current = (body?.currentPassword || '').trim()
  const next = (body?.newPassword || '').trim()
  if (!current || !next) return fail('اكتب كلمة السر الحالية والجديدة.')
  if (next.length < 8) return fail('كلمة السر الجديدة لازم 8 خانات على الأقل.')
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) {
    return fail('خلّي كلمة السر فيها حروف وأرقام — أأمن بكتير.')
  }

  const storedHash = await getPrivateSetting('adminPasswordHash')
  if (storedHash && !verifyPassword(current, storedHash)) {
    return fail('كلمة السر الحالية غلط.')
  }

  await setSettingPrivate('adminPasswordHash', hashPassword(next))
  await setSettingPrivate('adminPasswordChangedAt', new Date().toISOString())
  await audit(superAdmin.id, 'admin_password_changed', 'setting', null, `by ${superAdmin.name || superAdmin.phone || superAdmin.id}`)
  return ok({ changed: true })
}
