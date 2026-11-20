import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'
import { expireStaleHolds } from '@/lib/event-data'

// ملخص الطلب — المالك بس، مفيش IDOR
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return fail('سجل دخول الأول.', 401)
  const { id } = await params
  await expireStaleHolds()

  const order = await db.order.findUnique({
    where: { id },
    include: { event: true, ticket: true, payments: true },
  })
  if (!order || order.userId !== user.id) return fail('مفيش طلب بالبيانات دي.', 404)

  const issued = order.ticket?.status === 'ISSUED'
  return ok({
    order: {
      id: order.id,
      status: order.status,
      amountMinor: order.amountMinor,
      currency: order.currency,
      holdExpiresAt: order.holdExpiresAt?.toISOString() || null,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt?.toISOString() || null,
      eventName: order.event.name,
      startsAt: order.event.startsAt.toISOString(),
      venue: order.event.venue,
      city: order.event.city,
    },
    ticket: order.ticket
      ? {
          id: order.ticket.id,
          status: order.ticket.status,
          serial: issued ? order.ticket.serial : order.ticket.serial.slice(0, 5) + '••••••',
          holderName: order.ticket.holderName,
          holderAge: order.ticket.holderAge,
          governorate: order.ticket.governorate,
        }
      : null,
    payment: order.payments.length
      ? {
          id: order.payments[order.payments.length - 1].id,
          status: order.payments[order.payments.length - 1].status,
          method: order.payments[order.payments.length - 1].method,
          providerRef: order.payments[order.payments.length - 1].providerRef,
          amountMinor: order.payments[order.payments.length - 1].amountMinor,
        }
      : null,
  })
}
