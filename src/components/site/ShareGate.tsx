'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Copy, Check, Share2, Users, Coins, Info,
  MessageCircle, Send, Link2, ChevronUp, Crown, Info as InfoIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/client-api'
import type { ReferralsResponse, LeaderboardResponse, EventPayload } from '@/lib/types'
import { toast } from 'sonner'
import { Reveal } from './Reveal'
import { Spark } from './Logo'

// بوابة المشاركة — اللينك بيحسب لما صاحبك يسجّل ويأكد حسابه، مش بس يفتح
export function ShareGate({ origin, event }: { origin: string; event: EventPayload | null }) {
  const [data, setData] = useState<ReferralsResponse | null>(null)
  const [board, setBoard] = useState<{ firstName: string; qualified: number }[]>([])
  const [copied, setCopied] = useState(false)
  const [hideName, setHideName] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api<ReferralsResponse>('/api/referrals')
      setData(r)
      const b = await api<LeaderboardResponse>('/api/leaderboard')
      setBoard(b.leaderboard || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التحميل')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data?.referralCode) return null

  // لينك الدعوة الشخصي — /i/{كود} زي الموقع المرجعي بالظبط
  const link = `${origin}/i/${data.referralCode}`

  // نص المشاركة — من قالب الايفنت اللي الأدمن ظبطه، أو النص الافتراضي المبني على بيانات الايفنت
  const buildShareText = () => {
    const custom = event?.settings?.shareText?.trim()
    if (custom) return custom.replaceAll('{link}', link).replaceAll('{name}', event?.name || '')
    if (event) {
      const dateEn = new Date(event.startsAt).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
      const priceLine = event.priceMinor === 0 ? "It's free." : `Grab your seat for ${(event.priceMinor / 100).toFixed(0)} EGP.`
      return `I'm going to ${event.name} on ${dateEn} at ${event.venue}, ${event.city}. ${priceLine} Come with me:\n${link}`
    }
    return `I'm going to Stand Out Summit 2026 on Saturday, November 21, 2026 at The GrEEK Campus Downtown. It's free. Come with me:\n${link}`
  }
  const msg = buildShareText()
  const qualified = data.points?.qualified || 0
  const balance = data.points?.balance || 0
  const next = data.nextTier
  const progress = next ? Math.min(100, Math.round((qualified / next.minReferrals) * 100)) : 100

  const shareTargets = [
    { label: 'واتساب', icon: MessageCircle, url: `https://wa.me/?text=${encodeURIComponent(msg)}` },
    { label: 'تليجرام', icon: Send, url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}` },
    { label: 'فيسبوك', icon: Share2, url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}` },
    { label: 'X', icon: Link2, url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}` },
  ]

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('اللينك اتنسخ.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('انسخه يدوي من الخانة.')
    }
  }

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Stand Out 2026', text: msg, url: link })
      } catch { /* المستخدم قفل النافذة */ }
    } else {
      copyLink()
    }
  }

  const statusBadge = (s: string) => {
    if (s === 'QUALIFIED') return <span className="bg-lime border-2 border-ink rounded-lg px-2.5 py-1 text-[11px] font-extrabold">مؤهل</span>
    if (s === 'REVIEW') return <span className="bg-peach border-2 border-ink rounded-lg px-2.5 py-1 text-[11px] font-extrabold">تحت المراجعة</span>
    return <span className="bg-muted border-2 border-ink/40 rounded-lg px-2.5 py-1 text-[11px] font-bold text-muted-foreground">بانتظار التسجيل</span>
  }

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 w-full" aria-labelledby="share-title">
      <Reveal>
        <div className="mb-8">
          <span className="inline-block bg-ink text-lime font-serial font-bold text-xs tracking-[0.25em] rounded-lg px-3 py-1.5 mb-4" dir="ltr">
            INVITE & EARN
          </span>
          <h1 id="share-title" className="text-3xl sm:text-4xl font-extrabold">شارك واجمع نقاط</h1>
          <p className="text-sm font-bold text-muted-foreground mt-3 max-w-2xl leading-relaxed flex items-start gap-2">
            <Info className="h-4 w-4 text-grape mt-0.5 shrink-0" aria-hidden />
            <span>
              كل صديق بيفتح اللينك <span className="text-ink font-extrabold">مجرد نزلة مش بيتحسب</span>. النقاط بتتحسب
              لما يسجّل حساب جديد ويأكد رقمه من نفس اللينك — أول لينك ليه بس.
            </span>
          </p>
        </div>
      </Reveal>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Reveal>
          <div className="bg-lilac nb nb-pop rounded-3xl p-6 flex items-center gap-4">
            <span className="h-12 w-12 rounded-xl border-[3px] border-ink bg-white flex items-center justify-center shrink-0">
              <Coins className="h-6 w-6 text-grape" aria-hidden />
            </span>
            <div>
              <p className="text-3xl font-extrabold" dir="ltr">{balance}</p>
              <p className="text-sm font-bold text-ink/70">نقطة في رصيدك</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="bg-lime nb nb-pop rounded-3xl p-6 flex items-center gap-4">
            <span className="h-12 w-12 rounded-xl border-[3px] border-ink bg-white flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 text-ink" aria-hidden />
            </span>
            <div>
              <p className="text-3xl font-extrabold" dir="ltr">{qualified}</p>
              <p className="text-sm font-bold text-ink/70">صديق مؤهل</p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* اللينك */}
      <Reveal delay={0.05}>
        <div className="bg-white nb rounded-3xl p-6 space-y-4 mb-6">
          <p className="font-extrabold text-sm">كود دعوتك الشخصي</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div dir="ltr" className="flex-1 rounded-xl bg-lilac/40 border-[2.5px] border-ink px-4 py-3 font-serial text-sm truncate">
              {link}
            </div>
            <Button
              onClick={copyLink}
              className="gap-1.5 shrink-0 min-h-[48px] font-extrabold rounded-xl border-[3px] border-ink bg-lime text-ink shadow-[3px_3px_0_0_var(--ink)] hover:bg-lime/90"
            >
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? 'تم النسخ' : 'نسخ اللينك'}
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {shareTargets.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border-[2.5px] border-ink bg-white py-3 flex items-center justify-center gap-1.5 text-xs font-extrabold hover:bg-peach/40 transition-colors min-h-[44px]"
              >
                <s.icon className="h-4 w-4" aria-hidden />
                {s.label}
              </a>
            ))}
            <button
              onClick={nativeShare}
              className="rounded-xl border-[2.5px] border-ink bg-grape text-cream py-3 flex items-center justify-center gap-1.5 text-xs font-extrabold hover:bg-grape/90 transition-colors sm:col-span-2 min-h-[44px]"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              مشاركة مباشرة (الموبايل)
            </button>
          </div>
        </div>
      </Reveal>

      {/* التقدم نحو المستوى الجاي */}
      {next && (
        <Reveal delay={0.1}>
          <div className="bg-peach/50 border-[3px] border-ink rounded-3xl p-6 space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-extrabold">
                <ChevronUp className="h-4 w-4 text-grape" aria-hidden />
                المستوى الجاي: {next.minReferrals} صديق مؤهل
              </span>
              <span className="text-grape font-extrabold">+{next.points} نقاط</span>
            </div>
            <div className="[&>[data-slot=progress-track]]:bg-white [&>[data-slot=progress-track]]:border-2 [&>[data-slot=progress-track]]:border-ink [&>[data-slot=progress-indicator]]:bg-grape">
              <Progress value={progress} className="h-3.5" />
            </div>
            <p className="text-xs font-bold text-muted-foreground">فاضلك {next.remaining} إحالة مؤهلة على المستوى الجاي.</p>
          </div>
        </Reveal>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* الأصدقاء */}
        <Reveal>
          <div className="bg-white nb rounded-3xl p-6 h-full">
            <div className="flex items-center justify-between mb-4 gap-2">
              <p className="font-extrabold text-sm">اللي دعوتهم ({data.referrals?.length || 0})</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground">{hideName ? 'الاسم مخفي' : 'الاسم ظاهر'}</span>
                <Switch
                  checked={hideName}
                  onCheckedChange={async (v) => {
                    setHideName(v)
                    await api('/api/referrals', { method: 'PATCH', body: { hideName: v } })
                    toast.success(v ? 'اسمك اتخفي من الليدربورد.' : 'اسمك رجع يظهر.')
                  }}
                  aria-label="إخفاء الاسم في الليدربورد"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto nice-scroll">
              {(data.referrals?.length || 0) === 0 ? (
                <p className="text-sm font-bold text-muted-foreground py-6 text-center">
                  لسه مفيش حد دعوته — ابدأ بمشاركة اللينك مع أقرب الناس.
                </p>
              ) : (
                data.referrals!.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl bg-lilac/40 border-2 border-ink/50 px-4 py-2.5">
                    <span className="text-sm font-bold">{r.firstName}</span>
                    {statusBadge(r.status)}
                  </div>
                ))
              )}
            </div>
          </div>
        </Reveal>

        {/* الليدربورد */}
        <Reveal delay={0.08}>
          <div className="bg-white nb rounded-3xl p-6 h-full">
            <p className="font-extrabold text-sm mb-4 flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-grape" aria-hidden />
              أعلى الداعين
            </p>
            {board.length === 0 ? (
              <p className="text-sm font-bold text-muted-foreground py-6 text-center">الليدربورد لسه بيتشكل — كون أنت الأول.</p>
            ) : (
              <ol className="space-y-2">
                {board.map((r, i) => (
                  <li key={`${r.firstName}-${i}`} className="flex items-center justify-between rounded-xl bg-lilac/40 border-2 border-ink/50 px-4 py-2.5">
                    <span className="flex items-center gap-3">
                      <span dir="ltr" className={`font-serial text-xs ${i < 3 ? 'text-grape font-bold' : 'text-muted-foreground'}`}>
                        #{i + 1}
                      </span>
                      <span className="text-sm font-bold">{r.firstName}</span>
                    </span>
                    <span dir="ltr" className="text-sm font-extrabold text-grape">{r.qualified}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Reveal>
      </div>

      {/* حركات النقاط */}
      {(data.ledger?.length || 0) > 0 && (
        <Reveal delay={0.05}>
          <div className="bg-white nb rounded-3xl mt-4 p-6">
            <p className="font-extrabold text-sm mb-4 flex items-center gap-1.5">
              <InfoIcon className="h-4 w-4 text-grape" aria-hidden />
              دفتر نقاطك
            </p>
            <ul className="space-y-2">
              {data.ledger!.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-xl bg-muted/60 border-2 border-ink/30 px-4 py-2.5 text-sm">
                  <span className="font-bold text-muted-foreground">{l.note || l.reason}</span>
                  <span className={`font-extrabold ${l.delta > 0 ? 'text-grape' : 'text-muted-foreground'}`} dir="ltr">
                    {l.delta > 0 ? '+' : ''}{l.delta}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}

      <p className="mt-6 text-center text-xs font-bold text-muted-foreground flex items-center justify-center gap-1.5">
        <Spark className="h-3.5 w-3.5 text-grape twinkle-slow" />
        النقاط بتتراجع لو طلع أي إحالة مزورة — العدل هو اللي بيخلي الجوائز حقيقية
      </p>
    </section>
  )
}
