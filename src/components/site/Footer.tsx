'use client'

import { Spark } from './Logo'

// فوتر بلون الحبر — بيلزق تحت لما الصفحة قصيرة (mt-auto في الابن الأب)
export function Footer({ onOpenDoc }: { onOpenDoc: (d: 'privacy' | 'terms' | 'refund') => void }) {
  return (
    <footer className="mt-auto bg-ink text-cream border-t-[3px] border-ink" role="contentinfo">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 font-display font-extrabold text-2xl tracking-tight" dir="ltr">
              <span className="bg-lime text-ink px-2 py-0.5 rounded-lg border-2 border-cream/90">SO</span>
              <span className="text-cream">26</span>
            </span>
            <p className="mt-2 text-sm font-bold text-cream/70">
              Stand Out Summit 2026 — السبت 21 نوفمبر، The GrEEK Campus وسط البلد.
            </p>
            <p className="mt-1 text-xs font-bold text-cream/50 flex items-center gap-1.5">
              من مبادرة Stand Out — مسار
              <Spark className="h-3.5 w-3.5 text-lime" />
            </p>
          </div>

          <nav aria-label="سياسات المنصة" className="flex flex-wrap gap-2">
            <button
              onClick={() => onOpenDoc('privacy')}
              className="text-xs font-bold rounded-lg px-3 py-2 border-2 border-cream/30 text-cream/80 hover:text-lime hover:border-lime transition-colors min-h-[40px]"
            >
              سياسة الخصوصية
            </button>
            <button
              onClick={() => onOpenDoc('terms')}
              className="text-xs font-bold rounded-lg px-3 py-2 border-2 border-cream/30 text-cream/80 hover:text-lime hover:border-lime transition-colors min-h-[40px]"
            >
              الشروط والأحكام
            </button>
            <button
              onClick={() => onOpenDoc('refund')}
              className="text-xs font-bold rounded-lg px-3 py-2 border-2 border-cream/30 text-cream/80 hover:text-lime hover:border-lime transition-colors min-h-[40px]"
            >
              سياسة الاسترجاع
            </button>
          </nav>
        </div>

        <div className="mt-8 pt-5 border-t-2 border-cream/15 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold text-cream/50">
            © 2026 Stand Out Summit — كل الحقوق محفوظة للمنظّمين.
          </p>
          <p className="text-xs font-bold text-cream/50" dir="ltr">
            Made with care in Cairo
          </p>
        </div>
      </div>
    </footer>
  )
}
