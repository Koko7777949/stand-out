import { getSessionUser } from '@/lib/session'
import type { User } from '@prisma/client'

// حراس صلاحيات لوحة التحكم — الفحص بيحصل في السيرفر على كل طلب
export const ADMIN_ROLES = ['admin', 'super_admin'] as const

export function isAdminRole(role: string | undefined | null): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role)
}

export function isSuperRole(role: string | undefined | null): boolean {
  return role === 'super_admin'
}

export async function requireAdmin(req: Request): Promise<User | null> {
  const user = await getSessionUser(req)
  if (!user || user.status !== 'active') return null
  if (!isAdminRole(user.role)) return null
  return user
}

export async function requireSuper(req: Request): Promise<User | null> {
  const admin = await requireAdmin(req)
  if (!admin || !isSuperRole(admin.role)) return null
  return admin
}
