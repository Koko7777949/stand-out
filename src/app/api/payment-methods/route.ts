import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api-helpers'
import { getSessionUser } from '@/lib/session'

// طرق الدفع المتاحة — بتتقري من حسابات الاستلام اللي الأدمن فعّلها
export async function GET(req: Request) {
  const user = await getSessionUser(req)
  if (!user) return fail('سجل دخول الأول.', 401)

  const accounts = await db.paymentAccount.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, method: true, label: true },
  })

  // نزيل التكرار لو الأدمن ضاف أكثر من حساب لنفس الطريقة
  const seen = new Set<string>()
  const methods = accounts.filter((a) => {
    if (seen.has(a.method)) return false
    seen.add(a.method)
    return true
  })

  return ok({ methods })
}
