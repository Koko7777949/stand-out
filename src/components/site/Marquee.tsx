'use client'

import { Spark } from './Logo'

const ITEMS = [
  'STAND OUT',
  '21 NOV 2026',
  'THE GREEK CAMPUS',
  'الدخول مجاني',
  'المقاعد محدودة',
  'احجز مقعدك',
]

// شريط متحرك بلون الحبر — نص كريمي ونجامات ليموني
export function Marquee() {
  const strip = (
    <>
      {ITEMS.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-4 sm:gap-6 px-4 sm:px-6">
          <span
            className={`font-display font-bold tracking-wide whitespace-nowrap text-xl sm:text-2xl ${
              i % 2 === 0 ? 'text-lime' : 'text-cream'
            }`}
            dir={/[\u0600-\u06FF]/.test(item) ? 'rtl' : 'ltr'}
          >
            {item}
          </span>
          <Spark className="h-5 w-5 text-peach twinkle-slow shrink-0" />
        </span>
      ))}
    </>
  )

  return (
    <div
      className="relative bg-ink border-y-[3px] border-ink py-3.5 overflow-hidden"
      role="marquee"
      aria-label="شريط متحرك بمعلومات القمة"
    >
      <div className="marquee-track">
        <div className="flex items-center shrink-0">{strip}</div>
        <div className="flex items-center shrink-0" aria-hidden>{strip}</div>
        <div className="flex items-center shrink-0" aria-hidden>{strip}</div>
      </div>
    </div>
  )
}
