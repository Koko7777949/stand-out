import { db } from '@/lib/db'
import { ok } from '@/lib/api-helpers'
import { pointsBalance } from '@/lib/points'

// جدول الاستبدال + رصيدك
export async function GET(req: Request) {
  const rewards = await db.reward.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, description: true, pointsCost: true, stock: true, icon: true },
  })

  let balance = 0
  const user = await (async () => {
    try { return await (await import('@/lib/session')).getSessionUser(req) } catch { return null }
  })()
  if (user) {
    balance = await pointsBalance(user.id)
    const redemptions = await db.redemption.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    return ok({
      rewards,
      balance,
      redemptions: redemptions.map((r) => ({
        id: r.id,
        rewardId: r.rewardId,
        pointsSpent: r.pointsSpent,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  }
  return ok({ rewards, balance: 0, redemptions: [] })
}
