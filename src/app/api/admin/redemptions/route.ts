import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'

// طلبات استبدال الجوائز — قائمة الانتظار
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const redemptions = await db.redemption.findMany({
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
      reward: { select: { id: true, name: true, pointsCost: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return ok({
    redemptions: redemptions.map((r) => ({
      id: r.id,
      status: r.status,
      pointsSpent: r.pointsSpent,
      createdAt: r.createdAt.toISOString(),
      fulfilledAt: r.fulfilledAt?.toISOString() || null,
      user: r.user,
      reward: r.reward,
    })),
  })
}
