import { NextResponse } from 'next/server'

// ردود موحدة بأخطاء مفهومة بالعربي
export function ok(data: Record<string, unknown> | null = null, init?: number) {
  return NextResponse.json({ ok: true, ...data }, { status: init || 200 })
}

export function fail(error: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status })
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}
