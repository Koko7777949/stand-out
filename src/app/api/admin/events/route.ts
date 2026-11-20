import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'
import { audit } from '@/lib/payments'
import { z } from 'zod'

const EventSchema = z.object({
  name: z.string().trim().min(3, 'اسم الايفنت قصير').max(120),
  startsAt: z.string().min(4, 'حدد تاريخ الايفنت'),
  venue: z.string().trim().min(2, 'حدد المكان').max(120),
  city: z.string().trim().min(2, 'حدد المدينة').max(120),
  capacity: z.coerce.number().int().min(1, 'السعة لازم تكون أكبر من صفر').max(100000),
  priceEgp: z.coerce.number().min(0, 'السعر مش صح').max(100000),
  holdMinutes: z.coerce.number().int().min(5).max(120),
  bookingOpensAt: z.string().min(4),
  bookingClosesAt: z.string().min(4),
  ageMin: z.coerce.number().int().min(10).max(80),
  ageMax: z.coerce.number().int().min(10).max(80),
  shareText: z.string().max(400).optional(),
  doorsAt: z.string().max(10).optional(),
  endsAt: z.string().max(10).optional(),
  note: z.string().max(300).optional(),
})

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  const rnd = Math.random().toString(36).slice(2, 7)
  return `${base || 'event'}-${rnd}`
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const events = await db.event.findMany({
    orderBy: { startsAt: 'desc' },
    select: {
      id: true, slug: true, name: true, startsAt: true, venue: true, city: true,
      active: true, capacity: true, heldCount: true, soldCount: true, priceMinor: true,
      holdMinutes: true, bookingOpensAt: true, bookingClosesAt: true,
      ageMin: true, ageMax: true, settings: true, createdAt: true,
    },
  })
  return ok({ events: events.map((e) => ({ ...e, startsAt: e.startsAt.toISOString(), bookingOpensAt: e.bookingOpensAt.toISOString(), bookingClosesAt: e.bookingClosesAt.toISOString(), createdAt: e.createdAt.toISOString() })) })
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const body = await readJson<Record<string, unknown>>(req)
  if (!body) return fail('بيانات ناقصة.')
  const parsed = EventSchema.safeParse(body)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'بيانات مش صحيحة.')
  const d = parsed.data
  if (new Date(d.bookingClosesAt) > new Date(d.startsAt)) return fail('قفل الحجز لازم يكون قبل موعد الايفنت.')
  if (d.ageMax < d.ageMin) return fail('أقصى سن لازم يكون أكبر من أقل سن.')

  const ev = await db.event.create({
    data: {
      slug: slugify(d.name),
      name: d.name,
      startsAt: new Date(d.startsAt),
      venue: d.venue,
      city: d.city,
      capacity: d.capacity,
      priceMinor: Math.round(d.priceEgp * 100),
      holdMinutes: d.holdMinutes,
      bookingOpensAt: new Date(d.bookingOpensAt),
      bookingClosesAt: new Date(d.bookingClosesAt),
      ageMin: d.ageMin,
      ageMax: d.ageMax,
      settings: JSON.stringify({ doorsAt: d.doorsAt || '08:00', endsAt: d.endsAt || '17:00', note: d.note || '', shareText: d.shareText || '' }),
    },
  })
  await audit(admin.id, 'event_created', 'event', ev.id, d.name)
  return ok({ event: { id: ev.id } })
}
