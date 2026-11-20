import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'
import { pointsBalance, qualifiedCount } from '@/lib/points'
import { expireStaleHolds } from '@/lib/event-data'

export async function GET(req: Request) {
  const user = await getSessionUser(req)
  if (!user) return fail('مفيش جلسة شغالة.', 401)
  await expireStaleHolds()

  const [balance, qCount, ticket] = await Promise.all([
    pointsBalance(user.id),
    qualifiedCount(user.id),
    db.ticket.findFirst({
      where: { userId: user.id, status: { in: ['HELD', 'ISSUED', 'DRAFT'] } },
      include: { order: true, event: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  let ticketPayload = null
  if (ticket) {
    const issued = ticket.status === 'ISSUED'
    ticketPayload = {
      id: ticket.id,
      status: ticket.status,
      serial: issued ? ticket.serial : ticket.serial.slice(0, 5) + '••••••',
      holderName: ticket.holderName,
      holderAge: ticket.holderAge,
      governorate: ticket.governorate,
      issuedAt: ticket.issuedAt?.toISOString() || null,
      orderId: ticket.orderId,
      orderStatus: ticket.order.status,
      holdExpiresAt: ticket.order.holdExpiresAt?.toISOString() || null,
      amountMinor: ticket.order.amountMinor,
      eventName: ticket.event.name,
      startsAt: ticket.event.startsAt.toISOString(),
      venue: ticket.event.venue,
      city: ticket.event.city,
    }
  }

  return ok({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      phoneVerified: !!user.phoneVerifiedAt,
      emailVerified: !!user.emailVerifiedAt,
      provider: user.provider,
      role: user.role,
      referralCode: user.referralCode,
      hideName: user.hideName,
    },
    points: { balance, qualified: qCount },
    ticket: ticketPayload,
  })
}

// تحديث اسم المستخدم / خصوصية الاسم
export async function PATCH(req: Request) {
  const user = await getSessionUser(req)
  if (!user) return fail('مفيش جلسة شغالة.', 401)
  const body = await (async () => {
    try { return await req.json() as { name?: string; hideName?: boolean } } catch { return null }
  })()
  if (!body) return fail('بيانات ناقصة.')
  const data: { name?: string; hideName?: boolean } = {}
  if (typeof body.name === 'string') {
    const n = body.name.trim().slice(0, 60)
    if (n.length < 2) return fail('الاسم قصير جداً.')
    data.name = n
  }
  if (typeof body.hideName === 'boolean') data.hideName = body.hideName
  await db.user.update({ where: { id: user.id }, data })
  return ok()
}
