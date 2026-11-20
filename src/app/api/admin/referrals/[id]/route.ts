import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'
import { applyTierAward, awardReferralPoints } from '@/lib/points'
import { audit } from '@/lib/payments'

// مراجعة الإحالات المشبوهة — تأكيد بيحوّلها لمؤهلة وتمنح النقاط، رفض بيقفلها
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const { id } = await params
  const body = await readJson<{ action?: string }>(req)
  if (!body?.action) return fail('حدد الإجراء: تأكيد أو رفض.')

  const referral = await db.referral.findUnique({ where: { id } })
  if (!referral) return fail('مفيش إحالة بالبيانات دي.', 404)
  if (referral.status !== 'REVIEW') return fail('الإحالة دي مش تحت المراجعة.')

  if (body.action === 'approve') {
    await db.referral.update({
      where: { id },
      data: { status: 'QUALIFIED', qualifiedAt: new Date(), fraudFlags: '[]' },
    })
    await awardReferralPoints(referral.referrerId, referral.id)
    await applyTierAward(referral.referrerId)
    await audit(admin.id, 'referral_approved', 'referral', id, `referrer=${referral.referrerId}`)
    return ok({ status: 'QUALIFIED' })
  }

  if (body.action === 'reject') {
    await db.referral.update({ where: { id }, data: { status: 'REJECTED' } })
    await audit(admin.id, 'referral_rejected', 'referral', id, `referrer=${referral.referrerId}`)
    return ok({ status: 'REJECTED' })
  }

  return fail('إجراء غير معروف.')
}
