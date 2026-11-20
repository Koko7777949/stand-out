'use client'

import { LogOut, Ticket, Share2, Gift, Lock, ChevronLeft, Wallet, TimerReset, Coins, ShieldUser } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Countdown } from './Countdown'
import { Reveal } from './Reveal'
import type { MeResponse } from '@/lib/types'
import { egp } from '@/lib/types'

// لوحة البوابات — كل خطوة لحد ما توصل لتذكرتك
export function Dashboard({
  me,
  isAdmin,
  onNavigate,
  onLogout,
}: {
  me: MeResponse
  isAdmin: boolean
  onNavigate: (v: 'book' | 'pay' | 'ticket' | 'share' | 'rewards' | 'admin') => void
  onLogout: () => void
}) {
  const user = me.user!
  const ticket = me.ticket || null
  const issued = ticket?.status === 'ISSUED'
  const held = ticket?.status === 'HELD' && ticket.orderStatus === 'HELD'
  const reviewing = ticket?.status === 'HELD' && ticket.orderStatus === 'PENDING'

  const ticketCta = () => {
    if (issued) onNavigate('ticket')
    else if (reviewing && ticket) onNavigate('ticket')
    else if (held && ticket) onNavigate('pay')
    else onNavigate('book')
  }

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24 w-full" aria-labelledby="dash-title">
      <Reveal>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <span className="inline-block bg-ink text-lime font-serial font-bold text-xs tracking-[0.25em] rounded-lg px-3 py-1.5 mb-4" dir="ltr">
              YOUR GATE
            </span>
            <h1 id="dash-title" className="text-3xl sm:text-4xl font-extrabold">
              أهلاً {user.name ? user.name.split(' ')[0] : 'بيك'}
            </h1>
            <p className="text-muted-foreground text-sm font-bold mt-2 flex items-center gap-1.5 flex-wrap">
              <Coins className="h-4 w-4 text-grape" aria-hidden />
              رصيدك: <span className="text-grape font-extrabold" dir="ltr">{me.points?.balance ?? 0}</span> نقطة
              {' · '}
              الإحالات المؤهلة: <span className="text-ink font-extrabold" dir="ltr">{me.points?.qualified ?? 0}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => onNavigate('admin')}
                className="gap-1.5 font-extrabold bg-ink text-lime rounded-xl border-[2.5px] border-ink min-h-[44px] hover:bg-ink/90"
              >
                <ShieldUser className="h-4 w-4" aria-hidden /> لوحة التحكم
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="gap-1.5 font-bold border-[2.5px] border-ink rounded-xl bg-white hover:bg-peach/40"
            >
              <LogOut className="h-4 w-4" aria-hidden /> خروج
            </Button>
          </div>
        </div>
      </Reveal>

      <div className="grid md:grid-cols-3 gap-4">
        {/* كارت التذكرة */}
        <Reveal className={issued ? 'md:col-span-2' : 'md:col-span-2'}>
          <button
            onClick={ticketCta}
            className="w-full text-right bg-white nb nb-pop rounded-3xl p-6 flex flex-col gap-4 h-full cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="h-11 w-11 rounded-xl border-[3px] border-ink bg-lilac flex items-center justify-center">
                <Ticket className="h-6 w-6 text-ink" aria-hidden />
              </span>
              {issued ? (
                <span className="bg-lime text-ink text-xs font-extrabold rounded-lg px-3 py-1.5 border-2 border-ink">تذكرتك صالحة</span>
              ) : reviewing ? (
                <span className="bg-lilac text-ink text-xs font-extrabold rounded-lg px-3 py-1.5 border-2 border-ink">الدفع تحت المراجعة</span>
              ) : held ? (
                <span className="bg-peach text-ink text-xs font-extrabold rounded-lg px-3 py-1.5 border-2 border-ink">محجوزة — بانتظار الدفع</span>
              ) : (
                <span className="bg-muted text-ink/60 text-xs font-extrabold rounded-lg px-3 py-1.5 border-2 border-ink/40">مفيش تذكرة</span>
              )}
            </div>
            <div>
              <h2 className="font-extrabold text-xl mb-1">
                {issued ? 'تذكرتك جاهزة' : reviewing ? 'الدفع تحت المراجعة' : held ? 'كمّل دفع مقعدك' : 'احجز مقعدك'}
              </h2>
              <p className="text-sm font-bold text-muted-foreground leading-relaxed">
                {issued
                  ? 'التذكرة بالـ QR جاهزة — حمّلها PDF أو صورة وقدمها عند البوابة.'
                  : reviewing
                    ? 'استلمنا تأكيدك — الفريق بيراجع التحويل، والتذكرة بتتفعل أول ما يتأكد الدفع.'
                    : held
                      ? 'مقعدك محجوز باسمك لحد ما تخلص الدفع — الوقت بيعد.'
                      : 'سجّل بياناتك في دقيقة واحجز مقعدك المضمون في القمة.'}
              </p>
            </div>
            {held && ticket?.holdExpiresAt && (
              <div className="rounded-xl bg-lilac/60 border-2 border-ink px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-extrabold text-ink/70">الاحتفاظ بينتهي بعد</span>
                <Countdown target={ticket.holdExpiresAt} compact />
              </div>
            )}
            <div className="mt-auto flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-grape">
                {issued ? 'افتح تذكرتك' : reviewing ? 'تابع حالة الدفع' : held ? 'ادفع الآن' : 'ابدأ الحجز'}
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </span>
              {held && (
                <span
                  onClick={(e) => { e.stopPropagation(); onNavigate('ticket') }}
                  className="text-xs font-bold text-muted-foreground hover:text-ink underline underline-offset-4 cursor-pointer"
                >
                  معاينة التذكرة (مقفولة)
                </span>
              )}
            </div>
          </button>
        </Reveal>

        {/* كارت المشاركة */}
        <Reveal delay={0.08}>
          <button
            onClick={() => issued && onNavigate('share')}
            className={`w-full text-right bg-lime nb nb-pop rounded-3xl p-6 flex flex-col gap-4 h-full ${issued ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
            aria-disabled={!issued}
          >
            <div className="flex items-center justify-between">
              <span className="h-11 w-11 rounded-xl border-[3px] border-ink bg-white flex items-center justify-center">
                <Share2 className="h-6 w-6 text-ink" aria-hidden />
              </span>
              {!issued && <Lock className="h-4 w-4 text-ink/50" aria-hidden />}
            </div>
            <div>
              <h2 className="font-extrabold text-lg mb-1">بوابة المشاركة</h2>
              <p className="text-sm font-bold text-ink/75 leading-relaxed">
                {issued
                  ? 'شارك كود دعوتك — كل صديق مؤهل = نقاط ليك.'
                  : 'بوابة المشاركة بتفتح بعد ما تخلص الدفع وتذكرتك تتأكد.'}
              </p>
            </div>
            {issued && (
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-extrabold">
                شارك واجمع نقاط
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </span>
            )}
          </button>
        </Reveal>

        {/* كارت الاستبدال */}
        <Reveal delay={0.16}>
          <button
            onClick={() => issued && onNavigate('rewards')}
            className={`w-full text-right bg-peach nb nb-pop rounded-3xl p-6 flex flex-col gap-4 h-full ${issued ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
            aria-disabled={!issued}
          >
            <div className="flex items-center justify-between">
              <span className="h-11 w-11 rounded-xl border-[3px] border-ink bg-white flex items-center justify-center">
                <Gift className="h-6 w-6 text-ink" aria-hidden />
              </span>
              {!issued && <Lock className="h-4 w-4 text-ink/50" aria-hidden />}
            </div>
            <div>
              <h2 className="font-extrabold text-lg mb-1">استبدال النقاط</h2>
              <p className="text-sm font-bold text-ink/75 leading-relaxed">
                {issued
                  ? `معاك ${me.points?.balance ?? 0} نقطة — شوف الجوائز المتاحة دلوقتي.`
                  : 'جدول الجوائز بيفتح بعد تأكيد الدفع.'}
              </p>
            </div>
            {issued && (
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-extrabold">
                افتح جدول الجوائز
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </span>
            )}
          </button>
        </Reveal>

        {/* كارت ملخص الدفع */}
        {ticket && (
          <Reveal delay={0.2} className="md:col-span-3">
            <div className="bg-lilac/50 border-[3px] border-ink rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-sm font-bold">
                <Wallet className="h-4 w-4 text-grape" aria-hidden />
                <span className="text-muted-foreground">{issued ? 'تم الدفع' : 'قيمة تأكيد الحجز'}:</span>
                <span className="font-extrabold">{egp(ticket.amountMinor)}</span>
              </div>
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <TimerReset className="h-3.5 w-3.5" aria-hidden />
                العملية محمية وبتتراجع تلقائي — أي حالة مفتوحة بتتقفل لوحدها.
              </span>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
