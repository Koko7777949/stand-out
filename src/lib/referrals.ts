import { db } from '@/lib/db'
import { applyTierAward, awardReferralPoints } from '@/lib/points'
import { hashIp } from '@/lib/security'
import { getClientIp } from '@/lib/rate-limit'

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function makeReferralCode(): string {
  const buf = new Uint8Array(8)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => B32[b % 32]).join('')
}

export async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const c = makeReferralCode()
    const exists = await db.user.findUnique({ where: { referralCode: c } })
    if (!exists) return c
  }
  throw new Error('code_gen_failed')
}

// تسجيل الإحالة عند أول حساب جديد — first-touch بس، ومفيش عمولة للذات
// النقاط بتتحسب بس لما صاحبك يسجّل حساب جديد ويأكد حسابه من كود دعوتك
export async function captureReferral(newUserId: string, refCode: string | undefined, req: Request) {
  if (!refCode) return
  try {
    const referrer = await db.user.findUnique({ where: { referralCode: refCode.trim().toUpperCase() } })
    if (!referrer || referrer.id === newUserId) return
    if (referrer.status !== 'active') return

    const ipH = hashIp(getClientIp(req))
    // فحص بسيط للتلاعب: نفس الـ IP جاب كذا إحالة قريبة من بعض → تحت المراجعة
    const suspicious =
      ipH &&
      (await db.referral.count({
        where: { referrerId: referrer.id, ipHash: ipH, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      })) >= 3

    const status = suspicious ? 'REVIEW' : 'QUALIFIED'
    const existing = await db.referral.findUnique({ where: { referredUserId: newUserId } })
    if (existing) return

    const created = await db.referral.create({
      data: {
        referrerId: referrer.id,
        referredUserId: newUserId,
        status,
        ipHash: ipH,
        qualifiedAt: status === 'QUALIFIED' ? new Date() : null,
        fraudFlags: suspicious ? '["same_ip_burst"]' : '[]',
      },
    })
    if (status === 'QUALIFIED') {
      // نقاط الدعوة المباشرة + مكافأة المستوى لو عدّت عدّاد معين
      await awardReferralPoints(referrer.id, created.id)
      await applyTierAward(referrer.id)
    }
  } catch {
    // الإحالة مش لازم تعطل التسجيل
  }
}
