import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'
import { pointsBalance, qualifiedCount, nextTierInfo } from '@/lib/points'

// بوابة المشاركة — إحالاتك + نقاطك + اللي دعوتهم
export async function GET(req: Request) {
  const user = await getSessionUser(req)
  if (!user) return fail('سجل دخول الأول.', 401)

  const [balance, count, referrals, tiers, ledger] = await Promise.all([
    pointsBalance(user.id),
    qualifiedCount(user.id),
    db.referral.findMany({
      where: { referrerId: user.id },
      include: { referredUser: { select: { name: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.pointsTier.findMany({ where: { active: true }, orderBy: { minReferrals: 'asc' } }),
    db.pointsLedger.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ])

  const next = await nextTierInfo(count)

  return ok({
    referralCode: user.referralCode,
    points: { balance, qualified: count },
    nextTier: next ? { minReferrals: next.next.minReferrals, points: next.next.totalPoints, remaining: next.remaining } : null,
    tiers,
    referrals: referrals.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      firstName: (r.referredUser.name || 'صديق').split(' ')[0].slice(0, 12),
    })),
    ledger: ledger.map((l) => ({
      id: l.id,
      delta: l.delta,
      reason: l.reason,
      note: l.note,
      createdAt: l.createdAt.toISOString(),
    })),
  })
}

// تفعيل/إلغاء إخفاء الاسم في الليدربورد
export async function PATCH(req: Request) {
  const user = await getSessionUser(req)
  if (!user) return fail('سجل دخول الأول.', 401)
  const body = await (async () => {
    try { return (await req.json()) as { hideName: boolean } } catch { return null }
  })()
  if (!body || typeof body.hideName !== 'boolean') return fail('بيانات ناقصة.')
  await db.user.update({ where: { id: user.id }, data: { hideName: body.hideName } })
  return ok({ hideName: body.hideName })
}
