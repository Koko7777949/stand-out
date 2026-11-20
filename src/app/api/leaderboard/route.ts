import { db } from '@/lib/db'
import { ok } from '@/lib/api-helpers'

// كاش 45 ثانية — الليدربورد مش لازم يضغط على الداتابيز تحت الضغط
let cache: { at: number; data: unknown } | null = null
const TTL = 45_000

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return ok(cache.data as Record<string, unknown>)
  }

  const rows = await db.referral.groupBy({
    by: ['referrerId'],
    where: { status: 'QUALIFIED' },
    _count: { _all: true },
    orderBy: { _count: { referrerId: 'desc' } },
    take: 10,
  })

  const users = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.referrerId), }, hideName: false },
    select: { id: true, name: true },
  })

  const leaderboard = rows
    .map((r) => {
      const u = users.find((x) => x.id === r.referrerId)
      if (!u) return null
      return { firstName: (u.name || 'صديق').split(' ')[0].slice(0, 12), qualified: r._count._all }
    })
    .filter(Boolean)

  const data = { leaderboard }
  cache = { at: Date.now(), data }
  return ok(data)
}
