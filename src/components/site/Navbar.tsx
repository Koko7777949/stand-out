'use client'

import { useEffect, useState } from 'react'
import { Menu, X, LogIn } from 'lucide-react'
import { Logo } from './Logo'
import { Countdown } from './Countdown'

const LINKS = [
  { id: 'about', label: 'عن القمة' },
  { id: 'details', label: 'التفاصيل' },
  { id: 'steps', label: 'ازاي تحجز' },
  { id: 'points', label: 'النقاط' },
  { id: 'faq', label: 'أسئلة شائعة' },
]

// هيدر ستيكي بلون الحبر — لوجو، عداد مصغر، و CTA ليموني
export function Navbar({
  onCta,
  authenticated,
  eventDate,
}: {
  onCta: () => void
  authenticated: boolean
  eventDate: string
}) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (id: string) => {
    setOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header className="sticky top-0 inset-x-0 z-50 bg-ink text-cream border-b-[3px] border-ink">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Stand Out 2026 — لأعلى الصفحة"
          className="shrink-0"
        >
          <span className="inline-flex items-center gap-2 font-display font-extrabold text-2xl tracking-tight leading-none" dir="ltr">
            <span className="bg-lime text-ink px-2 py-0.5 rounded-lg border-2 border-cream/90">SO</span>
            <span className="text-cream">26</span>
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-5" aria-label="التنقل الرئيسي">
          {LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className="text-sm font-bold text-cream/80 hover:text-lime transition-colors"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <span className="hidden lg:block text-xs font-bold text-cream/60 -translate-x-1" dir="ltr">
            <span className="font-serial text-lime"><Countdown target={eventDate} compact /></span>
          </span>
          <button
            onClick={onCta}
            className="nb-pop bg-lime text-ink font-extrabold text-sm rounded-xl px-4 py-2.5 min-h-[44px] border-[3px] border-cream/90 inline-flex items-center gap-1.5"
          >
            {authenticated ? (
              'بوابتك'
            ) : (
              <>
                <LogIn className="h-4 w-4" aria-hidden />
                احجز مجانًا
              </>
            )}
          </button>
          <button
            className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-xl border-2 border-cream/60 text-cream"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'إغلاق القايمة' : 'فتح القايمة'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-ink border-t-2 border-cream/20">
          <nav className="px-4 py-3 flex flex-col gap-1" aria-label="تنقل الموبايل">
            {LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className="text-right text-sm font-bold py-3 px-3 rounded-lg text-cream/80 hover:text-lime hover:bg-cream/10 transition-colors"
              >
                {l.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
