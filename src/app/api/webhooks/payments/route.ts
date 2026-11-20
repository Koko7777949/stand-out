import { NextResponse } from 'next/server'
import { processWebhookPayload } from '@/lib/payments'

// ويبهوك مزود الدفع — توقيع HMAC إجباري على الحمولة الخام + رفض أي توقيع غلط بـ 401
export async function POST(req: Request) {
  const raw = await req.text()
  const signature = req.headers.get('x-sou-signature') || ''
  if (!signature) {
    return NextResponse.json({ ok: false, error: 'توقيع مفقود.' }, { status: 401 })
  }
  const result = await processWebhookPayload(raw, signature)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status || 401 })
  }
  return NextResponse.json({ ok: true, received: true })
}
