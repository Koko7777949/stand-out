import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'

// نظرة عامة على النظام — إحصائيات + آخر حركات الإدارة
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const [users, banned, admins, ticketsIssued, ticketsHeld, ordersPaid, paidAgg, pendingPayments, reviewReferrals, qualifiedReferrals, pendingRedemptions, activeEvent, audit] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { status: 'blocked' } }),
      db.user.count({ where: { role: { in: ['admin', 'super_admin'] } } }),
      db.ticket.count({ where: { status: 'ISSUED' } }),
      db.ticket.count({ where: { status: 'HELD' } }),
      db.order.count({ where: { status: 'PAID' } }),
      db.order.aggregate({ where: { status: 'PAID' }, _sum: { amountMinor: true } }),
      db.payment.count({ where: { status: 'PENDING' } }),
      db.referral.count({ where: { status: 'REVIEW' } }),
      db.referral.count({ where: { status: 'QUALIFIED' } }),
      db.redemption.count({ where: { status: 'PENDING' } }),
      db.event.findFirst({ where: { active: true }, select: { name: true, slug: true, soldCount: true, capacity: true } }),
      db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
    ])

  return ok({
    stats: {
      users,
      banned,
      admins,
      ticketsIssued,
      ticketsHeld,
      ordersPaid,
      revenueMinor: paidAgg._sum.amountMinor || 0,
      pendingPayments,
      reviewReferrals,
      qualifiedReferrals,
      pendingRedemptions,
    },
    activeEvent,
    audit: audit.map((a) => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      detail: a.detail,
      createdAt: a.createdAt.toISOString(),
    })),
  })
}
