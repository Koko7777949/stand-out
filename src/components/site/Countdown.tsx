'use client'

import { useEffect, useState } from 'react'

function diff(target: string) {
  const t = new Date(target).getTime() - Date.now()
  const clamped = Math.max(0, t)
  return {
    d: Math.floor(clamped / 86400000),
    h: Math.floor((clamped % 86400000) / 3600000),
    m: Math.floor((clamped % 3600000) / 60000),
    s: Math.floor((clamped % 60000) / 1000),
  }
}

// عداد تنازلي في مربعات ستيكر — بوكسات حبر بأرقام مونو
// قيم البداية ثابتة على السيرفر والكليينت — الحساب الحقيقي بيحصل بعد الـ mount
// (عشان نتجنب hydration mismatch مع Date.now())
export function Countdown({ target, compact = false }: { target: string; compact?: boolean }) {
  const [t, setT] = useState(() => ({ d: 0, h: 0, m: 0, s: 0 }))

  useEffect(() => {
    setT(diff(target))
    const iv = setInterval(() => setT(diff(target)), 1000)
    return () => clearInterval(iv)
  }, [target])

  const cells = [
    { v: t.d, l: 'يوم' },
    { v: t.h, l: 'ساعة' },
    { v: t.m, l: 'دقيقة' },
    { v: t.s, l: 'ثانية' },
  ]

  if (compact) {
    return (
      <span dir="ltr" className="inline-flex items-center gap-1 font-serial font-bold text-sm">
        {cells.slice(0, 3).map((c, i) => (
          <span key={c.l} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground">:</span>}
            <span>{String(c.v).padStart(2, '0')}</span>
          </span>
        ))}
      </span>
    )
  }

  return (
    <div dir="ltr" className="flex items-stretch gap-2 sm:gap-3" role="timer" aria-label="الوقت المتبقي للقمة">
      {cells.map((c) => (
        <div key={c.l} className="count-chip px-3 sm:px-4 py-2 flex flex-col items-center min-w-[64px] sm:min-w-[76px]">
          <span className="font-serial font-bold text-2xl sm:text-3xl text-ink leading-none">
            {String(c.v).padStart(2, '0')}
          </span>
          <span className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1">{c.l}</span>
        </div>
      ))}
    </div>
  )
}
