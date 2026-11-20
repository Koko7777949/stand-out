import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireSuper } from '@/lib/guards'
import { audit } from '@/lib/payments'

// تعديل صلاحية مسؤول — للمسؤول الأعلى بس
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const superAdmin = await requireSuper(req)
  if (!superAdmin) return fail('الصفحة دي للمسؤول الأعلى بس.', 403)

  const { id } = await params
  const body = await readJson<{ role?: string }>(req)
  const role = body?.role
  if (!role || !['admin', 'staff', 'attendee'].includes(role)) return fail('الصلاحية مش صحيحة.')

  const target = await db.user.findUnique({ where: { id } })
  if (!target) return fail('مفيش مستخدم بالبيانات دي.', 404)
  if (target.id === superAdmin.id) return fail('مش ممكن تغير صلاحيتك بنفسك.')
  if (target.role === 'super_admin') return fail('مش ممكن تعدل صلاحية مسؤول أعلى.')

  await db.user.update({ where: { id }, data: { role } })
  // أي تخفيض في الصلاحية بيلغي الجلسات عشان التغيير ينفذ فورًا
  if (role === 'attendee') {
    await db.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })
  }
  await audit(superAdmin.id, 'admin_role_changed', 'user', id, `${target.name || target.phone} → ${role}`)
  return ok()
}

// إزالة مسؤول نهائيًا — للمسؤول الأعلى بس
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const superAdmin = await requireSuper(req)
  if (!superAdmin) return fail('الصفحة دي للمسؤول الأعلى بس.', 403)

  const { id } = await params
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return fail('مفيش مستخدم بالبيانات دي.', 404)
  if (target.id === superAdmin.id) return fail('مش ممكن تحذف حسابك بنفسك.')
  if (target.role === 'super_admin') {
    const supers = await db.user.count({ where: { role: 'super_admin', status: 'active' } })
    if (supers <= 1) return fail('ده آخر مسؤول أعلى في النظام — ضيف واحد الأول.')
    return fail('مش ممكن تحذف حساب مسؤول أعلى — خفض صلاحيته بدل كده.')
  }

  // مش بنحذف الحساب لو عليه تذاكر — بنتحول لصلاحية attendee
  const tickets = await db.ticket.count({ where: { userId: id } })
  if (tickets > 0) {
    await db.user.update({ where: { id }, data: { role: 'attendee' } })
    await db.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })
    await audit(superAdmin.id, 'admin_demoted', 'user', id, 'has tickets → attendee')
    return ok({ demoted: true })
  }

  await db.user.delete({ where: { id } })
  await audit(superAdmin.id, 'admin_removed', 'user', id, target.name || target.phone || '')
  return ok()
}
