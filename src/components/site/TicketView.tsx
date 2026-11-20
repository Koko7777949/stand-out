'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Loader2, Lock, Download, FileDown, BadgeCheck, Clock,
  ShieldAlert, Share2, Gift, CalendarDays, MapPin, ScanLine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/client-api'
import { egp, type MeResponse } from '@/lib/types'
import { formatArDate, formatArTime } from '@/lib/format'
import { downloadTicketPng, downloadTicketPdf, type TicketDrawData } from '@/lib/ticket-canvas'
import { toast } from 'sonner'
import { Reveal } from './Reveal'
import { Spark } from './Logo'

type IssuedResponse = {
  ok: boolean
  ticket?: {
    id: string
    status: string
    serial: string
    holderName: string
    holderAge: number
    governorate: string
    issuedAt?: string
    qrPng: string
    eventName: string
    startsAt: string
    venue: string
    city: string
  }
  order?: { id: string; status: string; amountMinor: number; paymentMethod: string | null; paidAt?: string | null }
}

// صفحة التذكرة — قبل الدفع: علامة مائية + QR مقفول + سيريال مش مخفي بالكامل
// بعد الدفع: تذكرة صالحة بـ QR موقّع + أزرار تحميل تظهر تلقائيًا
export function TicketView({
  me,
  onShare,
  onRewards,
}: {
  me: MeResponse
  onShare: () => void
  onRewards: () => void
}) {
  const ticket = me.ticket
  const issued = ticket?.status === 'ISSUED'
  const [data, setData] = useState<IssuedResponse | null>(null)
  const [loading, setLoading] = useState(issued)
  const [clock, setClock] = useState('')

  // الختم الزمني المتجدد — علامة إن التذكرة حية قبل الدفع
  useEffect(() => {
    if (issued) return
    const tick = () => {
      const d = new Date()
      setClock(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [issued])

  useEffect(() => {
    if (!issued || !ticket) return
    setLoading(true)
    api<IssuedResponse>(`/api/tickets/${ticket.id}`)
      .then((r) => {
        if (r.ok && r.ticket) setData(r)
        else toast.error('التذكرة مش صالحة حاليًا.')
      })
      .catch(() => toast.error('حصلت مشكلة في تحميل التذكرة.'))
      .finally(() => setLoading(false))
  }, [issued, ticket?.id])

  if (!ticket) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-28 text-center">
        <p className="text-lg font-extrabold mb-4">لسه محجزش مقعد.</p>
        <span className="inline-block bg-lilac border-2 border-ink rounded-lg px-4 py-2 text-sm font-bold">ابدأ الحجز من بوابتك</span>
      </div>
    )
  }

  // ---------- حالة قبل الدفع ----------
  if (!issued) {
    return (
      <section className="mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-24 w-full" aria-labelledby="tkt-title">
        <Reveal>
          <div className="mb-6 text-center">
            <h1 id="tkt-title" className="text-3xl font-extrabold mb-2">
              {ticket.orderStatus === 'PENDING' ? 'تذكرتك — الدفع تحت المراجعة' : 'تذكرتك — بانتظار الدفع'}
            </h1>
            <p className="text-sm font-bold text-muted-foreground">
              {ticket.orderStatus === 'PENDING'
                ? 'استلمنا تأكيدك — أول ما الفريق يتأكد من التحويل، الـ QR والتحميل بيظهروا هنا تلقائيًا.'
                : 'التذكرة دي معاينة مقفولة — الـ QR والتحميل بيتبعوا بعد تأكيد الدفع بس.'}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="relative rounded-3xl bg-white border-[4px] border-ink shadow-[8px_8px_0_0_var(--ink)] overflow-hidden select-none" aria-label="تذكرة غير مدفوعة">
            {/* العلامة المائية */}
            <div className="unpaid-watermark" aria-hidden>
              {Array.from({ length: 18 }).map((_, i) => (
                <span key={i} dir="ltr">UNPAID · غير مدفوعة</span>
              ))}
            </div>

            <div className="relative z-10 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex items-center gap-1.5 bg-peach border-2 border-ink rounded-lg px-3 py-1.5 text-xs font-extrabold">
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> غير مدفوعة — محمية
                </span>
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5" dir="ltr">
                  <Clock className="h-3.5 w-3.5 soft-pulse" aria-hidden />
                  <span className="font-serial">{clock}</span>
                </span>
              </div>

              <div className="grid sm:grid-cols-[1fr_auto] gap-6">
                <div className="space-y-3.5">
                  <Row k="الاسم" v={ticket.holderName} />
                  <Row k="السن" v={String(ticket.holderAge)} />
                  <Row k="المحافظة" v={ticket.governorate} />
                  <Row k="الايفنت" v={ticket.eventName} />
                  <Row k="التاريخ" v={formatArDate(ticket.startsAt)} />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-muted-foreground shrink-0">التسلسل</span>
                    <span dir="ltr" className="font-serial text-lg tracking-widest text-ink/50">{ticket.serial}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-muted-foreground shrink-0">قيمة التأكيد</span>
                    <span className="font-extrabold">{egp(ticket.amountMinor)}</span>
                  </div>
                </div>

                <div className="relative w-full sm:w-44 h-44 rounded-2xl bg-lilac/40 border-[3px] border-ink flex flex-col items-center justify-center gap-2 overflow-hidden">
                  <div className="shimmer-strip" aria-hidden />
                  <Lock className="h-7 w-7 text-grape" aria-hidden />
                  <p className="text-xs font-extrabold text-ink/70">الـ QR بيتبعد الدفع</p>
                  <p className="text-[10px] font-bold text-muted-foreground text-center px-2 leading-relaxed">
                    التذكرة مش هتشتغل بصورة أو سكرين — بتشتغل بكود موقّع من السيرفر
                  </p>
                </div>
              </div>

              <Separator className="my-6 bg-ink/20" />
              <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                زي ما تدفع وتتأكد، زرار التحميل بيظهر هنا تلقائي من غير Refresh — والتذكرة بتبقى صالحة بـ QR حقيقي.
                الصورة دي مقصود إنها مالهاش قيمة قبل الدفع.
              </p>
            </div>
          </div>
        </Reveal>
      </section>
    )
  }

  // ---------- حالة بعد الدفع ----------
  const t = data?.ticket
  return (
    <section className="mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-24 w-full" aria-labelledby="tkt-title-ok">
      <Reveal>
        <div className="mb-6 text-center">
          <Spark className="h-9 w-9 text-lime mx-auto twinkle mb-2" aria-hidden />
          <h1 id="tkt-title-ok" className="text-3xl font-extrabold mb-2">تمام! مقعدك اتفعّل</h1>
          <p className="text-sm font-bold text-muted-foreground">التذكرة صالحة — حمّلها وقدمها عند البوابة.</p>
        </div>
      </Reveal>

      {loading || !t ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-grape" aria-label="تحميل التذكرة" />
        </div>
      ) : (
        <>
          <Reveal delay={0.05}>
            <div className="relative rounded-3xl bg-white border-[4px] border-ink shadow-[8px_8px_0_0_var(--ink)] overflow-hidden">
              <div className="h-2.5 bg-lime border-b-[3px] border-ink" aria-hidden />
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-5">
                  <span className="inline-flex items-center gap-1.5 bg-lime border-2 border-ink rounded-lg px-3 py-1.5 text-xs font-extrabold">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> صالحة للدخول
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    اتبعت {t.issuedAt ? formatArDate(t.issuedAt) : ''}
                  </span>
                </div>

                <div className="grid sm:grid-cols-[1fr_auto] gap-6">
                  <div className="space-y-3.5">
                    <Row k="الاسم" v={t.holderName} />
                    <Row k="السن" v={String(t.holderAge)} />
                    <Row k="المحافظة" v={t.governorate} />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-muted-foreground shrink-0 inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-grape" aria-hidden /> الموعد
                      </span>
                      <span className="text-sm font-extrabold text-left">
                        {formatArDate(t.startsAt)} — <span dir="ltr">{formatArTime(t.startsAt)}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-muted-foreground shrink-0 inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-grape" aria-hidden /> المكان
                      </span>
                      <span className="text-sm font-extrabold text-left">{t.venue} — {t.city}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-muted-foreground shrink-0">التسلسل</span>
                      <span dir="ltr" className="font-serial text-lg font-bold text-grape tracking-widest">{t.serial}</span>
                    </div>
                  </div>

                  <div className="justify-self-center sm:justify-self-end">
                    <div className="rounded-2xl bg-white p-3.5 border-[3px] border-ink nb-sm">
                      <Image
                        src={t.qrPng}
                        alt={`كود QR للتذكرة ${t.serial}`}
                        width={176}
                        height={176}
                        className="h-44 w-44"
                        unoptimized
                      />
                    </div>
                    <p className="mt-2.5 text-[11px] font-bold text-muted-foreground flex items-center justify-center gap-1.5">
                      <ScanLine className="h-3.5 w-3.5 text-grape" aria-hidden />
                      أول مسح = دخولك
                    </p>
                  </div>
                </div>
              </div>

              {/* ثقب التذكرة */}
              <div className="relative border-t-[3px] border-dashed border-ink/40">
                <span className="ticket-notch ticket-notch-r" style={{ top: -15 }} aria-hidden />
                <span className="ticket-notch ticket-notch-l" style={{ top: -15 }} aria-hidden />
              </div>

              <div className="p-5 sm:p-6 bg-lilac/30">
                <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                  التذكرة دي مسجلة على {t.holderName} — أي استخدام متكرر للـ QR بيترفض والوقت بيتعرض عند البوابة.
                  ملاحظة: لقطة الشاشة مش تذكرة — التحميل الرسمي بيصدر نسخة موقّعة بالكود اللي فوق.
                </p>
              </div>
            </div>
          </Reveal>

          {/* أزرار التحميل — بتظهر تلقائي بعد الدفع */}
          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <Button
                variant="outline"
                size="lg"
                className="min-h-[54px] gap-2 font-extrabold border-[3px] border-ink rounded-xl bg-white shadow-[4px_4px_0_0_var(--ink)] hover:bg-peach/40"
                onClick={async () => {
                  await downloadTicketPng(t as unknown as TicketDrawData, `standout26-ticket-${t.serial}.png`)
                  toast.success('صورة التذكرة نزلت.')
                }}
              >
                <Download className="h-5 w-5" aria-hidden /> تحميل صورة
              </Button>
              <Button
                size="lg"
                className="min-h-[54px] gap-2 font-extrabold rounded-xl border-[3px] border-ink bg-lime text-ink shadow-[4px_4px_0_0_var(--ink)] hover:bg-lime/90"
                onClick={async () => {
                  toast.loading('جاري تجهيز الـ PDF...', { id: 'pdf' })
                  await downloadTicketPdf(t as unknown as TicketDrawData, `standout26-ticket-${t.serial}.pdf`)
                  toast.success('ملف الـ PDF نزل.', { id: 'pdf' })
                }}
              >
                <FileDown className="h-5 w-5" aria-hidden /> تحميل PDF
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <Button
                variant="ghost"
                onClick={onShare}
                className="gap-2 font-extrabold text-grape hover:text-grape hover:bg-lilac/50 rounded-xl"
              >
                <Share2 className="h-4 w-4" aria-hidden /> شارك واجمع نقاط
              </Button>
              <Button
                variant="ghost"
                onClick={onRewards}
                className="gap-2 font-extrabold text-grape hover:text-grape hover:bg-lilac/50 rounded-xl"
              >
                <Gift className="h-4 w-4" aria-hidden /> استبدل نقاطك
              </Button>
            </div>
          </Reveal>
        </>
      )}
    </section>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold text-muted-foreground shrink-0">{k}</span>
      <span className="font-extrabold text-left truncate max-w-[70%]">{v}</span>
    </div>
  )
}
