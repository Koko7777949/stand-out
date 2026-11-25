'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Loader2, ShieldCheck, Lock, Copy, TimerReset, Smartphone,
  AlertTriangle, Zap, RefreshCw, ExternalLink, BadgePercent, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PAYMENT_METHODS, egp, type CheckoutResponse, type DynamicMethod } from '@/lib/types'
import { api } from '@/lib/client-api'
import { toast } from 'sonner'
import { Reveal } from './Reveal'

type OrderData = {
  ok: boolean
  order: {
    id: string
    status: string
    amountMinor: number
    currency: string
    holdExpiresAt: string | null
    promoCode: string | null
    eventName: string
    startsAt: string
    venue: string
    city: string
  }
  ticket: { id: string; status: string; serial: string; holderName: string } | null
  payment: { id: string; status: string; method: string; providerRef: string; amountMinor: number } | null
}

// بوابة الدفع — الأمان أول: المبلغ من السيرفر، التأكيد عبر مسار موقّع، والمعرفات idempotent
export function PaymentGate({ orderId, onPaid, onExpired }: { orderId: string; onPaid: () => void; onExpired: () => void }) {
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [method, setMethod] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [methods, setMethods] = useState<DynamicMethod[] | null>(null)
  const [claimed, setClaimed] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promoApplying, setPromoApplying] = useState(false)
  const [promoInfo, setPromoInfo] = useState<{ code: string; name: string } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const paidRef = useRef(false)

  // الطرق المتاحة بتتقري من حسابات الاستلام اللي الأدمن فعّلها
  useEffect(() => {
    api<{ methods: DynamicMethod[] }>('/api/payment-methods')
      .then((r) => setMethods(r.methods || []))
      .catch(() => setMethods([]))
  }, [])

  const refresh = useCallback(async () => {
    try {
      const r = await api<OrderData>(`/api/orders/${orderId}`)
      setOrder(r)
      if (r.order.status === 'PENDING') setClaimed(true)
      if (r.order.promoCode && !promoInfo) setPromoInfo({ code: r.order.promoCode, name: '' })
      if (r.order.status === 'PAID' && !paidRef.current) {
        paidRef.current = true
        onPaid()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في تحميل الطلب')
    } finally {
      setLoading(false)
    }
  }, [orderId, onPaid, promoInfo])

  useEffect(() => {
    refresh()
  }, [refresh])

  // عداد الاحتفاظ — لو خلص، المقعد بيرجع تلقائيًا من السيرفر
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const holdLeft = order?.order.holdExpiresAt
    ? Math.max(0, new Date(order.order.holdExpiresAt).getTime() - now)
    : 0
  const holdExpired = holdLeft <= 0

  useEffect(() => {
    if (holdExpired && order?.order.status === 'HELD') {
      toast.error('الاحتفاظ بمقعدك انتهى. المقعد رجع للناس.')
      onExpired()
    }
  }, [holdExpired, order, onExpired])

  const pickMethod = async (m: string) => {
    setMethod(m)
    setCheckout(null)
    try {
      const r = await api<CheckoutResponse>(`/api/pay/${orderId}/checkout`, { body: { method: m } })
      if (r.ok) setCheckout(r)
      else toast.error(r.error || 'مشكلة في بوابة الدفع')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في بوابة الدفع')
    }
  }

  // تأكيد التحويل → ادعاء دفع تحت المراجعة → polling لحد ما الأدمن يأكد
  const confirm = async () => {
    if (!checkout?.paymentId) return
    setConfirming(true)
    try {
      await api(`/api/pay/${orderId}/confirm`, { body: { paymentId: checkout.paymentId } })
      setClaimed(true)
      toast.success('استلمنا تأكيدك — الدفع تحت مراجعة الفريق دلوقتي.')
    } catch {
      // حتى لو فشل التأكيد المباشر، الحالة بتتأكد من الـ polling
    }
    setConfirming(false)
    let tries = 0
    pollRef.current = setInterval(async () => {
      tries++
      try {
        const r = await api<{ status: string; ticket?: { id: string } }>(`/api/orders/${orderId}/status`)
        if (r.status === 'PAID' && !paidRef.current) {
          if (pollRef.current) clearInterval(pollRef.current)
          paidRef.current = true
          toast.success('اتأكدت الدفعة — مقعدك اتفعّل.')
          onPaid()
        }
      } catch { /* تجاهل محاولات التلمس */ }
      if (tries > 400 && pollRef.current) clearInterval(pollRef.current)
    }, 3000)
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // ربط كود السفير بالطلب — من المساحة اللي تحت طلب المراجعة
  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase()
    if (!code || promoApplying) return
    setPromoApplying(true)
    try {
      const r = await api<{ applied: boolean; code: string; name: string }>(`/api/orders/${orderId}/promo`, {
        body: { promoCode: code },
      })
      setPromoInfo({ code: r.code, name: r.name })
      setPromoInput('')
      toast.success(`كود السفير اتربط بطلبك${r.name ? ` — ${r.name}` : ''}.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في تطبيق الكود')
    } finally {
      setPromoApplying(false)
    }
  }

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${what} اتنسخ.`)
    } catch {
      toast.error('المتصفح منع النسخ — انسخه يدوي.')
    }
  }

  // فتح تطبيق المحفظة/انستاباي على الرقم اللي الأدمن حدده — لو التطبيق مفتحش بنذكّرهم بالنسخ اليدوي
  const openApp = async (link: string) => {
    if (checkout?.instructions?.address) {
      try { await navigator.clipboard.writeText(checkout.instructions.address) } catch { /* النسخ مجاملة */ }
    }
    window.location.href = link
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        toast.info('لو التطبيق مفتحش تلقائي — الرقم اتنسخ، افتح التطبيق ولوّز على الرقم وكمّل التحويل.')
      }
    }, 3000)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-grape" aria-label="تحميل" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-28 text-center">
        <AlertTriangle className="h-10 w-10 text-grape mx-auto mb-4" aria-hidden />
        <p className="text-lg font-extrabold">مفيش طلب بالبيانات دي.</p>
        <Button onClick={onExpired} className="mt-4 font-extrabold bg-ink text-cream border-[3px] border-ink">ارجع للحجز</Button>
      </div>
    )
  }

  const mm = Math.floor(holdLeft / 60000)
  const ss = Math.floor((holdLeft % 60000) / 1000)

  return (
    <section className="mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-24 w-full" aria-labelledby="pay-title">
      <Reveal>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-block bg-ink text-lime font-serial font-bold text-xs tracking-[0.25em] rounded-lg px-3 py-1.5 mb-4" dir="ltr">
              SECURE CHECKOUT
            </span>
            <h1 id="pay-title" className="text-3xl font-extrabold">ادفع بأمان</h1>
          </div>
          {(order.order.status === 'HELD' || order.order.status === 'PENDING') && !holdExpired && order.order.holdExpiresAt && (
            <span className="count-chip inline-flex items-center gap-1.5 px-4 py-2 font-serial font-bold" dir="ltr">
              <TimerReset className="h-4 w-4 text-grape" aria-hidden />
              {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
            </span>
          )}
        </div>
      </Reveal>

      {/* ملخص الطلب */}
      <Reveal delay={0.05}>
        <div className="bg-white nb rounded-3xl overflow-hidden mb-5">
          <div className="bg-ink text-cream px-5 py-3 flex items-center justify-between">
            <span className="font-extrabold text-sm">ملخص الطلب</span>
            <span className="font-serial text-xs text-lime" dir="ltr">{order.ticket?.serial}</span>
          </div>
          <div className="p-5 space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="font-bold text-muted-foreground">الايفنت</span><span className="font-extrabold">{order.order.eventName}</span></div>
            <div className="flex justify-between"><span className="font-bold text-muted-foreground">المقعد باسم</span><span className="font-extrabold">{order.ticket?.holderName}</span></div>
            <div className="flex justify-between"><span className="font-bold text-muted-foreground">رسوم تأكيد الحجز</span><span className="font-bold text-muted-foreground" dir="ltr">{egp(order.order.amountMinor)}</span></div>
            <div className="ink-hairline" />
            <div className="flex justify-between items-center">
              <span className="font-extrabold">الإجمالي</span>
              <span className="font-extrabold text-grape text-lg">{egp(order.order.amountMinor)}</span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* شريط الأمان */}
      <Reveal delay={0.1}>
        <div className="bg-ink text-cream rounded-2xl p-4 flex items-start gap-3 mb-6">
          <ShieldCheck className="h-5 w-5 text-lime mt-0.5 shrink-0" aria-hidden />
          <p className="text-xs font-bold leading-relaxed text-cream/85">
            الدفع بيتم في صفحة مؤمّنة، ومتخزنش بيانات كروتك أو محفظتك عندنا.
            كل عملية بتتأكد من مزود الدفع بتوقيع مشفّر قبل ما تذكرتك تتبعت — والمبلغ بيتحسب من السيرفر مش من جهازك.
          </p>
        </div>
      </Reveal>

      {/* اختيار الطريقة — من حسابات الأدمن المفعّلة */}
      {!method && (
        <div className="grid sm:grid-cols-2 gap-3">
          {(methods || []).map((m, i) => {
            const meta = PAYMENT_METHODS.find((p) => p.id === m.method)
            return (
              <button
                key={m.id}
                onClick={() => pickMethod(m.method)}
                className="nb nb-pop rounded-2xl bg-white p-4 flex items-center gap-3 text-right"
              >
                <span className={`h-11 w-11 rounded-xl border-[2.5px] border-ink flex items-center justify-center shrink-0 ${
                  i % 3 === 0 ? 'bg-lilac' : i % 3 === 1 ? 'bg-peach' : 'bg-lime'
                }`}>
                  {m.method === 'instapay' ? (
                    <Zap className="h-5 w-5 text-ink" aria-hidden />
                  ) : (
                    <Smartphone className="h-5 w-5 text-ink" aria-hidden />
                  )}
                </span>
                <span>
                  <span className="block font-extrabold text-sm">{m.label || meta?.label || m.method}</span>
                  <span className="block text-xs font-bold text-muted-foreground">{meta?.hint || 'تحويل مباشر'}</span>
                </span>
              </button>
            )
          })}
          {methods !== null && methods.length === 0 && (
            <p className="sm:col-span-2 text-sm font-bold text-muted-foreground bg-white nb rounded-2xl p-6 text-center">
              مفيش طرق دفع متاحة حاليًا — كلم الدعم أو جرّب بعدين.
            </p>
          )}
        </div>
      )}

      {/* تعليمات الدفع */}
      {method && checkout && (
        <Reveal>
          <div className="bg-white nb rounded-3xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">{checkout.instructions?.title}</h2>
              {!claimed && (
                <button onClick={() => { setMethod(null); setCheckout(null) }} className="text-xs font-bold text-muted-foreground hover:text-ink">
                  غيّر الطريقة
                </button>
              )}
            </div>

            {/* التحويل للتطبيق — لما تدوس بيتفتح انستاباي/المحفظة على الرقم المحدد لإتمام الدفع */}
            {checkout.deepLink && !claimed && (
              <div className="rounded-2xl bg-grape border-[3px] border-ink p-4 space-y-2 text-cream shadow-[4px_4px_0_0_var(--ink)]">
                <p className="text-sm font-extrabold flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-lime shrink-0" aria-hidden />
                  الدفع بيتم من تطبيق {method === 'instapay' ? 'InstaPay' : 'المحفظة'} على رقم الاستلام المحدد
                </p>
                <Button
                  onClick={() => openApp(checkout.deepLink!)}
                  className="w-full min-h-[56px] text-base font-extrabold rounded-xl border-[3px] border-ink bg-lime text-ink shadow-[3px_3px_0_0_rgba(0,0,0,0.45)] hover:bg-lime/90"
                >
                  <ExternalLink className="h-5 w-5" aria-hidden />
                  {method === 'instapay' ? 'افتح InstaPay وأكمّل الدفع' : 'افتح المحفظة وأكمّل الدفع'}
                </Button>
                <p className="text-[11px] font-bold text-cream/75">
                  رقم الاستلام اتنسخ تلقائي — لو التطبيق مفتحش، انسخ البيانات وافتح التطبيق يدويًا.
                </p>
              </div>
            )}

            {checkout.instructions?.address && (
              <div className="rounded-2xl bg-lilac/50 border-2 border-ink p-4 space-y-2">
                <p className="text-xs font-extrabold text-ink/60">
                  {method === 'instapay' ? 'عنوان InstaPay' : 'رقم المحفظة'}
                  {checkout.instructions.accountName ? ` — باسم ${checkout.instructions.accountName}` : ''}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span dir="ltr" className="font-serial text-lg font-bold text-grape">{checkout.instructions.address}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copy(checkout.instructions!.address!, 'العنوان')}
                    className="gap-1.5 shrink-0 font-bold border-[2.5px] border-ink rounded-lg bg-white hover:bg-peach/40"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden /> نسخ
                  </Button>
                </div>
              </div>
            )}

            <ul className="space-y-2 text-sm font-bold text-muted-foreground">
              {checkout.instructions?.lines.map((l, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-grape font-extrabold shrink-0">·</span>{l}
                </li>
              ))}
            </ul>

            <div className="rounded-2xl bg-peach/40 border-2 border-ink p-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-ink/60">رقم مرجع الطلب — اكتبه في الملاحظة</p>
                <span dir="ltr" className="font-serial font-bold">{checkout.reference}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copy(checkout.reference!, 'المرجع')}
                className="gap-1.5 shrink-0 font-bold border-[2.5px] border-ink rounded-lg bg-white hover:bg-lilac/50"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden /> نسخ
              </Button>
            </div>

            {/* كود السفير — مساحة تحت طلب المراجعة: لو جاي تبع أمباسدور بيكتب الكود هنا */}
            {promoInfo ? (
              <div className="rounded-2xl bg-lime/40 border-2 border-ink p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-grape shrink-0" aria-hidden />
                <div>
                  <p className="text-sm font-extrabold flex items-center gap-1.5">
                    <BadgePercent className="h-4 w-4 text-grape" aria-hidden />
                    كود السفير اتسجل: <span dir="ltr" className="font-serial">{promoInfo.code}</span>
                  </p>
                  {promoInfo.name && <p className="text-xs font-bold text-muted-foreground mt-0.5">شكرًا لدمك مع سفيرنا {promoInfo.name}</p>}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-lilac/30 border-2 border-ink p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold flex items-center gap-1.5">
                    <BadgePercent className="h-4 w-4 text-grape" aria-hidden />
                    كود السفير (اختياري)
                  </p>
                  <span className="text-[11px] font-bold text-muted-foreground">لو جاي بدعوة أمباسدور</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase().slice(0, 24))}
                    onKeyDown={(e) => { if (e.key === 'Enter') applyPromo() }}
                    placeholder="مثلًا: BYF-MAZEN"
                    dir="ltr"
                    className="flex-1 font-serial font-bold bg-white border-[2.5px] border-ink rounded-xl h-11 text-center"
                    aria-label="كود السفير"
                    autoComplete="off"
                  />
                  <Button
                    onClick={applyPromo}
                    disabled={promoApplying || promoInput.trim().length < 3}
                    className="gap-1.5 shrink-0 font-extrabold border-[2.5px] border-ink rounded-xl bg-ink text-cream hover:bg-grape min-h-[44px] px-4 disabled:opacity-50"
                  >
                    {promoApplying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
                    تطبيق
                  </Button>
                </div>
                <p className="text-[11px] font-bold text-muted-foreground">
                  تقدر تكتبه قبل أو بعد تأكيد الدفع — أول ما الطلب يتسجل بالكود مش بيتغير تاني.
                </p>
              </div>
            )}

            {claimed ? (
              <div className="rounded-2xl bg-lime/40 border-[3px] border-ink p-5 flex items-start gap-3">
                <ShieldCheck className="h-6 w-6 text-grape mt-0.5 shrink-0" aria-hidden />
                <div>
                  <p className="font-extrabold text-sm mb-1">استلمنا تأكيدك — الدفع تحت المراجعة</p>
                  <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                    الفريق بيتحقق من التحويل على حساب الاستلام — أول ما يتأكد الدفع، تذكرتك بـ QR بتتفعل تلقائيًا من غير Refresh.
                    مقعدك محجوز باسمك طول فترة المراجعة.
                  </p>
                  <p className="text-xs font-extrabold text-grape mt-2 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-grape soft-pulse" aria-hidden />
                    بنفحص حالة الطلب كل شوية — خلي الصفحة مفتوحة
                  </p>
                </div>
              </div>
            ) : (
              <Button
                onClick={confirm}
                disabled={confirming}
                className="w-full min-h-[54px] text-base font-extrabold rounded-xl border-[3px] border-ink bg-lime text-ink shadow-[4px_4px_0_0_var(--ink)] hover:bg-lime/90 disabled:opacity-60"
              >
                {confirming ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    بنسجل تأكيدك...
                  </span>
                ) : (
                  'تم التحويل — أكّد الدفع'
                )}
              </Button>
            )}
            <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-grape" aria-hidden />
              التأكيد بيمر على تحقق مشفّر (HMAC) — وأي محاولة تزوير بتترفض وبتتسجل.
            </p>
          </div>
        </Reveal>
      )}

      <button onClick={refresh} className="mt-6 mx-auto flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-grape">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden /> فحص حالة الطلب يدوي
      </button>
    </section>
  )
}
