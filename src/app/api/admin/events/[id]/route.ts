import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'
import { audit } from '@/lib/payments'

// تعديل ايفنت — التفعيل بيقفل أي ايفنت تاني مفعّل (ايفنت واحد ظاهر للعامة)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const { id } = await params
  const body = await readJson<Record<string, unknown>>(req)
  if (!body) return fail('بيانات ناقصة.')

  const current = await db.event.findUnique({ where: { id } })
  if (!current) return fail('مفيش ايفنت بالبيانات دي.', 404)

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim().length >= 3) data.name = body.name.trim().slice(0, 120)
  if (typeof body.startsAt === 'string') data.startsAt = new Date(body.startsAt)
  if (typeof body.venue === 'string' && body.venue.trim()) data.venue = body.venue.trim().slice(0, 120)
  if (typeof body.city === 'string' && body.city.trim()) data.city = body.city.trim().slice(0, 120)
  if (typeof body.capacity === 'number' && body.capacity >= 1) data.capacity = Math.floor(body.capacity)
  if (typeof body.priceEgp === 'number' && body.priceEgp >= 0) data.priceMinor = Math.round(body.priceEgp * 100)
  if (typeof body.holdMinutes === 'number' && body.holdMinutes >= 5) data.holdMinutes = Math.floor(body.holdMinutes)
  if (typeof body.bookingOpensAt === 'string') data.bookingOpensAt = new Date(body.bookingOpensAt)
  if (typeof body.bookingClosesAt === 'string') data.bookingClosesAt = new Date(body.bookingClosesAt)
  if (typeof body.ageMin === 'number') data.ageMin = Math.floor(body.ageMin)
  if (typeof body.ageMax === 'number') data.ageMax = Math.floor(body.ageMax)
  if (typeof body.settings === 'object' && body.settings) data.settings = JSON.stringify(body.settings)

  const activate = body.active === true
  const deactivate = body.active === false
  if (activate) data.active = true
  if (deactivate) data.active = false

  try {
    await db.$transaction(async (tx) => {
      if (activate) await tx.event.updateMany({ where: { active: true, id: { not: id } }, data: { active: false } })
      await tx.event.update({ where: { id }, data })
    })
  } catch {
    return fail('حصلت مشكلة في حفظ التعديلات. جرّب تاني.')
  }

  await audit(admin.id, activate ? 'event_activated' : deactivate ? 'event_deactivated' : 'event_updated', 'event', id, String(data.name || current.name))
  return ok()
}

// حذف ايفنت — ممنوع لو عليه حجوزات أو تذاكر
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const { id } = await params
  const orders = await db.order.count({ where: { eventId: id } })
  if (orders > 0) return fail('مش ممكن تحذف ايفنت عليه حجوزات — قفله بس من التفعيل.')

  const ev = await db.event.findUnique({ where: { id } })
  if (!ev) return fail('مفيش ايفنت بالبيانات دي.', 404)

  await db.event.delete({ where: { id } })
  await audit(admin.id, 'event_deleted', 'event', id, ev.name)
  return ok()
}
