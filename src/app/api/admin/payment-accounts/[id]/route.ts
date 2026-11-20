import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'
import { audit } from '@/lib/payments'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const { id } = await params
  const body = await readJson<Record<string, unknown>>(req)
  if (!body) return fail('بيانات ناقصة.')

  const data: Record<string, unknown> = {}
  if (typeof body.label === 'string' && body.label.trim()) data.label = body.label.trim().slice(0, 60)
  if (typeof body.accountName === 'string' && body.accountName.trim()) data.accountName = body.accountName.trim().slice(0, 80)
  if (typeof body.accountNumber === 'string' && body.accountNumber.trim()) data.accountNumber = body.accountNumber.trim().slice(0, 80)
  if (typeof body.deepLinkTemplate === 'string') data.deepLinkTemplate = body.deepLinkTemplate.trim().slice(0, 300) || null
  if (typeof body.instructions === 'string') data.instructions = body.instructions.slice(0, 200) || null
  if (typeof body.active === 'boolean') data.active = body.active
  if (typeof body.sortOrder === 'number') data.sortOrder = Math.floor(body.sortOrder)

  try {
    await db.paymentAccount.update({ where: { id }, data })
  } catch {
    return fail('مفيش حساب بالبيانات دي.', 404)
  }
  await audit(admin.id, 'payment_account_updated', 'payment_account', id, JSON.stringify(body).slice(0, 200))
  return ok()
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const { id } = await params
  try {
    await db.paymentAccount.delete({ where: { id } })
  } catch {
    return fail('مفيش حساب بالبيانات دي.', 404)
  }
  await audit(admin.id, 'payment_account_deleted', 'payment_account', id)
  return ok()
}
