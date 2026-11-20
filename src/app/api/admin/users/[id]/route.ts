import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'
import { audit } from '@/lib/payments'
import { pointsBalance } from '@/lib/points'

// إدارة مستخدم — إيقاف/تشغيل الحساب، وتعديل النقاط عبر دفتر النقاط (append-only)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const { id } = await params
  const body = await readJson<{ status?: string; pointsDelta?: number; note?: string }>(req)
  if (!body) return fail('بيانات ناقصة.')

  const user = await db.user.findUnique({ where: { id } })
  if (!user) return fail('مفيش مستخدم بالبيانات دي.', 404)

  if (body.status && ['active', 'blocked'].includes(body.status)) {
    if (user.id === admin.id) return fail('مش ممكن توقف حسابك بنفسك.')
    if (user.role === 'super_admin') return fail('مش ممكن توقف حساب المسؤول الأعلى.')
    await db.user.update({ where: { id }, data: { status: body.status } })
    // إيقاف الحساب بيلغي كل الجلسات فورًا
    if (body.status === 'blocked') {
      await db.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })
    }
    await audit(admin.id, body.status === 'blocked' ? 'user_blocked' : 'user_unblocked', 'user', id, user.phone || user.email || '')
  }

  if (typeof body.pointsDelta === 'number' && body.pointsDelta !== 0) {
    const delta = Math.max(-500, Math.min(500, Math.round(body.pointsDelta)))
    await db.pointsLedger.create({
      data: {
        userId: id,
        delta,
        reason: 'MANUAL',
        note: (body.note || `تعديل يدوي من ${admin.name || 'الأدمن'}`).slice(0, 120),
      },
    })
    await audit(admin.id, 'points_adjusted', 'user', id, `delta=${delta}`)
  }

  const balance = await pointsBalance(id)
  return ok({ balance })
}
