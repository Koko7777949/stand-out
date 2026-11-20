import { db } from '@/lib/db'
import { randomId } from '@/lib/security'

// مزود الدفع — Adapter واحد بأسماء موحدة. في الإنتاج بيتبدل لـ Paymob/Kashier بمفتاح واحد.
export type CheckoutResult =
  | {
      ok: true
      paymentId: string
      providerRef: string
      amountMinor: number
      method: string
      reference: string
      // لينك فتح التطبيق — بيحول المستخدم للمحفظة/انستاباي على الرقم اللي الأدمن حدده
      deepLink?: string
      instructions: { title: string; lines: string[]; address?: string; accountName?: string }
    }
  | { ok: false; error: string; code?: string }

export async function createCheckout(orderId: string, userId: string, method: string): Promise<CheckoutResult> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { event: true, payments: true } })
  if (!order || order.userId !== userId) return { ok: false, error: 'مفيش طلب بالبيانات دي.', code: 'not_found' }
  if (order.status !== 'HELD') return { ok: false, error: 'الطلب مش في وضع الاحتفاظ.', code: 'bad_status' }
  if (order.holdExpiresAt && order.holdExpiresAt < new Date()) {
    return { ok: false, error: 'الاحتفاظ بمقعدك انتهى. ابدأ الحجز من الأول.', code: 'hold_expired' }
  }
  if (method === 'card') return { ok: false, error: 'الدفع بالكارت لسه مش متاح — استخدم InstaPay أو المحافظ.', code: 'method_off' }

  // محاولة دفع معلّقة على نفس الطلب؟ نرجّعها بدل التكرار (idempotency)
  const pending = order.payments.find((p) => p.status === 'PENDING')
  if (pending && pending.method === method) {
    return buildInstructions(pending.id, pending.providerRef, order.amountMinor, method)
  }

  const providerRef = randomId('mp')
  const payment = await db.payment.create({
    data: {
      orderId,
      provider: 'manual_gateway',
      providerRef,
      status: 'PENDING',
      amountMinor: order.amountMinor, // المبلغ من قاعدة البيانات — مش من العميل
      method,
      idempotencyKey: randomId('idem'),
    },
  })
  return buildInstructions(payment.id, providerRef, order.amountMinor, method)
}

// لينك فتح التطبيق من قالب الأدمن — بنبدل {account} {amount} {reference}
// مثال انستاباي: ipn://{account}?amount={amount}&ref={reference}
// مثال محفظة:    vodafone://transfer?to={account}&amount={amount}
function buildDeepLink(
  template: string | null | undefined,
  accountNumber: string,
  amountMinor: number,
  reference: string,
): string | null {
  if (!template || !template.trim()) return null
  const t = template.trim()
  // بنقبل القوالب اللي فيها scheme صريح أو https أو tel (USSD للمحافظ) — حماية من javascript: و data:
  if (!/^(https?:|ipn:|tel:|[a-z][a-z0-9+.-]*:\/\/)/i.test(t)) return null
  if (/^(javascript|data|vbscript):/i.test(t)) return null
  let link = t
    .replaceAll('{account}', encodeURIComponent(accountNumber))
    .replaceAll('{amount}', String(amountMinor / 100))
    .replaceAll('{reference}', reference)
  // لينكات USSD (tel:) — النجمة والهاش لازم تتشفر عشان الآيفون والأندرويد يفتحوا الاتصال صح
  if (/^tel:/i.test(link)) {
    link = link.replace(/\*/g, '%2A').replace(/#/g, '%23')
  }
  return link
}

// تعليمات الدفع — العنوان بيتقري من حسابات الاستلام اللي الأدمن ظبطها في اللوحة
async function buildInstructions(paymentId: string, providerRef: string, amountMinor: number, method: string): Promise<CheckoutResult> {
  const egp = (amountMinor / 100).toFixed(0)
  const reference = providerRef.slice(-10).toUpperCase()

  const account = await db.paymentAccount.findFirst({
    where: { method, active: true },
    orderBy: { sortOrder: 'asc' },
  })
  if (!account) {
    return { ok: false, error: 'طريقة الدفع دي مش متاحة حالياً — جرّب طريقة تانية.', code: 'method_off' }
  }

  return {
    ok: true,
    paymentId,
    providerRef,
    amountMinor,
    method,
    reference,
    deepLink: buildDeepLink(account.deepLinkTemplate, account.accountNumber, amountMinor, reference) || undefined,
    instructions: {
      title: method === 'instapay' ? 'تحويل InstaPay' : `دفع بـ ${account.label}`,
      address: account.accountNumber,
      accountName: account.accountName,
      lines: [
        `حوّل مبلغ ${egp} جنيه على ${method === 'instapay' ? 'العنوان ده' : 'الرقم ده'}${account.accountName ? ` باسم ${account.accountName}` : ''}`,
        'اكتب رقم مرجع الطلب في خانة الملاحظات',
        'اضغط "تم التحويل" بعد ما تخلص العملية',
        ...(account.instructions ? [account.instructions] : []),
      ].filter(Boolean),
    },
  }
}

// اكتمال الدفعة — Idempotent ومحمية بـ Transaction واحدة
export async function completePayment(paymentId: string, providerTransactionId: string): Promise<
  { ok: true; already: boolean } | { ok: false; error: string; status?: number }
> {
  try {
    const result = await db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: true } })
      if (!payment) return { ok: false as const, error: 'مفيش دفعة بالبيانات دي.', status: 404 }
      if (payment.providerTransactionId && payment.providerTransactionId !== providerTransactionId) {
        return { ok: false as const, error: 'تعارض في مرجع العملية.', status: 409 }
      }
      if (payment.status === 'PAID') return { ok: true as const, already: true }
      if (payment.status !== 'PENDING') return { ok: false as const, error: 'الدفعة مش قابلة للاكتمال.', status: 409 }
      if (payment.amountMinor !== payment.order.amountMinor) {
        return { ok: false as const, error: 'مبلغ العملية مش مطابق.', status: 409 }
      }

      const now = new Date()
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'PAID', providerTransactionId, webhookReceivedAt: now },
      })
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID', paidAt: now, paymentMethod: payment.method },
      })
      // المقعد: من المحجوز للمباع — عملية ذرّية ضد البيع الزيادة
      await tx.$executeRawUnsafe(
        'UPDATE Event SET soldCount = soldCount + 1, heldCount = MAX(0, heldCount - 1) WHERE id = ?',
        payment.order.eventId,
      )
      await tx.ticket.updateMany({
        where: { orderId: payment.orderId, status: { in: ['DRAFT', 'HELD'] } },
        data: { status: 'ISSUED', issuedAt: now },
      })
      return { ok: true as const, already: false }
    })
    if (result.ok && !result.already) {
      await audit(null, 'payment_completed', 'payment', paymentId, `txn=${providerTransactionId}`)
    }
    return result
  } catch {
    return { ok: false, error: 'حصل مشكلة في تأكيد الدفع. جرّب تاني.' }
  }
}

export async function audit(actorId: string | null, action: string, entity: string, entityId: string | null, detail?: string) {
  await db.auditLog.create({ data: { actorId, action, entity, entityId, detail: detail?.slice(0, 300) } })
}

// معالجة حمولة الويبهوك — بتتستخدم من الويبهوك الحقيقي ومن تأكيد الدفع الداخلي
export async function processWebhookPayload(
  payload: string,
  signature: string,
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const { verifyWebhook } = await import('@/lib/security')
  if (!verifyWebhook(payload, signature)) {
    return { ok: false, error: 'توقيع غير صحيح.', status: 401 }
  }
  let data: { providerRef?: string; providerTransactionId?: string; status?: string; amountMinor?: number }
  try {
    data = JSON.parse(payload)
  } catch {
    return { ok: false, error: 'حمولة غير صحيحة.', status: 400 }
  }
  if (!data.providerRef || !data.providerTransactionId || !data.status) {
    return { ok: false, error: 'بيانات ناقصة.', status: 400 }
  }
  const payment = await db.payment.findUnique({ where: { providerRef: data.providerRef } })
  if (!payment) return { ok: false, error: 'مفيش عملية بالبيانات دي.', status: 404 }
  if (data.amountMinor !== undefined && data.amountMinor !== payment.amountMinor) {
    return { ok: false, error: 'مبلغ العملية مش مطابق.', status: 409 }
  }
  if (data.status === 'PAID') {
    const r = await completePayment(payment.id, data.providerTransactionId)
    if (!r.ok) return { ok: false, error: r.error, status: r.status }
    return { ok: true }
  }
  if (data.status === 'FAILED') {
    await db.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    return { ok: true }
  }
  return { ok: false, error: 'حالة غير معروفة.', status: 400 }
}

