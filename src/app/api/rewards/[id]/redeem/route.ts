import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'
import { pointsBalance } from '@/lib/points'
import { audit } from '@/lib/payments'
import { limit } from '@/lib/rate-limit'

// استبدال النقاط — Transaction واحدة: فحص الرصيد، خصم المخزون، تسجيل الحركة
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return fail('سجل دخول الأول.', 401)

  const gate = limit(`redeem:${user.id}`, 5, 60 * 1000)
  if (!gate.ok) return fail('محاولات كتير. استنى دقيقة.', 429)

  const { id } = await params
  const reward = await db.reward.findUnique({ where: { id } })
  if (!reward || !reward.active) return fail('الجائزة دي مش متاحة حالياً.', 404)

  try {
    const result = await db.$transaction(async (tx) => {
      const fresh = await tx.reward.findUnique({ where: { id } })
      if (!fresh || !fresh.active || fresh.stock <= 0) return { ok: false as const, error: 'المخزون خلص من الجائزة دي.' }

      const agg = await tx.pointsLedger.aggregate({ where: { userId: user.id }, _sum: { delta: true } })
      const balance = agg._sum.delta || 0
      if (balance < fresh.pointsCost) return { ok: false as const, error: 'رصيدك مش كفاية للجائزة دي.' }

      await tx.reward.update({ where: { id }, data: { stock: { decrement: 1 } } })
      await tx.pointsLedger.create({
        data: {
          userId: user.id,
          delta: -fresh.pointsCost,
          reason: 'REDEEM',
          refType: 'REWARD',
          refId: fresh.id,
          note: `استبدال: ${fresh.name}`,
        },
      })
      const redemption = await tx.redemption.create({
        data: { userId: user.id, rewardId: fresh.id, pointsSpent: fresh.pointsCost, status: 'PENDING' },
      })
      return { ok: true as const, redemption: { id: redemption.id, name: fresh.name, pointsSpent: fresh.pointsCost } }
    })

    if (!result.ok) return fail(result.error, 409)
    await audit(user.id, 'reward_redeemed', 'redemption', result.redemption.id, result.redemption.name)
    const balance = await pointsBalance(user.id)
    return ok({ redemption: result.redemption, balance })
  } catch {
    return fail('حصل مشكلة في الاستبدال. جرّب تاني.')
  }
}
