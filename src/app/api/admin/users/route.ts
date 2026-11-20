import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'
import { pointsBalance } from '@/lib/points'

// بحث وعرض المستخدمين
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim().slice(0, 60)
  const take = Math.min(100, Number(url.searchParams.get('take')) || 60)

  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
        ],
      }
    : {}

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true, name: true, phone: true, email: true, role: true, status: true,
      provider: true, referralCode: true, createdAt: true, lastLoginAt: true,
      _count: { select: { tickets: true, referralsOut: true } },
    },
  })

  const balances = await Promise.all(users.map((u) => pointsBalance(u.id)))

  return ok({
    users: users.map((u, i) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      status: u.status,
      provider: u.provider,
      referralCode: u.referralCode,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      ticketsCount: u._count.tickets,
      referrals: u._count.referralsOut,
      points: balances[i],
    })),
  })
}
