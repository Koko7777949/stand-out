'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import gsap from 'gsap'
import { Ticket, ChevronDown } from 'lucide-react'
import { Spark } from './Logo'
import { Countdown } from './Countdown'
import { Reveal } from './Reveal'

// أيقونات مرسومة بإيد بألوان الستيكرز — زي نظام الأيقونات في الموقع المرجعي
function IconCalendar({ className }: { className?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable="false">
      <rect x="3" y="5" width="18" height="16" rx="3" fill="#ffdda9" stroke="#211434" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="#211434" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 14h2M14 14h2M8 17.5h2" stroke="#211434" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function IconClock({ className }: { className?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable="false">
      <circle cx="12" cy="12" r="9" fill="#c6da91" stroke="#211434" strokeWidth="2" />
      <path d="M12 7v5l3.5 2.5" stroke="#211434" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function IconPin({ className }: { className?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable="false">
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" fill="#e5d1ff" stroke="#211434" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" fill="#fff" stroke="#211434" strokeWidth="1.6" />
    </svg>
  )
}

// الهيرو: هيدلاين كاينتيك من 3 سطور + كوبون تذكرة مايل بعداد و QR حقيقي
export function Hero({
  onCta,
  eventDate,
  venue,
  city,
  sold,
  capacity,
  ctaLabel,
  invited,
}: {
  onCta: () => void
  eventDate: string
  venue: string
  city: string
  sold: number
  capacity: number
  ctaLabel: string
  invited?: boolean
}) {
  const rootRef = useRef<HTMLElement>(null)
  const linesRef = useRef<(HTMLSpanElement | null)[]>([])
  const stubRef = useRef<HTMLDivElement>(null)
  const [qr, setQr] = useState<string | null>(null)

  // QR حقيقي للكوبون — بيوصل على نفس الصفحة عشان يتسجل من موبايله
  useEffect(() => {
    QRCode.toDataURL(window.location.origin + '/', {
      margin: 1,
      width: 240,
      color: { dark: '#211434', light: '#ffffff' },
    })
      .then(setQr)
      .catch(() => setQr(null))
  }, [])

  // إدخال كاينتيك: السطور بتتطلع ورا بعض + الكوبون بيدور على مستويه
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lines = linesRef.current.filter(Boolean) as HTMLSpanElement[]
    if (reduced) {
      gsap.set(lines, { opacity: 1, yPercent: 0 })
      if (stubRef.current) gsap.set(stubRef.current, { opacity: 1, rotation: -4 })
      return
    }
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    lines.forEach((line, i) => {
      tl.fromTo(
        line,
        { yPercent: 110, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.9 },
        i * 0.12
      )
    })
    if (stubRef.current) {
      tl.fromTo(
        stubRef.current,
        { rotation: -12, y: 40, opacity: 0, scale: 0.9 },
        { rotation: -4, y: 0, opacity: 1, scale: 1, duration: 1, ease: 'back.out(1.6)' },
        0.25
      )
      // عوم خفيف مستمر
      tl.to(stubRef.current, { y: -10, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }, '>-0.2')
    }
    return () => tl.kill()
  }, [])

  return (
    <section ref={rootRef} className="relative overflow-hidden" aria-label="اللافتة الرئيسية">
      {/* حقول ملصقات خلفية */}
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-lilac border-[3px] border-ink opacity-70" aria-hidden />
      <div className="absolute top-40 -right-20 h-56 w-56 rounded-full bg-peach border-[3px] border-ink opacity-60" aria-hidden />
      <div className="absolute bottom-10 left-1/3 h-32 w-32 rounded-full bg-lime border-[3px] border-ink opacity-50" aria-hidden />
      <Spark className="absolute top-28 right-1/4 h-10 w-10 text-grape twinkle hidden sm:block" />
      <Spark className="absolute bottom-32 right-10 h-7 w-7 text-peach twinkle-slow hidden sm:block" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20 pb-16 grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-8 items-center">
        {/* عمود الكلام */}
        <div>
          {invited ? (
            <div className="inline-flex items-center gap-2 bg-peach border-[3px] border-ink rounded-xl px-4 py-2 text-sm font-extrabold nb-sm mb-6 -rotate-1">
              <Spark className="h-4 w-4 text-grape" />
              صاحبك دعاك للقمة — سجّل من اللينك ده ومقعدك أقرب
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-cream border-[3px] border-ink rounded-xl px-4 py-2 text-sm font-extrabold nb-sm mb-6 -rotate-1">
              <span className="h-2.5 w-2.5 rounded-full bg-grape soft-pulse" aria-hidden />
              القمة الرسمية لمبادرة Stand Out — مسار
            </div>
          )}

          {/* الهيدلاين الكاينتيك */}
          <h1 className="font-display font-extrabold leading-[0.95] tracking-tight" dir="ltr">
            {['STAND', 'OUT', '2026'].map((word, i) => (
              <span key={word} className="block overflow-hidden pb-1">
                <span
                  ref={(el) => { linesRef.current[i] = el }}
                  className={`inline-block will-change-transform ${i === 1 ? 'text-stroke-ink' : 'text-ink'} ${i === 2 ? 'highlight-lime' : ''}`}
                  style={{ opacity: 0, fontSize: 'clamp(3.2rem, 9vw, 6rem)' }}
                >
                  {word}
                </span>
              </span>
            ))}
          </h1>

          <p className="mt-5 text-lg sm:text-xl font-bold text-ink/90 max-w-xl leading-relaxed">
            القمة اللي بتخليك تفرّق — <span className="highlight-lilac font-extrabold">الدخول مجاني</span>،
            والمقاعد محدودة. سجّل، أكّد مقعدك، وحمّل تذكرتك بـ QR من نفس الصفحة.
          </p>

          {/* الحقائق بأيقونات مرسومة */}
          <ul className="mt-7 space-y-3.5 max-w-xl">
            <li className="flex items-center gap-3">
              <IconCalendar />
              <time dateTime="2026-11-21" className="font-bold">السبت 21 نوفمبر 2026</time>
            </li>
            <li className="flex items-center gap-3">
              <IconClock />
              <span className="font-bold" dir="ltr">10:00 AM – 6:00 PM</span>
            </li>
            <li className="flex items-center gap-3">
              <IconPin />
              <span className="font-bold">
                {venue}
                <small className="block text-muted-foreground font-bold text-xs mt-0.5">28 Falaki Street, Bab El Louk, {city}</small>
              </span>
            </li>
          </ul>

          <p className="mt-6 text-sm font-bold text-muted-foreground">
            <span dir="ltr" className="font-extrabold text-ink">80,000+</span> طالب حضروا فعالياتنا على مدار 11 سنة —
            واتحجز <span dir="ltr" className="font-extrabold text-grape">{sold}</span> من {capacity} الموسم ده.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onCta}
              className="nb-pop bg-lime text-ink nb font-extrabold text-lg rounded-2xl px-8 min-h-[56px] inline-flex items-center justify-center gap-2"
            >
              <Ticket className="h-5 w-5" aria-hidden />
              {ctaLabel}
            </button>
            <button
              onClick={() => document.getElementById('details')?.scrollIntoView({ behavior: 'smooth' })}
              className="nb-pop bg-white text-ink nb font-extrabold text-base rounded-2xl px-6 min-h-[56px] inline-flex items-center justify-center"
            >
              تفاصيل الايفنت
            </button>
          </div>
        </div>

        {/* كوبون التذكرة المايل */}
        <div className="relative flex justify-center lg:justify-start" aria-hidden={false}>
          <div ref={stubRef} className="relative w-full max-w-sm rotate-[-4deg] will-change-transform" style={{ opacity: 0 }}>
            <div className="nb-lg rounded-3xl bg-white overflow-hidden">
              <div className="bg-ink text-cream px-5 py-4 flex items-center justify-between">
                <span className="font-display font-extrabold text-2xl tracking-tight" dir="ltr">
                  SO <span className="text-lime">★</span> 26
                </span>
                <span className="bg-lime text-ink text-[11px] font-extrabold rounded-lg px-2 py-1 border-2 border-cream/80">
                  admission ticket
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between text-sm font-bold border-b-2 border-dashed border-ink/30 pb-3">
                  <span>الموعد</span>
                  <span>السبت 21 نوفمبر 2026</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold border-b-2 border-dashed border-ink/30 py-3">
                  <span>المكان</span>
                  <span dir="ltr">{venue}</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-muted-foreground mb-2">العداد — فاضل على القمة</p>
                    <Countdown target={eventDate} />
                  </div>
                  <div className="shrink-0 bg-white rounded-xl p-1.5 border-[3px] border-ink nb-sm">
                    {qr ? (
                      <img src={qr} alt="امسح الكود وسجّل في القمة" className="h-20 w-20" />
                    ) : (
                      <div className="h-20 w-20 bg-muted" />
                    )}
                  </div>
                </div>
                <p className="mt-3 text-[11px] font-bold text-muted-foreground text-center">
                  امسح الكود من موبايلك وسجّل — مقعدك محسوب من دلوقتي
                </p>
              </div>
              <div className="relative border-t-[3px] border-ink bg-peach/40 px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-extrabold">SEAT #<span dir="ltr">{String(sold + 1).padStart(4, '0')}</span></span>
                <span className="text-xs font-extrabold" dir="ltr">FREE ENTRY</span>
              </div>
            </div>
            <Spark className="absolute -top-5 -left-5 h-10 w-10 text-peach twinkle" />
          </div>
        </div>
      </div>

      <div className="relative z-10 pb-8 flex justify-center">
        <a href="#about" aria-label="انزل تحت" className="text-ink hover:text-grape transition-colors">
          <ChevronDown className="h-7 w-7 animate-bounce" aria-hidden />
        </a>
      </div>
    </section>
  )
}
