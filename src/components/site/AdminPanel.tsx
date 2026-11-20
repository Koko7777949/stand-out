'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  LayoutDashboard, Wallet, CalendarPlus, Landmark, Users, ShieldUser,
  Gift, Settings2, Loader2, RefreshCw, Check, X, Power, Trash2, Pencil,
  Search, Plus, Send, Ban, Coins, ShieldAlert, Eye, Copy, CheckCircle2, KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/client-api'
import { egp } from '@/lib/types'
import { toast } from 'sonner'
import { Reveal } from './Reveal'

// ---------- أنواع البيانات ----------
type Overview = {
  stats: {
    users: number; banned: number; admins: number; ticketsIssued: number; ticketsHeld: number
    ordersPaid: number; revenueMinor: number; pendingPayments: number; reviewReferrals: number
    qualifiedReferrals: number; pendingRedemptions: number
  }
  activeEvent: { name: string; slug: string; soldCount: number; capacity: number } | null
  audit: { id: string; action: string; entity: string; detail?: string; createdAt: string }[]
}
type AdminEvent = {
  id: string; slug: string; name: string; startsAt: string; venue: string; city: string
  active: boolean; capacity: number; heldCount: number; soldCount: number; priceMinor: number
  holdMinutes: number; bookingOpensAt: string; bookingClosesAt: string
  ageMin: number; ageMax: number; settings: Record<string, string>
}
type Account = {
  id: string; method: string; label: string; accountName: string; accountNumber: string
  instructions?: string | null; active: boolean; sortOrder: number
}
type PaymentRow = {
  id: string; method: string; amountMinor: number; reference: string; providerRef: string; createdAt: string
  order: {
    id: string; status: string; holdExpiresAt: string | null
    user: { id: string; name: string; phone: string | null; email: string | null }
    ticket: { serial: string; holderName: string; governorate: string } | null
  }
}
type ReviewReferral = {
  id: string; createdAt: string; fraudFlags: string
  referrer: { id: string; name: string; phone: string | null }
  referredUser: { id: string; name: string; phone: string | null; email: string | null }
}
type UserRow = {
  id: string; name: string; phone: string | null; email: string | null; role: string; status: string
  provider: string; referralCode: string; createdAt: string; lastLoginAt: string | null
  ticketsCount: number; referrals: number; points: number
}
type AdminRow = {
  id: string; name: string; phone: string | null; email: string | null; role: string; status: string
  createdAt: string; lastLoginAt: string | null; activeSessions: number
}
type RedemptionRow = {
  id: string; status: string; pointsSpent: number; createdAt: string; fulfilledAt: string | null
  user: { id: string; name: string; phone: string | null; email: string | null }
  reward: { id: string; name: string; pointsCost: number }
}
type SettingsData = Record<string, string> & {
  smsConfigured?: boolean
  emailConfigured?: boolean
  whatsappConfigured?: boolean
  adminPasswordSet?: boolean
}

const METHOD_LABELS: Record<string, string> = {
  instapay: 'InstaPay', vodafone_cash: 'Vodafone Cash', orange_cash: 'Orange Cash',
  etisalat_cash: 'e& money', we_pay: 'WE Pay',
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ---------- لوحة التحكم ----------
export function AdminPanel({ isSuper }: { isSuper: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14 w-full" aria-labelledby="admin-title">
      <Reveal>
        <div className="mb-6">
          <span className="inline-block bg-ink text-lime font-serial font-bold text-xs tracking-[0.25em] rounded-lg px-3 py-1.5 mb-4" dir="ltr">
            ADMIN CONSOLE
          </span>
          <h1 id="admin-title" className="text-3xl sm:text-4xl font-extrabold">لوحة تحكم Stand Out</h1>
          <p className="text-sm font-bold text-muted-foreground mt-2">
            التحكم الكامل في النظام — الايفنتات، حسابات استلام الفلوس، الدفعات، والمسؤولين.
          </p>
        </div>
      </Reveal>

      <Tabs defaultValue="overview" dir="rtl">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-lilac border-[2.5px] border-ink rounded-2xl p-1.5 mb-6 justify-start">
          {[
            { v: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
            { v: 'payments', label: 'الدفعات', icon: Wallet },
            { v: 'events', label: 'الايفنتات', icon: CalendarPlus },
            { v: 'accounts', label: 'حسابات الاستلام', icon: Landmark },
            { v: 'users', label: 'المستخدمين', icon: Users },
            ...(isSuper ? [{ v: 'admins', label: 'المسؤولين', icon: ShieldUser }] : []),
            { v: 'redemptions', label: 'الاستبدالات', icon: Gift },
            { v: 'settings', label: 'الإعدادات', icon: Settings2 },
          ].map((t) => (
            <TabsTrigger
              key={t.v}
              value={t.v}
              className="gap-1.5 font-extrabold text-xs data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-ink rounded-lg min-h-[40px] px-3"
            >
              <t.icon className="h-3.5 w-3.5" aria-hidden />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="events"><EventsTab /></TabsContent>
        <TabsContent value="accounts"><AccountsTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        {isSuper && <TabsContent value="admins"><AdminsTab /></TabsContent>}
        <TabsContent value="redemptions"><RedemptionsTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab isSuper={isSuper} /></TabsContent>
      </Tabs>
    </section>
  )
}

// ---------- تبويب: نظرة عامة ----------
function OverviewTab() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api<Overview>('/api/admin/overview'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التحميل')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <CenterSpinner />
  if (!data) return null

  const s = data.stats
  const cards = [
    { label: 'المستخدمين', value: s.users, sub: `${s.banned} موقوف · ${s.admins} مسؤول`, cls: 'bg-lilac' },
    { label: 'تذاكر صادرة', value: s.ticketsIssued, sub: `${s.ticketsHeld} في انتظار الدفع`, cls: 'bg-lime' },
    { label: 'إجمالي التحصيل', value: egp(s.revenueMinor), sub: `${s.ordersPaid} عملية مؤكدة`, cls: 'bg-peach' },
    { label: 'دفعات معلّقة', value: s.pendingPayments, sub: 'محتاجة تأكيد منك', cls: 'bg-white' },
    { label: 'إحالات مؤهلة', value: s.qualifiedReferrals, sub: `${s.reviewReferrals} تحت المراجعة`, cls: 'bg-lilac' },
    { label: 'طلبات استبدال', value: s.pendingRedemptions, sub: 'في انتظار التسليم', cls: 'bg-white' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c, i) => (
          <Reveal key={c.label} delay={i * 0.04}>
            <div className={`${c.cls} nb nb-pop rounded-2xl p-5`}>
              <p className="text-2xl sm:text-3xl font-extrabold" dir={c.label === 'إجمالي التحصيل' ? 'rtl' : 'ltr'}>{c.value}</p>
              <p className="text-sm font-extrabold mt-1">{c.label}</p>
              <p className="text-xs font-bold text-ink/60 mt-0.5">{c.sub}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="bg-white nb rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-extrabold text-sm">الايفنت المفعّل حاليًا (الظاهر للعامة)</p>
            {data.activeEvent ? (
              <span className="bg-lime border-2 border-ink rounded-lg px-3 py-1 text-xs font-extrabold">شغّال</span>
            ) : (
              <span className="bg-peach border-2 border-ink rounded-lg px-3 py-1 text-xs font-extrabold">مفيش ايفنت مفعّل</span>
            )}
          </div>
          {data.activeEvent ? (
            <p className="text-sm font-bold text-muted-foreground">
              {data.activeEvent.name} — اتحجز {data.activeEvent.soldCount} من {data.activeEvent.capacity} مقعد
            </p>
          ) : (
            <p className="text-sm font-bold text-muted-foreground">فعّل ايفنت من تبويب الايفنتات عشان يظهر للحجز.</p>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="bg-white nb rounded-2xl p-5">
          <p className="font-extrabold text-sm mb-3 flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-grape" aria-hidden /> آخر حركات الإدارة (سجل التدقيق)
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto nice-scroll">
            {data.audit.length === 0 ? (
              <p className="text-sm font-bold text-muted-foreground py-4 text-center">لسه مفيش حركات.</p>
            ) : (
              data.audit.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-lilac/40 border-2 border-ink/40 px-3 py-2">
                  <span className="text-xs font-bold" dir="ltr">{a.action}{a.detail ? ` — ${a.detail}` : ''}</span>
                  <span className="text-[10px] font-bold text-muted-foreground shrink-0" dir="ltr">
                    {new Date(a.createdAt).toLocaleString('ar-EG')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Reveal>
    </div>
  )
}

// ---------- تبويب: الدفعات + مراجعة الإحالات ----------
function PaymentsTab() {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [referrals, setReferrals] = useState<ReviewReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ payments: PaymentRow[]; reviewReferrals: ReviewReferral[] }>('/api/admin/payments')
      setPayments(r.payments || [])
      setReferrals(r.reviewReferrals || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التحميل')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (id: string, action: 'complete' | 'fail') => {
    setBusyId(id)
    try {
      await api(`/api/admin/payments/${id}`, { body: { action } })
      toast.success(action === 'complete' ? 'اتأكدت الدفعة — التذكرة اتفعّلت للعميل.' : 'الدفعة اترفضت.')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التنفيذ')
    } finally {
      setBusyId(null)
    }
  }

  const reviewReferral = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    try {
      await api(`/api/admin/referrals/${id}`, { body: { action } })
      toast.success(action === 'approve' ? 'الإحالة اتأكدت والنقاط اتحسبت.' : 'الإحالة اترفضت.')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التنفيذ')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <CenterSpinner />

  return (
    <div className="space-y-6">
      <div className="bg-white nb rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-extrabold text-sm flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-grape" aria-hidden /> دفعات في انتظار التأكيد ({payments.length})
          </p>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5 font-bold border-2 border-ink rounded-lg bg-white hover:bg-lilac/50">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> تحديث
          </Button>
        </div>
        {payments.length === 0 ? (
          <p className="text-sm font-bold text-muted-foreground py-6 text-center">مفيش دفعات معلّقة — كل حاجة منتظمة.</p>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto nice-scroll">
            {payments.map((p) => (
              <div key={p.id} className="rounded-xl border-[2.5px] border-ink bg-lilac/30 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-extrabold">{p.order.ticket?.holderName || p.order.user.name || 'بدون اسم'}</p>
                    <p className="text-xs font-bold text-muted-foreground" dir="ltr">
                      {p.order.user.phone || p.order.user.email || ''} · {p.order.ticket?.serial || p.order.id.slice(0, 10)}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold text-grape">{egp(p.amountMinor)}</p>
                    <p className="text-xs font-bold text-muted-foreground">{METHOD_LABELS[p.method] || p.method}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    مرجع العملية:
                    <span className="font-serial text-ink" dir="ltr">{p.reference}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(p.reference).then(() => toast.success('المرجع اتنسخ')).catch(() => {}) }}
                      aria-label="نسخ المرجع"
                      className="text-grape hover:text-ink"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === p.id}
                      onClick={() => act(p.id, 'complete')}
                      className="gap-1.5 font-extrabold bg-lime text-ink border-2 border-ink rounded-lg hover:bg-lime/90 min-h-[40px]"
                    >
                      {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
                      تأكيد الاستلام
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === p.id}
                      onClick={() => act(p.id, 'fail')}
                      className="gap-1.5 font-extrabold border-2 border-ink rounded-lg bg-white hover:bg-peach/50 min-h-[40px]"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden /> رفض
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white nb rounded-2xl p-5">
        <p className="font-extrabold text-sm mb-4 flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 text-grape" aria-hidden /> إحالات تحت المراجعة ({referrals.length})
        </p>
        {referrals.length === 0 ? (
          <p className="text-sm font-bold text-muted-foreground py-6 text-center">مفيش إحالات مشبوهة حاليًا.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto nice-scroll">
            {referrals.map((r) => (
              <div key={r.id} className="rounded-xl border-[2.5px] border-ink bg-peach/30 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-extrabold">
                    الداعي: {r.referrer.name || r.referrer.phone} → المدعو: {r.referredUser.name || r.referredUser.phone || r.referredUser.email}
                  </p>
                  <p className="text-xs font-bold text-muted-foreground" dir="ltr">{r.fraudFlags}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={busyId === r.id} onClick={() => reviewReferral(r.id, 'approve')} className="gap-1.5 font-extrabold bg-lime text-ink border-2 border-ink rounded-lg hover:bg-lime/90 min-h-[40px]">
                    <Check className="h-3.5 w-3.5" aria-hidden /> اعتماد
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => reviewReferral(r.id, 'reject')} className="gap-1.5 font-extrabold border-2 border-ink rounded-lg bg-white hover:bg-peach/50 min-h-[40px]">
                    <X className="h-3.5 w-3.5" aria-hidden /> رفض
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- تبويب: الايفنتات ----------
const EMPTY_EVENT = {
  id: '', name: '', startsAt: '', venue: '', city: '', capacity: 500, priceEgp: 100,
  holdMinutes: 15, bookingOpensAt: '', bookingClosesAt: '', ageMin: 16, ageMax: 45,
  shareText: '', doorsAt: '08:00', endsAt: '17:00', note: '', active: false,
}
type EventForm = typeof EMPTY_EVENT

function EventsTab() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EventForm>(EMPTY_EVENT)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ events: AdminEvent[] }>('/api/admin/events')
      setEvents(r.events || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التحميل')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    const now = new Date()
    const inDays = (d: number) => new Date(now.getTime() + d * 86400000)
    setEditing({
      ...EMPTY_EVENT,
      startsAt: toLocalInput(inDays(7).toISOString()),
      bookingOpensAt: toLocalInput(now.toISOString()),
      bookingClosesAt: toLocalInput(inDays(6).toISOString()),
    })
    setDialogOpen(true)
  }

  const openEdit = (e: AdminEvent) => {
    setEditing({
      id: e.id, name: e.name, startsAt: toLocalInput(e.startsAt), venue: e.venue, city: e.city,
      capacity: e.capacity, priceEgp: e.priceMinor / 100, holdMinutes: e.holdMinutes,
      bookingOpensAt: toLocalInput(e.bookingOpensAt), bookingClosesAt: toLocalInput(e.bookingClosesAt),
      ageMin: e.ageMin, ageMax: e.ageMax,
      shareText: e.settings?.shareText || '', doorsAt: e.settings?.doorsAt || '', endsAt: e.settings?.endsAt || '',
      note: e.settings?.note || '', active: e.active,
    })
    setDialogOpen(true)
  }

  const save = async () => {
    setBusy(true)
    try {
      const payload = {
        name: editing.name, startsAt: new Date(editing.startsAt).toISOString(),
        venue: editing.venue, city: editing.city, capacity: editing.capacity,
        priceEgp: editing.priceEgp, holdMinutes: editing.holdMinutes,
        bookingOpensAt: new Date(editing.bookingOpensAt).toISOString(),
        bookingClosesAt: new Date(editing.bookingClosesAt).toISOString(),
        ageMin: editing.ageMin, ageMax: editing.ageMax,
        shareText: editing.shareText, doorsAt: editing.doorsAt, endsAt: editing.endsAt, note: editing.note,
      }
      if (editing.id) await api(`/api/admin/events/${editing.id}`, { method: 'PATCH', body: payload })
      else await api('/api/admin/events', { body: payload })
      toast.success(editing.id ? 'التعديلات اتحفظت.' : 'الايفنت اتضاف.')
      setDialogOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في الحفظ')
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (e: AdminEvent) => {
    try {
      await api(`/api/admin/events/${e.id}`, { method: 'PATCH', body: { active: !e.active } })
      toast.success(!e.active ? 'الايفنت بقى هو الظاهر للعامة.' : 'الايفنت اتقفل من الحجز.')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'مشكلة في التنفيذ')
    }
  }

  const remove = async (e: AdminEvent) => {
    if (!window.confirm(`تحذف "${e.name}" نهائيًا؟`)) return
    try {
      await api(`/api/admin/events/${e.id}`, { method: 'DELETE' })
      toast.success('الايفنت اتحذف.')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'مشكلة في الحذف')
    }
  }

  if (loading) return <CenterSpinner />

  const validForm = editing.name.trim().length >= 3 && editing.venue.trim() && editing.city.trim() && editing.startsAt && editing.bookingOpensAt && editing.bookingClosesAt

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-extrabold text-sm">الحدث المفعّل هو الوحيد اللي بيظهر للحجز العام</p>
        <Button onClick={openCreate} className="gap-1.5 font-extrabold bg-lime text-ink border-[3px] border-ink rounded-xl shadow-[3px_3px_0_0_var(--ink)] hover:bg-lime/90 min-h-[44px]">
          <Plus className="h-4 w-4" aria-hidden /> ايفنت جديد
        </Button>
      </div>

      {events.length === 0 ? (
        <p className="text-sm font-bold text-muted-foreground bg-white nb rounded-2xl py-10 text-center">مفيش ايفنتات — ضيف الأول.</p>
      ) : (
        events.map((e) => (
          <div key={e.id} className={`bg-white nb rounded-2xl p-5 ${e.active ? 'border-r-[6px] border-r-lime' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-lg">{e.name}</h3>
                  {e.active ? (
                    <span className="bg-lime border-2 border-ink rounded-lg px-2.5 py-1 text-[11px] font-extrabold">مفعّل — ظاهر للعامة</span>
                  ) : (
                    <span className="bg-muted border-2 border-ink/40 rounded-lg px-2.5 py-1 text-[11px] font-bold text-muted-foreground">متوقف</span>
                  )}
                </div>
                <p className="text-xs font-bold text-muted-foreground mt-1.5">
                  {new Date(e.startsAt).toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })} — {e.venue}، {e.city}
                </p>
                <p className="text-xs font-bold text-muted-foreground mt-1">
                  السعر: <span className="font-extrabold text-ink">{e.priceMinor === 0 ? 'مجاني' : egp(e.priceMinor)}</span>
                  {' · '}اتحجز: <span className="font-extrabold text-ink">{e.soldCount}</span> من {e.capacity}
                  {' · '}سن من {e.ageMin} لـ {e.ageMax}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleActive(e)} className="gap-1.5 font-extrabold border-2 border-ink rounded-lg bg-white hover:bg-lilac/50 min-h-[40px]">
                  <Power className="h-3.5 w-3.5" aria-hidden /> {e.active ? 'إيقاف' : 'تفعيل'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(e)} className="gap-1.5 font-extrabold border-2 border-ink rounded-lg bg-white hover:bg-lilac/50 min-h-[40px]">
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> تعديل
                </Button>
                <Button size="sm" variant="outline" disabled={e.active} onClick={() => remove(e)} className="gap-1.5 font-extrabold border-2 border-ink rounded-lg bg-white hover:bg-peach/50 disabled:opacity-40 min-h-[40px]">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> حذف
                </Button>
              </div>
            </div>
          </div>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto nice-scroll bg-white border-[3px] border-ink rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">{editing.id ? 'تعديل الايفنت' : 'ايفنت جديد'}</DialogTitle>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="اسم الايفنت"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="field" placeholder="Stand Out Summit 2026" /></Field>
            <Field label="الموعد"><Input type="datetime-local" value={editing.startsAt} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })} className="field" /></Field>
            <Field label="المكان"><Input value={editing.venue} onChange={(e) => setEditing({ ...editing, venue: e.target.value })} className="field" placeholder="The GrEEK Campus" /></Field>
            <Field label="المدينة"><Input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} className="field" placeholder="وسط البلد، القاهرة" /></Field>
            <Field label="عدد المقاعد"><Input inputMode="numeric" dir="ltr" value={String(editing.capacity)} onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })} className="field" /></Field>
            <Field label="سعر التذكرة (جنيه — 0 يعني مجاني)"><Input inputMode="numeric" dir="ltr" value={String(editing.priceEgp)} onChange={(e) => setEditing({ ...editing, priceEgp: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })} className="field" /></Field>
            <Field label="مدة الاحتفاظ بالمقعد (دقائق)"><Input inputMode="numeric" dir="ltr" value={String(editing.holdMinutes)} onChange={(e) => setEditing({ ...editing, holdMinutes: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })} className="field" /></Field>
            <Field label="أقل سن"><Input inputMode="numeric" dir="ltr" value={String(editing.ageMin)} onChange={(e) => setEditing({ ...editing, ageMin: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })} className="field" /></Field>
            <Field label="أقصى سن"><Input inputMode="numeric" dir="ltr" value={String(editing.ageMax)} onChange={(e) => setEditing({ ...editing, ageMax: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })} className="field" /></Field>
            <Field label="فتح الحجز"><Input type="datetime-local" value={editing.bookingOpensAt} onChange={(e) => setEditing({ ...editing, bookingOpensAt: e.target.value })} className="field" /></Field>
            <Field label="قفل الحجز"><Input type="datetime-local" value={editing.bookingClosesAt} onChange={(e) => setEditing({ ...editing, bookingClosesAt: e.target.value })} className="field" /></Field>
            <Field label="نص رسالة المشاركة (اختياري — استخدم {link})"><Textarea value={editing.shareText} onChange={(e) => setEditing({ ...editing, shareText: e.target.value })} className="field min-h-[72px]" placeholder="I'm going to Stand Out Summit 2026... Come with me: {link}" /></Field>
            <Field label="ملاحظة على الايفنت"><Textarea value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} className="field min-h-[72px]" /></Field>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={busy || !validForm} className="flex-1 min-h-[50px] font-extrabold rounded-xl border-[3px] border-ink bg-lime text-ink shadow-[4px_4px_0_0_var(--ink)] hover:bg-lime/90 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'حفظ'}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="min-h-[50px] font-extrabold border-[3px] border-ink rounded-xl bg-white">إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- تبويب: حسابات استلام الفلوس ----------
function AccountsTab() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ method: 'instapay', label: 'InstaPay', accountName: '', accountNumber: '', instructions: '' })
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ accounts: Account[] }>('/api/admin/payment-accounts')
      setAccounts(r.accounts || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التحميل')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const add = async () => {
    setAdding(true)
    try {
      await api('/api/admin/payment-accounts', { body: { ...form, sortOrder: 10 } })
      toast.success('الحساب اتضاف — بقا ظاهر في بوابة الدفع.')
      setForm({ method: 'instapay', label: 'InstaPay', accountName: '', accountNumber: '', instructions: '' })
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في الإضافة')
    } finally {
      setAdding(false)
    }
  }

  const patch = async (id: string, data: Record<string, unknown>) => {
    setBusyId(id)
    try {
      await api(`/api/admin/payment-accounts/${id}`, { method: 'PATCH', body: data })
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في الحفظ')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('تحذف حساب الاستلام ده؟')) return
    setBusyId(id)
    try {
      await api(`/api/admin/payment-accounts/${id}`, { method: 'DELETE' })
      toast.success('الحساب اتحذف.')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في الحذف')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <CenterSpinner />

  const validAdd = form.label.trim().length >= 2 && form.accountName.trim().length >= 2 && form.accountNumber.trim().length >= 4

  return (
    <div className="space-y-5">
      <div className="bg-white nb rounded-2xl p-5">
        <p className="font-extrabold text-sm mb-1 flex items-center gap-1.5">
          <Landmark className="h-4 w-4 text-grape" aria-hidden /> ضيف حساب يستقبل عليه الناس
        </p>
        <p className="text-xs font-bold text-muted-foreground mb-4">
          الايميل، رقم الموبايل، InstaPay، والمحافظ — اللي هتظهر للعملاء في بوابة الدفع.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="الطريقة">
            <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v, label: METHOD_LABELS[v] || v })}>
              <SelectTrigger className="field" aria-label="طريقة الاستلام"><SelectValue /></SelectTrigger>
              <SelectContent className="border-[2.5px] border-ink rounded-xl">
                {Object.entries(METHOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="الاسم الظاهر"><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="field" /></Field>
          <Field label="اسم صاحب الحساب"><Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="field" placeholder="Stand Out" /></Field>
          <Field label={form.method === 'instapay' ? 'عنوان InstaPay' : 'رقم الحساب/المحفظة'}>
            <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="field" dir="ltr" placeholder={form.method === 'instapay' ? 'standout@instapay' : '01xxxxxxxxx'} />
          </Field>
        </div>
        <Button onClick={add} disabled={adding || !validAdd} className="mt-4 gap-1.5 font-extrabold bg-lime text-ink border-[3px] border-ink rounded-xl shadow-[3px_3px_0_0_var(--ink)] hover:bg-lime/90 min-h-[46px] disabled:opacity-50">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />} إضافة الحساب
        </Button>
      </div>

      <div className="space-y-3">
        {accounts.map((a) => (
          <div key={a.id} className="bg-white nb rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-10 w-10 rounded-xl border-[2.5px] border-ink bg-lilac flex items-center justify-center shrink-0 font-extrabold text-xs">
                  {METHOD_LABELS[a.method]?.slice(0, 2) || a.method.slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <p className="font-extrabold text-sm">{a.label} {a.active ? '' : '(موقوف)'}</p>
                  <p className="text-xs font-bold text-muted-foreground truncate" dir="ltr">{a.accountNumber} — {a.accountName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-extrabold">
                  شغّال
                  <Switch checked={a.active} disabled={busyId === a.id} onCheckedChange={(v) => patch(a.id, { active: v })} aria-label={`تشغيل ${a.label}`} />
                </label>
                <Button size="sm" variant="outline" onClick={() => remove(a.id)} disabled={busyId === a.id} className="gap-1.5 font-extrabold border-2 border-ink rounded-lg bg-white hover:bg-peach/50 min-h-[40px]">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> حذف
                </Button>
              </div>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="text-sm font-bold text-muted-foreground bg-white nb rounded-2xl py-10 text-center">
            مفيش حسابات استلام — ضيف حسابك الأول عشان الدفع يشتغل.
          </p>
        )}
      </div>
    </div>
  )
}

// ---------- تبويب: المستخدمين ----------
function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async (query = '') => {
    setLoading(true)
    try {
      const r = await api<{ users: UserRow[] }>(`/api/admin/users?q=${encodeURIComponent(query)}`)
      setUsers(r.users || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التحميل')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const patch = async (id: string, data: Record<string, unknown>, okMsg: string) => {
    setBusyId(id)
    try {
      await api(`/api/admin/users/${id}`, { method: 'PATCH', body: data })
      toast.success(okMsg)
      await load(q)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التنفيذ')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="bg-white nb rounded-2xl p-5">
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(q)}
            placeholder="ابحث بالاسم أو الرقم أو الإيميل..."
            className="pl-10 font-bold bg-white border-[2.5px] border-ink rounded-xl h-11"
            aria-label="بحث في المستخدمين"
          />
        </div>
        <Button onClick={() => load(q)} className="font-extrabold bg-ink text-cream border-[2.5px] border-ink rounded-xl min-h-[44px] px-4">بحث</Button>
      </div>

      {loading ? <CenterSpinner /> : (
        <div className="space-y-2 max-h-[560px] overflow-y-auto nice-scroll">
          {users.length === 0 ? (
            <p className="text-sm font-bold text-muted-foreground py-8 text-center">مفيش نتائج.</p>
          ) : users.map((u) => (
            <div key={u.id} className="rounded-xl border-2 border-ink/40 bg-lilac/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-extrabold truncate">
                  {u.name || '(بدون اسم)'}
                  {u.role !== 'attendee' && <span className="mr-2 bg-grape text-cream rounded-md px-2 py-0.5 text-[10px] font-extrabold" dir="ltr">{u.role}</span>}
                  {u.status === 'blocked' && <span className="mr-2 bg-peach border border-ink rounded-md px-2 py-0.5 text-[10px] font-extrabold">موقوف</span>}
                </p>
                <p className="text-xs font-bold text-muted-foreground truncate" dir="ltr">
                  {u.phone || u.email || ''} · تذاكر: {u.ticketsCount} · إحالات: {u.referrals} · نقاط: {u.points}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const v = window.prompt('زوّد أو اخصم نقاط — اكتب رقم (مثال 5 أو -3):')
                    if (!v) return
                    const d = Number(v)
                    if (Number.isNaN(d) || d === 0) return toast.error('اكتب رقم صحيح غير الصفر.')
                    patch(u.id, { pointsDelta: d }, 'النقاط اتعدلت.')
                  }}
                  disabled={busyId === u.id}
                  className="rounded-lg border-2 border-ink bg-white hover:bg-lilac/60 px-2.5 py-1.5 text-xs font-extrabold min-h-[36px] inline-flex items-center gap-1"
                  aria-label="تعديل النقاط"
                >
                  <Coins className="h-3.5 w-3.5 text-grape" aria-hidden /> نقاط
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === u.id}
                  onClick={() => patch(u.id, { status: u.status === 'active' ? 'blocked' : 'active' }, u.status === 'active' ? 'الحساب اتوقف.' : 'الحساب رجع شغّال.')}
                  className="gap-1.5 font-extrabold border-2 border-ink rounded-lg bg-white hover:bg-peach/50 min-h-[36px] px-2.5 text-xs"
                >
                  <Ban className="h-3.5 w-3.5" aria-hidden /> {u.status === 'active' ? 'إيقاف' : 'تشغيل'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- تبويب: المسؤولين (للمسؤول الأعلى) ----------
function AdminsTab() {
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', role: 'admin' })
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ admins: AdminRow[] }>('/api/admin/admins')
      setAdmins(r.admins || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التحميل')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const add = async () => {
    setAdding(true)
    try {
      await api('/api/admin/admins', { body: form })
      toast.success('المسؤول اتضاف — بيدخل بنفس بوابة التحقق برقمه أو إيميله.')
      setForm({ name: '', phone: '', email: '', role: 'admin' })
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في الإضافة')
    } finally {
      setAdding(false)
    }
  }

  const changeRole = async (id: string, role: string) => {
    setBusyId(id)
    try {
      await api(`/api/admin/admins/${id}`, { method: 'PATCH', body: { role } })
      toast.success('الصلاحية اتغيرت.')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التنفيذ')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('هتشيل صلاحيات المسؤول ده؟')) return
    setBusyId(id)
    try {
      const r = await api<{ demoted?: boolean }>(`/api/admin/admins/${id}`, { method: 'DELETE' })
      toast.success(r.demoted ? 'اتخفض لعضو عادي (عنده تذاكر).' : 'المسؤول اتشال.')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التنفيذ')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <CenterSpinner />

  const validAdd = form.name.trim().length >= 2 && (form.phone.trim().length === 11 || form.email.trim().includes('@'))

  return (
    <div className="space-y-5">
      <div className="bg-white nb rounded-2xl p-5">
        <p className="font-extrabold text-sm mb-1 flex items-center gap-1.5">
          <ShieldUser className="h-4 w-4 text-grape" aria-hidden /> ضيف مسؤول معاك في إدارة النظام
        </p>
        <p className="text-xs font-bold text-muted-foreground mb-4">
          المسؤول بيدخل بنفس حسابه — أول ما يسجل بالرقم/الإيميل ده هيلقى لوحة التحكم.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="الاسم"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" /></Field>
          <Field label="رقم الموبايل (أو إيميل)"><Input inputMode="tel" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 11) })} className="field" placeholder="01xxxxxxxxx" /></Field>
          <Field label="أو الإيميل"><Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" placeholder="admin@example.com" /></Field>
          <Field label="الصلاحية">
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger className="field" aria-label="الصلاحية"><SelectValue /></SelectTrigger>
              <SelectContent className="border-[2.5px] border-ink rounded-xl">
                <SelectItem value="admin">أدمن — كل اللوحة</SelectItem>
                <SelectItem value="staff">موظف — دعم بس</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Button onClick={add} disabled={adding || !validAdd} className="mt-4 gap-1.5 font-extrabold bg-lime text-ink border-[3px] border-ink rounded-xl shadow-[3px_3px_0_0_var(--ink)] hover:bg-lime/90 min-h-[46px] disabled:opacity-50">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />} إضافة مسؤول
        </Button>
      </div>

      <div className="space-y-2">
        {admins.map((a) => (
          <div key={a.id} className="bg-white nb rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold">
                {a.name || '(بدون اسم)'}
                <span className={`mr-2 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${a.role === 'super_admin' ? 'bg-grape text-cream' : 'bg-lilac border border-ink'}`} dir="ltr">{a.role}</span>
                {a.status === 'blocked' && <span className="mr-2 bg-peach border border-ink rounded-md px-2 py-0.5 text-[10px] font-extrabold">موقوف</span>}
              </p>
              <p className="text-xs font-bold text-muted-foreground" dir="ltr">
                {a.phone || a.email || ''} · جلسات شغّالة: {a.activeSessions}
              </p>
            </div>
            {a.role !== 'super_admin' && (
              <div className="flex items-center gap-2">
                <Select value={a.role} onValueChange={(v) => changeRole(a.id, v)} disabled={busyId === a.id}>
                  <SelectTrigger className="h-9 w-[130px] bg-white border-2 border-ink rounded-lg text-xs font-extrabold" aria-label="تغيير الصلاحية"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-[2.5px] border-ink rounded-xl">
                    <SelectItem value="admin">أدمن</SelectItem>
                    <SelectItem value="staff">موظف</SelectItem>
                    <SelectItem value="attendee">عضو عادي</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => remove(a.id)} disabled={busyId === a.id} className="gap-1.5 font-extrabold border-2 border-ink rounded-lg bg-white hover:bg-peach/50 min-h-[36px] text-xs">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> إزالة
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- تبويب: طلبات الاستبدال ----------
function RedemptionsTab() {
  const [rows, setRows] = useState<RedemptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ redemptions: RedemptionRow[] }>('/api/admin/redemptions')
      setRows(r.redemptions || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التحميل')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (id: string, action: 'fulfill' | 'cancel') => {
    setBusyId(id)
    try {
      await api(`/api/admin/redemptions/${id}`, { method: 'PATCH', body: { action } })
      toast.success(action === 'fulfill' ? 'الجايزة اتححذت كمسلّمة.' : 'الطلب اتلغي والنقاط رجعت لصاحبها.')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التنفيذ')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <CenterSpinner />

  const statusLabel = (s: string) => s === 'PENDING' ? 'في الانتظار' : s === 'FULFILLED' ? 'اتسلمت' : 'ملغاة'

  return (
    <div className="bg-white nb rounded-2xl p-5">
      <p className="font-extrabold text-sm mb-4 flex items-center gap-1.5">
        <Gift className="h-4 w-4 text-grape" aria-hidden /> طلبات استبدال الجوائز ({rows.length})
      </p>
      {rows.length === 0 ? (
        <p className="text-sm font-bold text-muted-foreground py-8 text-center">مفيش طلبات لسه.</p>
      ) : (
        <div className="space-y-2 max-h-[520px] overflow-y-auto nice-scroll">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border-2 border-ink/40 bg-lilac/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-extrabold truncate">{r.reward.name} — {r.user.name || r.user.phone || r.user.email}</p>
                <p className="text-xs font-bold text-muted-foreground">
                  {r.pointsSpent} نقطة · {statusLabel(r.status)} · {new Date(r.createdAt).toLocaleDateString('ar-EG')}
                </p>
              </div>
              {r.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <Button size="sm" disabled={busyId === r.id} onClick={() => act(r.id, 'fulfill')} className="gap-1.5 font-extrabold bg-lime text-ink border-2 border-ink rounded-lg hover:bg-lime/90 min-h-[40px]">
                    <Check className="h-3.5 w-3.5" aria-hidden /> اتسلمت
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => act(r.id, 'cancel')} className="gap-1.5 font-extrabold border-2 border-ink rounded-lg bg-white hover:bg-peach/50 min-h-[40px]">
                    <X className="h-3.5 w-3.5" aria-hidden /> إلغاء + رد النقاط
                  </Button>
                </div>
              ) : (
                <span className="text-xs font-extrabold text-muted-foreground">{statusLabel(r.status)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- تبويب: الإعدادات ----------
function SettingsTab({ isSuper }: { isSuper?: boolean }) {
  const [s, setS] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testTarget, setTestTarget] = useState('')
  const [testing, setTesting] = useState<'sms' | 'email' | 'whatsapp' | null>(null)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api<{ settings: SettingsData }>('/api/admin/settings')
      setS(r.settings)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التحميل')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!s) return
    setSaving(true)
    try {
      const r = await api<{ settings: SettingsData }>('/api/admin/settings', {
        method: 'PUT',
        body: {
          siteName: s.siteName, tagline: s.tagline, supportEmail: s.supportEmail, supportPhone: s.supportPhone,
          whatsappProvider: s.whatsappProvider, ultramsgInstance: s.ultramsgInstance, ultramsgToken: s.ultramsgToken,
          metaWhatsappToken: s.metaWhatsappToken, metaPhoneNumberId: s.metaPhoneNumberId,
          metaWhatsappTemplateName: s.metaWhatsappTemplateName, metaWhatsappTemplateLang: s.metaWhatsappTemplateLang,
          greenApiInstance: s.greenApiInstance, greenApiToken: s.greenApiToken,
          twilioAccountSid: s.twilioAccountSid, twilioAuthToken: s.twilioAuthToken, twilioWhatsappFrom: s.twilioWhatsappFrom,
          whatsappGatewayUrl: s.whatsappGatewayUrl, whatsappGatewayKey: s.whatsappGatewayKey,
          smsProvider: s.smsProvider, smsMisrUsername: s.smsMisrUsername, smsMisrPassword: s.smsMisrPassword,
          smsMisrToken: s.smsMisrToken, smsMisrSender: s.smsMisrSender, smsMisrEnvironment: s.smsMisrEnvironment,
          smsGatewayUrl: s.smsGatewayUrl, smsGatewayKey: s.smsGatewayKey, smsSenderName: s.smsSenderName,
          emailProvider: s.emailProvider, resendApiKey: s.resendApiKey, emailFromName: s.emailFromName,
          emailFromAddress: s.emailFromAddress, emailGatewayUrl: s.emailGatewayUrl, emailGatewayKey: s.emailGatewayKey,
          hideDevOtp: s.hideDevOtp,
        },
      })
      setS(r.settings)
      toast.success('الإعدادات اتحفظت.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    setPwBusy(true)
    try {
      await api('/api/admin/password', { body: { currentPassword: pwForm.current, newPassword: pwForm.next } })
      setPwForm({ current: '', next: '', confirm: '' })
      toast.success('كلمة سر الأدمن اتغيرت — استخدمها في الدخول الجاي.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التغيير')
    } finally {
      setPwBusy(false)
    }
  }

  const testSend = async (channel: 'sms' | 'email' | 'whatsapp') => {
    setTesting(channel)
    try {
      await api('/api/admin/settings', { body: { channel, target: testTarget } })
      toast.success('رسالة التجربة بعتت — شوف وصلت ولا لأ.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الإرسال')
    } finally {
      setTesting(null)
    }
  }

  if (loading || !s) return <CenterSpinner />

  const upd = (k: string, v: string) => setS({ ...s, [k]: v })

  return (
    <div className="space-y-5">
      <Reveal>
        <div className="bg-white nb rounded-2xl p-5 space-y-4">
          <p className="font-extrabold text-sm">هوية الموقع وبيانات التواصل</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="اسم الموقع"><Input value={s.siteName || ''} onChange={(e) => upd('siteName', e.target.value)} className="field" /></Field>
            <Field label="الشعار التسويقي"><Input value={s.tagline || ''} onChange={(e) => upd('tagline', e.target.value)} className="field" /></Field>
            <Field label="إيميل الدعم (بيظهر للعملاء)"><Input type="email" dir="ltr" value={s.supportEmail || ''} onChange={(e) => upd('supportEmail', e.target.value)} className="field" /></Field>
            <Field label="رقم الدعم (بيظهر للعملاء)"><Input dir="ltr" value={s.supportPhone || ''} onChange={(e) => upd('supportPhone', e.target.value)} className="field" placeholder="01xxxxxxxxx" /></Field>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="bg-white nb rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-extrabold text-sm flex items-center gap-1.5">
              <Send className="h-4 w-4 text-grape" aria-hidden /> مزود واتساب — أكواد الدخول برقم الموبايل (الأساسي)
            </p>
            <span className={`rounded-lg border-2 border-ink px-2.5 py-1 text-[11px] font-extrabold ${s.whatsappConfigured ? 'bg-lime' : 'bg-peach'}`}>
              {s.whatsappConfigured ? 'مربوط — الكود بيوصل واتساب' : 'غير مربوط — الكود بيرجع للشاشة في وضع التطوير'}
            </span>
          </div>
          <Field label="المزود">
            <Select value={s.whatsappProvider || 'ultramsg'} onValueChange={(v) => upd('whatsappProvider', v)}>
              <SelectTrigger className="field" aria-label="مزود واتساب"><SelectValue /></SelectTrigger>
              <SelectContent className="border-[2.5px] border-ink rounded-xl">
                <SelectItem value="ultramsg">UltraMsg — سهل وسريع لحساب واتساب عادي</SelectItem>
                <SelectItem value="meta">Meta WhatsApp Cloud API — الرسمي</SelectItem>
                <SelectItem value="greenapi">Green API</SelectItem>
                <SelectItem value="twilio">Twilio WhatsApp</SelectItem>
                <SelectItem value="custom">بوابة مخصصة (POST JSON)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {(s.whatsappProvider || 'ultramsg') === 'ultramsg' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Instance ID (رقم النسخة)"><Input dir="ltr" value={s.ultramsgInstance || ''} onChange={(e) => upd('ultramsgInstance', e.target.value)} className="field" placeholder="instance12345" autoComplete="off" /></Field>
              <Field label="UltraMsg Token"><Input type="password" dir="ltr" value={s.ultramsgToken || ''} onChange={(e) => upd('ultramsgToken', e.target.value)} className="field" autoComplete="new-password" /></Field>
              <p className="sm:col-span-2 text-[11px] font-bold text-muted-foreground leading-relaxed">
                من حسابك على ultramsg.com: خد Instance ID و Token من صفحة Instances — والأرقام بتتبعت تلقائيًا بالصيغة الدولية (01200506224 ← 201200506224).
              </p>
            </div>
          )}
          {(s.whatsappProvider || 'ultramsg') === 'meta' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="WhatsApp Business Token"><Input type="password" dir="ltr" value={s.metaWhatsappToken || ''} onChange={(e) => upd('metaWhatsappToken', e.target.value)} className="field" autoComplete="new-password" /></Field>
              <Field label="Phone Number ID"><Input dir="ltr" value={s.metaPhoneNumberId || ''} onChange={(e) => upd('metaPhoneNumberId', e.target.value)} className="field" autoComplete="off" /></Field>
              <Field label="اسم Template معتمد (اختياري)"><Input dir="ltr" value={s.metaWhatsappTemplateName || ''} onChange={(e) => upd('metaWhatsappTemplateName', e.target.value)} className="field" placeholder="otp_code" /></Field>
              <Field label="لغة الـ Template"><Input dir="ltr" value={s.metaWhatsappTemplateLang || 'ar'} onChange={(e) => upd('metaWhatsappTemplateLang', e.target.value)} className="field" placeholder="ar" /></Field>
              <p className="sm:col-span-2 text-[11px] font-bold text-muted-foreground leading-relaxed">
                لو فاضي خانة Template بنبعت نص حر (بيوصل لو المستخدم كلّم الرقم قبلها بـ 24 ساعة) — للمستخدمين الجدد اعتمد Template جسمه متغير {'{{1}}'} وهو بياخد الكود.
              </p>
            </div>
          )}
          {(s.whatsappProvider || 'ultramsg') === 'greenapi' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Green API Instance ID"><Input dir="ltr" value={s.greenApiInstance || ''} onChange={(e) => upd('greenApiInstance', e.target.value)} className="field" autoComplete="off" /></Field>
              <Field label="Green API Token"><Input type="password" dir="ltr" value={s.greenApiToken || ''} onChange={(e) => upd('greenApiToken', e.target.value)} className="field" autoComplete="new-password" /></Field>
            </div>
          )}
          {(s.whatsappProvider || 'ultramsg') === 'twilio' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Account SID"><Input dir="ltr" value={s.twilioAccountSid || ''} onChange={(e) => upd('twilioAccountSid', e.target.value)} className="field" placeholder="AC..." autoComplete="off" /></Field>
              <Field label="Auth Token"><Input type="password" dir="ltr" value={s.twilioAuthToken || ''} onChange={(e) => upd('twilioAuthToken', e.target.value)} className="field" autoComplete="new-password" /></Field>
              <Field label="رقم الواتساب المرسل"><Input dir="ltr" value={s.twilioWhatsappFrom || ''} onChange={(e) => upd('twilioWhatsappFrom', e.target.value)} className="field" placeholder="whatsapp:+14155238886" /></Field>
            </div>
          )}
          {(s.whatsappProvider || 'ultramsg') === 'custom' && (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <Field label="رابط البوابة (POST JSON — to / message / sender)">
                  <Input dir="ltr" value={s.whatsappGatewayUrl || ''} onChange={(e) => upd('whatsappGatewayUrl', e.target.value)} className="field" placeholder="https://your-gateway.example.com/api/send" />
                </Field>
              </div>
              <Field label="مفتاح البوابة (Bearer)"><Input type="password" dir="ltr" value={s.whatsappGatewayKey || ''} onChange={(e) => upd('whatsappGatewayKey', e.target.value)} className="field" placeholder="••••••" /></Field>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <div className="bg-white nb rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-extrabold text-sm flex items-center gap-1.5">
              <Send className="h-4 w-4 text-grape" aria-hidden /> احتياطي — مزود SMS لو واتساب مش مربوط
            </p>
            <span className={`rounded-lg border-2 border-ink px-2.5 py-1 text-[11px] font-extrabold ${s.smsConfigured ? 'bg-lime' : 'bg-peach'}`}>
              {s.smsConfigured ? 'مربوطة' : 'غير مربوطة — أكواد بتظهر في وضع التطوير'}
            </span>
          </div>
          <Field label="المزود">
            <Select value={s.smsProvider || 'smsmisr'} onValueChange={(v) => upd('smsProvider', v)}>
              <SelectTrigger className="field" aria-label="مزود الـ SMS"><SelectValue /></SelectTrigger>
              <SelectContent className="border-[2.5px] border-ink rounded-xl">
                <SelectItem value="smsmisr">SMSMisr — مزود مصري (رصيد تجريبي مجاني)</SelectItem>
                <SelectItem value="custom">بوابة مخصصة (Victory Links أو غيرها)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {(s.smsProvider || 'smsmisr') === 'smsmisr' ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Username"><Input dir="ltr" value={s.smsMisrUsername || ''} onChange={(e) => upd('smsMisrUsername', e.target.value)} className="field" autoComplete="off" /></Field>
              <Field label="Password"><Input type="password" dir="ltr" value={s.smsMisrPassword || ''} onChange={(e) => upd('smsMisrPassword', e.target.value)} className="field" autoComplete="new-password" /></Field>
              <Field label="Token (API Key)"><Input type="password" dir="ltr" value={s.smsMisrToken || ''} onChange={(e) => upd('smsMisrToken', e.target.value)} className="field" autoComplete="new-password" /></Field>
              <Field label="اسم المرسل (Sender)"><Input dir="ltr" value={s.smsMisrSender || ''} onChange={(e) => upd('smsMisrSender', e.target.value)} className="field" /></Field>
              <Field label="البيئة">
                <Select value={s.smsMisrEnvironment || '2'} onValueChange={(v) => upd('smsMisrEnvironment', v)}>
                  <SelectTrigger className="field" aria-label="بيئة SMSMisr"><SelectValue /></SelectTrigger>
                  <SelectContent className="border-[2.5px] border-ink rounded-xl">
                    <SelectItem value="1">تجريبية (environment = 1)</SelectItem>
                    <SelectItem value="2">إنتاج (environment = 2)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <p className="sm:col-span-2 text-[11px] font-bold text-muted-foreground leading-relaxed">
                الأرقام بتتبعت بصيغة دولية تلقائيًا (01200506224 ← 201200506224)، والرسائل العربية بتتبعت Unicode تلقائيًا.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <Field label="رابط البوابة (POST JSON — to / message / sender)">
                  <Input dir="ltr" value={s.smsGatewayUrl || ''} onChange={(e) => upd('smsGatewayUrl', e.target.value)} className="field" placeholder="https://your-provider.example.com/api/send" />
                </Field>
              </div>
              <Field label="مفتاح البوابة (Bearer)"><Input type="password" dir="ltr" value={s.smsGatewayKey || ''} onChange={(e) => upd('smsGatewayKey', e.target.value)} className="field" placeholder="••••••" /></Field>
              <Field label="اسم المرسل"><Input dir="ltr" value={s.smsSenderName || ''} onChange={(e) => upd('smsSenderName', e.target.value)} className="field" /></Field>
            </div>
          )}

          <label className="flex items-center gap-3 text-sm font-bold">
            <Switch checked={s.hideDevOtp === '1'} onCheckedChange={(v) => upd('hideDevOtp', v ? '1' : '0')} aria-label="إخفاء أكواد التطوير" />
            اخفِ أكواد التحقق من الشاشة (فعّلها بعد ما تربط المزود الحقيقي)
          </label>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="bg-white nb rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-extrabold text-sm flex items-center gap-1.5">
              <Send className="h-4 w-4 text-grape" aria-hidden /> مزود الإيميل — أكواد التسجيل بالايميل
            </p>
            <span className={`rounded-lg border-2 border-ink px-2.5 py-1 text-[11px] font-extrabold ${s.emailConfigured ? 'bg-lime' : 'bg-peach'}`}>
              {s.emailConfigured ? 'مربوطة' : 'غير مربوطة — أكواد بتظهر في وضع التطوير'}
            </span>
          </div>
          <Field label="المزود">
            <Select value={s.emailProvider || 'resend'} onValueChange={(v) => upd('emailProvider', v)}>
              <SelectTrigger className="field" aria-label="مزود الإيميل"><SelectValue /></SelectTrigger>
              <SelectContent className="border-[2.5px] border-ink rounded-xl">
                <SelectItem value="resend">Resend — خطة مجانية (100 رسالة/يوم)</SelectItem>
                <SelectItem value="custom">بوابة مخصصة</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {(s.emailProvider || 'resend') === 'resend' ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Resend API Key"><Input type="password" dir="ltr" value={s.resendApiKey || ''} onChange={(e) => upd('resendApiKey', e.target.value)} className="field" autoComplete="new-password" placeholder="re_..." /></Field>
              <Field label="عنوان المرسل (From)"><Input dir="ltr" value={s.emailFromAddress || ''} onChange={(e) => upd('emailFromAddress', e.target.value)} className="field" placeholder="onboarding@resend.dev" /></Field>
              <Field label="اسم المرسل"><Input dir="ltr" value={s.emailFromName || ''} onChange={(e) => upd('emailFromName', e.target.value)} className="field" /></Field>
              <p className="sm:col-span-2 text-[11px] font-bold text-muted-foreground leading-relaxed">
                ابدأ بـ onboarding@resend.dev (شغالة فورًا مجانًا) — ولما تربط دومينك من لوحة Resend غيّر العنوان لـ no-reply@yourdomain.com.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <Field label="رابط البوابة (POST JSON — to / subject / html)">
                  <Input dir="ltr" value={s.emailGatewayUrl || ''} onChange={(e) => upd('emailGatewayUrl', e.target.value)} className="field" placeholder="https://your-email-provider.example.com/api/send" />
                </Field>
              </div>
              <Field label="مفتاح البوابة (Bearer)"><Input type="password" dir="ltr" value={s.emailGatewayKey || ''} onChange={(e) => upd('emailGatewayKey', e.target.value)} className="field" placeholder="••••••" /></Field>
              <Field label="اسم المرسل"><Input dir="ltr" value={s.emailFromName || ''} onChange={(e) => upd('emailFromName', e.target.value)} className="field" /></Field>
            </div>
          )}
        </div>
      </Reveal>

      {isSuper && (
        <Reveal delay={0.12}>
          <div className="bg-white nb rounded-2xl p-5 space-y-4">
            <p className="font-extrabold text-sm flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-grape" aria-hidden /> كلمة سر الأدمن — الطبقة التانية للحماية
            </p>
            <p className="text-xs font-bold text-muted-foreground">
              كل مسؤول بيدخل بكود واتساب على رقمه + كلمة السر دي. غيّرها بانتظام ومتشاركهاش مع حد مش مسؤول.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="كلمة السر الحالية">
                <Input type="password" dir="ltr" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} className="field" autoComplete="current-password" />
              </Field>
              <Field label="الجديدة (8+ حروف وأرقام)">
                <Input type="password" dir="ltr" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} className="field" autoComplete="new-password" />
              </Field>
              <Field label="تأكيد الجديدة">
                <Input type="password" dir="ltr" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} className="field" autoComplete="new-password" />
              </Field>
            </div>
            <Button
              onClick={changePassword}
              disabled={pwBusy || !pwForm.current || pwForm.next.length < 8 || pwForm.next !== pwForm.confirm}
              className="gap-1.5 font-extrabold bg-grape text-cream border-[3px] border-ink rounded-xl shadow-[3px_3px_0_0_var(--ink)] hover:bg-grape/90 min-h-[46px] disabled:opacity-50 disabled:shadow-none"
            >
              {pwBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />} تغيير كلمة السر
            </Button>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.15}>
        <div className="bg-lilac/50 border-[3px] border-ink rounded-2xl p-5 space-y-3">
          <p className="font-extrabold text-sm">اختبر البوابات قبل ما تعتمدها</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={testTarget}
              onChange={(e) => setTestTarget(e.target.value)}
              placeholder="رقم أو إيميل للتجربة"
              className="flex-1 font-bold bg-white border-[2.5px] border-ink rounded-xl h-12"
              dir="ltr"
              aria-label="هدف رسالة التجربة"
            />
            <Button onClick={() => testSend('whatsapp')} disabled={testing !== null || !testTarget} variant="outline" className="gap-1.5 font-extrabold border-[2.5px] border-ink rounded-xl bg-white hover:bg-lime/40 min-h-[48px]">
              {testing === 'whatsapp' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} تجربة واتساب
            </Button>
            <Button onClick={() => testSend('sms')} disabled={testing !== null || !testTarget} variant="outline" className="gap-1.5 font-extrabold border-[2.5px] border-ink rounded-xl bg-white hover:bg-lime/40 min-h-[48px]">
              {testing === 'sms' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} تجربة SMS
            </Button>
            <Button onClick={() => testSend('email')} disabled={testing !== null || !testTarget} variant="outline" className="gap-1.5 font-extrabold border-[2.5px] border-ink rounded-xl bg-white hover:bg-lime/40 min-h-[48px]">
              {testing === 'email' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} تجربة إيميل
            </Button>
          </div>
        </div>
      </Reveal>

      <Button onClick={save} disabled={saving} className="w-full min-h-[54px] text-base font-extrabold rounded-xl border-[3px] border-ink bg-lime text-ink shadow-[4px_4px_0_0_var(--ink)] hover:bg-lime/90 disabled:opacity-50">
        {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : 'حفظ الإعدادات'}
      </Button>
    </div>
  )
}

// ---------- عناصر مساعدة ----------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-extrabold text-xs">{label}</Label>
      {children}
    </div>
  )
}

function CenterSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-7 w-7 animate-spin text-grape" aria-label="تحميل" />
    </div>
  )
}
