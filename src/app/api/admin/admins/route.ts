import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireSuper } from '@/lib/guards'
import { audit } from '@/lib/payments'
import { uniqueReferralCode } from '@/lib/referrals'
import { normalizePhone } from '@/lib/otp'

// إدارة المسؤولين — للمسؤول الأعلى بس
export async function GET(req: Request) {
  const superAdmin = await requireSuper(req)
  if (!superAdmin) return fail('الصفحة دي للمسؤول الأعلى بس.', 403)

  const admins = await db.user.findMany({
    where: { role: { in: ['admin', 'super_admin', 'staff'] } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, name: true, phone: true, email: true, role: true, status: true,
      createdAt: true, lastLoginAt: true,
      _count: { select: { sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } } } },
    },
  })
  return ok({
    admins: admins.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      lastLoginAt: a.lastLoginAt?.toISOString() || null,
      activeSessions: a._count.sessions,
    })),
  })
}

// إضافة مسؤول جديد — بالاسم ورقم موبايل متحقق منه أو إيميل
export async function POST(req: Request) {
  const superAdmin = await requireSuper(req)
  if (!superAdmin) return fail('الصفحة دي للمسؤول الأعلى بس.', 403)

  const body = await readJson<{ name?: string; phone?: string; email?: string; role?: string }>(req)
  const name = (body?.name || '').trim().slice(0, 60)
  if (name.length < 2) return fail('اكتب اسم المسؤول.')
  const role = ['admin', 'staff'].includes(body?.role || '') ? body!.role : 'admin'

  const phone = body?.phone ? normalizePhone(body.phone) : null
  const email = body?.email?.trim().toLowerCase() || null
  if (!phone && !email) return fail('لازم رقم موبايل أو إيميل للمسؤول.')

  if (phone) {
    const taken = await db.user.findUnique({ where: { phone } })
    if (taken) return fail('الرقم ده مسجل بالفعل — عدّل صلاحياته من قايمة المستخدمين.')
  }
  if (email) {
    const taken = await db.user.findUnique({ where: { email } })
    if (taken) return fail('الإيميل ده مسجل بالفعل — عدّل صلاحياته من قايمة المستخدمين.')
  }

  const referralCode = await uniqueReferralCode()
  const admin = await db.user.create({
    data: {
      name,
      phone: phone || undefined,
      email: email || undefined,
      phoneVerifiedAt: phone ? new Date() : null,
      emailVerifiedAt: email ? new Date() : null,
      role,
      provider: phone ? 'phone' : 'email',
      referralCode,
      consentAt: new Date(),
    },
  })
  await audit(superAdmin.id, 'admin_added', 'user', admin.id, `${name} as ${role}`)
  return ok({ admin: { id: admin.id } })
}
