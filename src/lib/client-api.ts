// عميل API موحد — كل الطلبات بتتعامل مع الأخطاء بمكان واحد
export async function api<T = Record<string, unknown>>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(path, {
    method: options.method || (options.body ? 'POST' : 'GET'),
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  })
  let data: T & { ok?: boolean; error?: string }
  try {
    data = await res.json()
  } catch {
    throw new Error('حصلت مشكلة في الاتصال. جرّب تاني.')
  }
  if (!res.ok) {
    const err = new Error(data?.error || 'حصلت مشكلة. جرّب تاني.') as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data as T
}
