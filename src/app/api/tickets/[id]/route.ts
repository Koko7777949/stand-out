import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'
import { buildQrToken } from '@/lib/security'
import QRCode from 'qrcode'

// التذكرة — بياناتها الكاملة (سيريال + QR) بتظهر بس لما تكون صالحة
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return fail('سجل دخول الأول.', 401)
  const { id } = await params

  const ticket = await db.ticket.findUnique({ where: { id }, include: { order: true, event: true } })
  if (!ticket || ticket.userId !== user.id) return fail('مفيش تذكرة بالبيانات دي.', 404)

  if (ticket.status !== 'ISSUED') {
    // أي طلب تحميل أو QR لتذكرة مش صالحة بيرجع 403
    return fail('التذكرة لسه مش صالحة. لازم الدفع يتأكد الأول.', 403, {
      ticket: {
        id: ticket.id,
        status: ticket.status,
        serialMasked: ticket.serial.slice(0, 5) + '••••••',
        holderName: ticket.holderName,
      },
    })
  }

  const { token } = buildQrToken(ticket.id, ticket.serial)
  const qrPng = await QRCode.toDataURL(token, {
    width: 560,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  })

  return ok({
    ticket: {
      id: ticket.id,
      status: ticket.status,
      serial: ticket.serial,
      holderName: ticket.holderName,
      holderAge: ticket.holderAge,
      governorate: ticket.governorate,
      issuedAt: ticket.issuedAt?.toISOString(),
      qrPng,
      eventName: ticket.event.name,
      startsAt: ticket.event.startsAt.toISOString(),
      venue: ticket.event.venue,
      city: ticket.event.city,
    },
    order: {
      id: ticket.order.id,
      status: ticket.order.status,
      amountMinor: ticket.order.amountMinor,
      paymentMethod: ticket.order.paymentMethod,
      paidAt: ticket.order.paidAt?.toISOString(),
    },
  })
}
