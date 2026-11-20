import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'
import { expireStaleHolds } from '@/lib/event-data'
import { buildQrToken } from '@/lib/security'
import QRCode from 'qrcode'

// Polling لحالة الدفع — الصفحة بتسأل كل ثانيتين من غير ما تعمل Refresh
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return fail('سجل دخول الأول.', 401)
  const { id } = await params
  await expireStaleHolds()

  const order = await db.order.findUnique({ where: { id }, include: { ticket: true } })
  if (!order || order.userId !== user.id) return fail('مفيش طلب بالبيانات دي.', 404)

  if (order.status === 'PAID' && order.ticket?.status === 'ISSUED') {
    // توكن QR بيتولد ويُوقّع من السيرفر بس
    const { token } = buildQrToken(order.ticket.id, order.ticket.serial)
    const qrPng = await QRCode.toDataURL(token, {
      width: 560,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0A0A0A', light: '#FFFFFF' },
    })
    return ok({
      status: 'PAID',
      ticket: {
        id: order.ticket.id,
        status: order.ticket.status,
        serial: order.ticket.serial,
        holderName: order.ticket.holderName,
        holderAge: order.ticket.holderAge,
        governorate: order.ticket.governorate,
        issuedAt: order.ticket.issuedAt?.toISOString(),
        qrPng,
      },
      order: { id: order.id, status: order.status, amountMinor: order.amountMinor, paidAt: order.paidAt?.toISOString() },
    })
  }

  return ok({
    status: order.status,
    holdExpiresAt: order.holdExpiresAt?.toISOString() || null,
  })
}
