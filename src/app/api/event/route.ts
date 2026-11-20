import { db } from '@/lib/db'
import { ok } from '@/lib/api-helpers'
import { getPublicEvent } from '@/lib/event-data'
import { ensureBootstrap } from '@/lib/bootstrap'

// بيانات عامة للزوار — بتتكاش على الـ CDN في الإنتاج
export async function GET() {
  await ensureBootstrap()
  const ev = await getPublicEvent()
  if (!ev) return ok({ event: null })
  const totalQualified = await db.referral.count({ where: { status: 'QUALIFIED' } })
  return ok({
    event: ev,
    stats: {
      sold: ev.soldCount,
      capacity: ev.capacity,
      qualifiedReferrals: totalQualified,
    },
  })
}
