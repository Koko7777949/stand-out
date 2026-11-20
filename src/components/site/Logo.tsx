'use client'

import { cn } from '@/lib/utils'

// لوجو ستيكر — SO ★ 2026 بخط بريكولاج العريض
export function Logo({ size = 'sm', stacked = false }: { size?: 'sm' | 'lg' | 'xl'; stacked?: boolean }) {
  const big = size === 'xl'
  const large = size === 'lg'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-display font-extrabold tracking-tight leading-none select-none',
        big ? 'text-5xl sm:text-7xl' : large ? 'text-4xl' : 'text-2xl',
        stacked && 'flex-col gap-1'
      )}
      dir="ltr"
      aria-label="Stand Out 2026"
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="bg-ink text-cream px-2 py-0.5 rounded-lg nb-sm nb-none" style={{ boxShadow: '3px 3px 0 0 var(--ink)' }}>SO</span>
        <Spark className={cn(big ? 'h-9 w-9' : large ? 'h-7 w-7' : 'h-5 w-5', 'text-grape twinkle')} />
        <span className="text-ink">{big ? '26' : '2026'}</span>
      </span>
      {stacked && (
        <span className={cn('font-cairo font-bold text-muted-foreground tracking-wide', big ? 'text-sm sm:text-base' : 'text-xs')}>
          STAND OUT SUMMIT
        </span>
      )}
    </span>
  )
}

// نجمة مرسومة بإيد — عنصر الهوية المتكرر
export function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable="false">
      <path
        d="M12 1.5c.9 5.4 2.4 7.6 4.6 8.9 1.6.9 3.6 1.3 5.9 1.6-5.4.9-7.6 2.4-8.9 4.6-.9 1.6-1.3 3.6-1.6 5.9-.9-5.4-2.4-7.6-4.6-8.9C5.8 12.7 3.8 12.3 1.5 12c5.4-.9 7.6-2.4 8.9-4.6.9-1.6 1.3-3.6 1.6-5.9Z"
        fill="currentColor"
        stroke="#211434"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
