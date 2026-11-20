import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'

// رصيد النقاط = مجموع حركات الدفتر (append-only)
export async function pointsBalance(userId: string): Promise<number> {
  const agg = await db.pointsLedger.aggregate({
    where: { userId },
    _sum: { delta: true },
  })
  return agg._sum.delta || 0
}

export async function qualifiedCount(userId: string): Promise<number> {
  return db.referral.count({ where: { referrerId: userId, status: 'QUALIFIED' } })
}

// award tiers: لما صاحبك يعدي عدّاد معين — الفرق بيضاف مرة واحدة بس
export async function applyTierAward(userId: string) {
  const count = await qualifiedCount(userId)
  const tiers = await db.pointsTier.findMany({ where: { active: true }, orderBy: { minReferrals: 'desc' } })
  let target = 0
  let matchedTier: { minReferrals: number; totalPoints: number } | null = null
  for (const t of tiers) {
    if (count >= t.minReferrals) {
      target = t.totalPoints
      matchedTier = t
      break
    }
  }
  if (target === 0 || !matchedTier) return null

  const awarded = await db.pointsLedger.aggregate({
    where: { userId, reason: 'TIER_AWARD' },
    _sum: { delta: true },
  })
  const already = awarded._sum.delta || 0
  const diff = target - already
  if (diff <= 0) return null

  await db.pointsLedger.create({
    data: {
      userId,
      delta: diff,
      reason: 'TIER_AWARD',
      refType: 'TIER',
      refId: String(matchedTier.minReferrals),
      note: `مكافأة وصول ${count} صديق مؤهل`,
    },
  })
  return { awarded: diff, total: target }
}

export async function nextTierInfo(count: number) {
  const tiers = await db.pointsTier.findMany({ where: { active: true }, orderBy: { minReferrals: 'asc' } })
  for (const t of tiers) {
    if (count < t.minReferrals) {
      return { next: t, remaining: t.minReferrals - count }
    }
  }
  return null
}

// نقاط الدعوة المباشرة — نقاط ثابتة لكل صديق مؤهل (بتتضبط من اللوحة)
// الـ idempotency عبر refId = معرّف الإحالة — ممنوع تكرار نفس الإحالة مرتين
export async function awardReferralPoints(referrerId: string, referralId: string) {
  const s = await getSettings()
  const per = Math.max(0, parseInt(s.pointsPerReferral || '10', 10) || 0)
  if (per <= 0) return null
  const existing = await db.pointsLedger.findFirst({
    where: { userId: referrerId, reason: 'REFERRAL', refType: 'REFERRAL', refId: referralId },
  })
  if (existing) return null
  await db.pointsLedger.create({
    data: {
      userId: referrerId,
      delta: per,
      reason: 'REFERRAL',
      refType: 'REFERRAL',
      refId: referralId,
      note: 'صديق سجّل وأكد من لينكك',
    },
  })
  return { awarded: per }
}
