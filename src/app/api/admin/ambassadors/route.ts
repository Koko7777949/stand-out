import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'
import { audit } from '@/lib/payments'
import { ensureBootstrap } from '@/lib/bootstrap'

// إدارة السفراء — الأدمن بيضيف كود لكل سفير وبيقفله أو يمسحه
// الاستخدامات (uses) بتزيد تلقائيًا أول ما الطلب يتسجل بالكود

function normalizeCode(raw: string): string | null {
  const c = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (!/^[A-Z0-9_-]{3,24}$/.test(c)) return null
  return c
}

export async function GET(req: Request) {
  await ensureBootstrap()
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const list = await db.ambassador.findMany({ orderBy: [{ active: 'desc' }, { createdAt: 'desc' }] })
  return ok({ ambassadors: list })
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const body = await readJson<{ code?: string; name?: string; note?: string }>(req)
  const code = normalizeCode(body?.code || '')
  const name = (body?.name || '').trim().slice(0, 80)
  if (!code) return fail('الكود لازم يكون حروف إنجليزية أو أرقام من 3 لـ 24 خانة.')
  if (!name) return fail('اكتب اسم السفير.')

  const exists = await db.ambassador.findUnique({ where: { code } })
  if (exists) return fail('الكود ده موجود بالفعل لسفير تاني.')

  const amb = await db.ambassador.create({
    data: { code, name, note: (body?.note || '').trim().slice(0, 200) || null },
  })
  await audit(admin.id, 'ambassador_created', 'ambassador', amb.id, `code=${code}`)
  return ok({ ambassador: amb })
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const body = await readJson<{ id?: string; name?: string; active?: boolean; note?: string }>(req)
  if (!body?.id) return fail('بيانات ناقصة.')

  const amb = await db.ambassador.findUnique({ where: { id: body.id } })
  if (!amb) return fail('مفيش سفير بالبيانات دي.', 404)

  const data: { name?: string; active?: boolean; note?: string | null } = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 80)
  if (typeof body.active === 'boolean') data.active = body.active
  if (typeof body.note === 'string') data.note = body.note.trim().slice(0, 200) || null

  const updated = await db.ambassador.update({ where: { id: amb.id }, data })
  await audit(admin.id, 'ambassador_updated', 'ambassador', amb.id, Object.keys(data).join(','))
  return ok({ ambassador: updated })
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return fail('بيانات ناقصة.')

  const amb = await db.ambassador.findUnique({ where: { id } })
  if (!amb) return fail('مفيش سفير بالبيانات دي.', 404)

  await db.ambassador.delete({ where: { id } })
  await audit(admin.id, 'ambassador_deleted', 'ambassador', amb.id, `code=${amb.code} uses=${amb.uses}`)
  return ok({ deleted: true })
}
