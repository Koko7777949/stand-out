'use client'

import { useCallback, useEffect, useState } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// تسجيل مرة واحدة عند التحميل
gsap.registerPlugin(ScrollTrigger)
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Navbar } from '@/components/site/Navbar'
import { Footer } from '@/components/site/Footer'
import { Hero } from '@/components/site/Hero'
import { Marquee } from '@/components/site/Marquee'
import { AboutSection, DetailsSection, StepsSection, PointsSection, FaqSection } from '@/components/site/Sections'
import { AuthGate } from '@/components/site/AuthGate'
import { Dashboard } from '@/components/site/Dashboard'
import { BookingForm } from '@/components/site/BookingForm'
import { PaymentGate } from '@/components/site/PaymentGate'
import { TicketView } from '@/components/site/TicketView'
import { ShareGate } from '@/components/site/ShareGate'
import { RewardsView } from '@/components/site/RewardsView'
import { AdminPanel } from '@/components/site/AdminPanel'
import { api } from '@/lib/client-api'
import type { MeResponse, EventResponse } from '@/lib/types'
import { toast } from 'sonner'

type View = 'landing' | 'auth' | 'dashboard' | 'book' | 'pay' | 'ticket' | 'share' | 'rewards' | 'admin'

const DOCS = {
  privacy: {
    title: 'سياسة الخصوصية',
    body: [
      'بنجمع أقل بيانات ممكنة: الاسم، السن، المحافظة، ورقم الموبايل المتحقق منه — ودي البيانات اللي بتظهر على تذكرتك.',
      'بيانات الدفع عمرها ما بتتخزن عننا: بيانات الكارت والمحافظ بتتوصل مباشرة لمزود الدفع المؤمّن.',
      'عناوين IP بتتخزن كـ hash مشفر للحد من التلاعب في الإحالات، ومش مرتبطة بشخصك.',
      'بياناتك بتتمسح أو تتفصل بعد فترة معقولة من انتهاء الايفنت، وحقك في طلب حذف حسابك متوفر عبر التواصل مع الفريق.',
    ],
  },
  terms: {
    title: 'الشروط والأحكام',
    body: [
      'التذكرة شخصية ومرتبطة بحسابك وبياناتك — ممنوع بيعها أو تحويلها، وأي محاولة استخدام متكرر بتتحظر.',
      'تذكرة واحدة لكل حساب — الحسابات المكررة للنفس الشخص بتتعامل كإحالة مزورة وبتتقفل.',
      'النقاط بتتحسب بس لما صاحبك يسجّل حساب جديد ويأكد رقمه من كود دعوتك — والمبادرة محتفظة بحق مراجعة وإلغاء أي إحالة مشبوهة.',
      'المبادرة محتفظة بحق تعديل البرنامج أو المكان لأسباب قهرية مع إشعار مسبق.',
    ],
  },
  refund: {
    title: 'سياسة الاسترجاع',
    body: [
      'مبلغ تأكيد الحجز بيترد كامل في حالة إلغاء الايفنت من التنظيم، لنفس وسيلة الدفع، خلال أيام عمل قليلة.',
      'في حالة عدم حضورك، المبلغ مش بيترد — المقعد المضمون بيتم الاحتفاظ بلفة كاملة لصالحك.',
      'أي حالة استثنائية بتتدرس من الدعم قبل 3 أيام من الايفنت عبر باب التواصل.',
    ],
  },
}

export function StandOutApp() {
  const [view, setView] = useState<View>('landing')
  const [me, setMe] = useState<MeResponse | null>(null)
  const [event, setEvent] = useState<EventResponse['event']>(null)
  const [stats, setStats] = useState<EventResponse['stats']>(undefined)
  const [refCode, setRefCode] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [docOpen, setDocOpen] = useState<'privacy' | 'terms' | 'refund' | null>(null)
  const [booted, setBooted] = useState(false)

  // ---- تثبيت GSAP + Lenis ----
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let lenis: Lenis | null = null
    if (!reduced) {
      lenis = new Lenis({
        autoRaf: true,
        duration: 1.05,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      })
      lenis.on('scroll', ScrollTrigger.update)
    }
    return () => lenis?.destroy()
  }, [])

  // ---- التقاط كود الدعوة (first-touch) — من ?ref= أو من لينك /i/{code} ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pathRef = window.location.pathname.match(/^\/i\/([A-Za-z0-9]{4,16})\/?$/i)?.[1]?.toUpperCase()
    const ref = params.get('ref')?.toUpperCase() || pathRef || null
    if (ref && /^[A-Z0-9]{4,16}$/.test(ref)) {
      localStorage.setItem('sou_ref', ref.toUpperCase())
      document.cookie = `sou_ref=${ref.toUpperCase()}; max-age=2592000; path=/; samesite=lax`
      setRefCode(ref.toUpperCase())
      api('/api/referral-click', { body: { code: ref } }).catch(() => {})
    } else {
      const stored = localStorage.getItem('sou_ref') || document.cookie.match(/sou_ref=([A-Z0-9]{4,16})/i)?.[1]
      if (stored) setRefCode(stored.toUpperCase())
    }
  }, [])

  // ---- جلسة المستخدم + بيانات الايفنت ----
  const refreshMe = useCallback(async () => {
    try {
      const r = await api<MeResponse>('/api/me')
      setMe(r.ok ? r : null)
    } catch {
      setMe(null)
    }
  }, [])

  useEffect(() => {
    refreshMe()
    api<EventResponse>('/api/event')
      .then((r) => {
        setEvent(r.event)
        setStats(r.stats)
      })
      .catch(() => {})
      .finally(() => setBooted(true))
  }, [refreshMe])

  // ---- التنقل ----
  const navigate = useCallback((v: View) => {
    setView(v)
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      ScrollTrigger.refresh()
    })
  }, [])

  const onCta = useCallback(() => {
    if (me?.ok) navigate('dashboard')
    else navigate('auth')
  }, [me, navigate])

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } catch { /* ignore */ }
    setMe(null)
    setOrderId(null)
    navigate('landing')
    toast.success('خرجت من حسابك.')
  }, [navigate])

  const heroCtaLabel = me?.ok ? (me.ticket?.status === 'ISSUED' ? 'تذكرتك جاهزة' : me.ticket ? 'كمّل الدفع' : 'احجز مقعدك') : 'احجز مقعدك'
  const isAdmin = !!me?.ok && ['admin', 'super_admin'].includes(me.user?.role || '')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="grain-layer" aria-hidden />
        <Navbar onCta={onCta} authenticated={!!me?.ok} eventDate={event?.startsAt || '2026-11-21T09:00:00+02:00'} />

        <main className="flex-1 w-full">
          {view === 'landing' && (
            <>
              <Hero
                onCta={onCta}
                eventDate={event?.startsAt || '2026-11-21T09:00:00+02:00'}
                venue={event?.venue || 'The GrEEK Campus'}
                city={event?.city || 'وسط البلد، القاهرة'}
                sold={stats?.sold ?? 0}
                capacity={event?.capacity || 500}
                ctaLabel={heroCtaLabel}
                invited={!!refCode}
              />
              <Marquee />
              <AboutSection qualified={stats?.qualifiedReferrals ?? 0} />
              <DetailsSection event={event} />
              <StepsSection />
              <PointsSection onCta={onCta} authenticated={!!me?.ok} />
              <FaqSection />
            </>
          )}

          {view === 'auth' && (
            <AuthGate
              refCode={refCode}
              onAuthed={async () => {
                await refreshMe()
                navigate('dashboard')
              }}
            />
          )}

          {view === 'dashboard' && me?.ok && (
            <Dashboard
              me={me}
              isAdmin={isAdmin}
              onNavigate={(v) => navigate(v as View)}
              onLogout={logout}
            />
          )}

          {view === 'book' && me?.ok && (
            <BookingForm
              me={me}
              event={event}
              onRefreshMe={refreshMe}
              onHoldCreated={(id, paid) => {
                setOrderId(id)
                if (paid) {
                  navigate('ticket')
                } else {
                  navigate('pay')
                }
              }}
            />
          )}

          {view === 'pay' && me?.ok && (orderId || me.ticket?.orderId) && (
            <PaymentGate
              orderId={(orderId || me.ticket!.orderId)!}
              onPaid={async () => {
                await refreshMe()
                navigate('ticket')
              }}
              onExpired={async () => {
                await refreshMe()
                navigate('dashboard')
              }}
            />
          )}

          {view === 'ticket' && me?.ok && (
            <TicketView
              me={me}
              onShare={() => navigate('share')}
              onRewards={() => navigate('rewards')}
            />
          )}

          {view === 'share' && me?.ok && <ShareGate origin={typeof window !== 'undefined' ? window.location.origin : ''} event={event} />}

          {view === 'rewards' && me?.ok && <RewardsView />}

          {view === 'admin' && me?.ok && isAdmin && <AdminPanel isSuper={me.user?.role === 'super_admin'} />}
        </main>

        <Footer onOpenDoc={(d) => setDocOpen(d)} />

        {/* نافذة الوثائق */}
        <Dialog open={!!docOpen} onOpenChange={(v) => !v && setDocOpen(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto nice-scroll bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">{docOpen && DOCS[docOpen].title}</DialogTitle>
            </DialogHeader>
            <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              {docOpen && DOCS[docOpen].body.map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0">·</span>{p}
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>

        {/* شاشة تحميل أول تشغيل */}
        {!booted && view === 'landing' && (
          <div className="fixed inset-0 z-[80] bg-background flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <span className="font-display font-extrabold text-5xl inline-flex items-center gap-2" dir="ltr">
                <span className="bg-ink text-cream px-2.5 py-1 rounded-xl border-[3px] border-ink">SO</span>
                <span className="text-ink">26</span>
              </span>
              <span className="text-xs font-bold text-muted-foreground soft-pulse">بنجهز ورقة الستيكرز...</span>
            </div>
          </div>
        )}
    </div>
  )
}
