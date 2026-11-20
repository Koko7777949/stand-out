import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'

// قائمة انتظار التأكيد — دفعات في انتظار المراجعة + إحالات تحت فحص التلاعب
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const payments = await db.payment.findMany({
    where: { status: 'PENDING' },
    include: {
      order: {
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          ticket: { select: { serial: true, holderName: true, governorate: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const reviewReferrals = await db.referral.findMany({
    where: { status: 'REVIEW' },
    include: {
      referrer: { select: { id: true, name: true, phone: true } },
      referredUser: { select: { id: true, name: true, phone: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return ok({
    payments: payments.map((p) => ({
      id: p.id,
      method: p.method,
      status: p.status,
      amountMinor: p.amountMinor,
      providerRef: p.providerRef,
      reference: p.providerRef.slice(-10).toUpperCase(),
      createdAt: p.createdAt.toISOString(),
      order: {
        id: p.order.id,
        status: p.order.status,
        holdExpiresAt: p.order.holdExpiresAt?.toISOString() || null,
        user: p.order.user,
        ticket: p.order.ticket,
      },
    })),
    reviewReferrals: reviewReferrals.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      fraudFlags: r.fraudFlags,
      referrer: r.referrer,
      referredUser: r.referredUser,
    })),
  })
}
