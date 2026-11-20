import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'
import { audit } from '@/lib/payments'

// تحديث حالة طلب الاستبدال — تسليم، أو إلغاء بيرد النقاط بالكامل
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const { id } = await params
  const body = await readJson<{ action?: string }>(req)
  if (!body?.action) return fail('حدد الإجراء: تسليم أو إلغاء.')

  const redemption = await db.redemption.findUnique({ where: { id } })
  if (!redemption) return fail('مفيش طلب بالبيانات دي.', 404)
  if (redemption.status !== 'PENDING') return fail('الطلب اتقفل من قبل.')

  if (body.action === 'fulfill') {
    await db.redemption.update({
      where: { id },
      data: { status: 'FULFILLED', fulfilledAt: new Date() },
    })
    await db.reward.update({
      where: { id: redemption.rewardId },
      data: { stock: { decrement: 1 } },
    })
    await audit(admin.id, 'redemption_fulfilled', 'redemption', id, `user=${redemption.userId}`)
    return ok({ status: 'FULFILLED' })
  }

  if (body.action === 'cancel') {
    await db.$transaction(async (tx) => {
      await tx.redemption.update({ where: { id }, data: { status: 'CANCELLED' } })
      await tx.pointsLedger.create({
        data: {
          userId: redemption.userId,
          delta: redemption.pointsSpent,
          reason: 'REVERSAL',
          refType: 'REDEMPTION',
          refId: id,
          note: 'استرجاع نقاط — إلغاء طلب استبدال',
        },
      })
    })
    await audit(admin.id, 'redemption_cancelled', 'redemption', id, `refund=${redemption.pointsSpent}`)
    return ok({ status: 'CANCELLED' })
  }

  return fail('إجراء غير معروف.')
}
