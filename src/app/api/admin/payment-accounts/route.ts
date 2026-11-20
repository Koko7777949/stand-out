import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api-helpers'
import { requireAdmin } from '@/lib/guards'
import { audit } from '@/lib/payments'
import { z } from 'zod'

const VALID_METHODS = ['instapay', 'vodafone_cash', 'orange_cash', 'etisalat_cash', 'we_pay']

const AccountSchema = z.object({
  method: z.enum(['instapay', 'vodafone_cash', 'orange_cash', 'etisalat_cash', 'we_pay'] as const),
  label: z.string().trim().min(2, 'اسم الطريقة قصير').max(60),
  accountName: z.string().trim().min(2, 'اسم صاحب الحساب مطلوب').max(80),
  accountNumber: z.string().trim().min(4, 'رقم/عنوان الحساب مطلوب').max(80),
  deepLinkTemplate: z.string().trim().max(300, 'لينك التطبيق طويل').optional(),
  instructions: z.string().max(200).optional(),
  sortOrder: z.coerce.number().int().min(0).max(99).optional(),
})

// حسابات استلام الفلوس — الايميل/الموبايل/انستاباي/المحافظ اللي الأدمن بيقبض عليها
export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const accounts = await db.paymentAccount.findMany({ orderBy: { sortOrder: 'asc' } })
  return ok({ accounts })
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return fail('الصفحة دي للأدمن بس.', 403)

  const body = await readJson<Record<string, unknown>>(req)
  if (!body) return fail('بيانات ناقصة.')
  const parsed = AccountSchema.safeParse(body)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || 'بيانات مش صحيحة.')
  const d = parsed.data

  const count = await db.paymentAccount.count({ where: { method: d.method } })
  if (count >= 3) return fail('عندك 3 حسابات بنفس الطريقة — شغّل/عدل الموجود بدل التكرار.')

  const acc = await db.paymentAccount.create({
    data: {
      method: d.method,
      label: d.label,
      accountName: d.accountName,
      accountNumber: d.accountNumber,
      deepLinkTemplate: d.deepLinkTemplate || null,
      instructions: d.instructions || null,
      sortOrder: d.sortOrder ?? 10,
    },
  })
  await audit(admin.id, 'payment_account_added', 'payment_account', acc.id, `${d.label} — ${d.accountNumber}`)
  return ok({ account: { id: acc.id } })
}
