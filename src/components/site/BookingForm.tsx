'use client'

import { useState } from 'react'
import { Loader2, ShieldCheck, Phone, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GOVERNORATES, egp, type MeResponse, type EventPayload } from '@/lib/types'
import { api } from '@/lib/client-api'
import { maskPhone } from '@/lib/format'
import { toast } from 'sonner'
import { Reveal } from './Reveal'

// التحقق المضمّن من رقم الموبايل للحسابات المفتوحة بجوجل
function PhoneVerifyInline({ onVerified }: { onVerified: () => void }) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)

  const request = async () => {
    setBusy(true)
    try {
      const r = await api<{ devCode?: string }>('/api/auth/link-phone', { body: { phone, mode: 'request' } })
      setDevCode(r.devCode || null)
      setSent(true)
      toast.success('الكود اتسلفّر.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    setBusy(true)
    try {
      await api('/api/auth/link-phone', { body: { phone, code, mode: 'verify' } })
      toast.success('الرقم اتأكد.')
      onVerified()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border-[3px] border-ink bg-peach/40 p-5 space-y-4">
      <p className="text-sm font-extrabold flex items-center gap-2">
        <Phone className="h-4 w-4 text-grape" aria-hidden />
        لازم تأكد رقم موبايلك قبل الحجز
      </p>
      <div className="flex flex-col sm:flex-row gap-2" dir="ltr">
        <Input
          inputMode="tel"
          placeholder="01xxxxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 11))}
          className="text-left font-serial bg-white border-[2.5px] border-ink rounded-xl h-12"
        />
        <Button
          onClick={request}
          disabled={busy || phone.length !== 11}
          variant="outline"
          className="shrink-0 font-extrabold border-[2.5px] border-ink rounded-xl bg-white hover:bg-lilac/50 min-h-[48px]"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : sent ? 'أعد الإرسال' : 'ابعت الكود'}
        </Button>
      </div>
      {sent && devCode && (
        <p className="text-xs font-bold rounded-lg bg-lilac border-2 border-ink px-3 py-2 flex items-center gap-1.5 w-fit" dir="ltr">
          <MessageSquare className="h-3.5 w-3.5 text-grape shrink-0" aria-hidden />
          dev whatsapp: <span className="font-serial text-grape font-extrabold">{devCode}</span>
        </p>
      )}
      {sent && (
        <div className="flex flex-col sm:flex-row gap-2" dir="ltr">
          <Input
            inputMode="numeric"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
            className="text-center font-serial tracking-[0.4em] bg-white border-[2.5px] border-ink rounded-xl h-12"
          />
          <Button
            onClick={confirm}
            disabled={busy || code.length !== 6}
            className="shrink-0 font-extrabold bg-lime text-ink border-[2.5px] border-ink rounded-xl min-h-[48px] hover:bg-lime/90"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'تأكيد'}
          </Button>
        </div>
      )}
    </div>
  )
}

export function BookingForm({
  me,
  event,
  onHoldCreated,
  onRefreshMe,
}: {
  me: MeResponse
  event: EventPayload | null
  onHoldCreated: (orderId: string, paid?: boolean) => void
  onRefreshMe: () => void
}) {
  const [name, setName] = useState(me.user?.name || '')
  const [age, setAge] = useState('')
  const [gov, setGov] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)

  const phoneVerified = me.user?.phoneVerified
  const isFree = (event?.priceMinor || 0) === 0

  const submit = async () => {
    setBusy(true)
    try {
      const r = await api<{ order: { id: string; status: string } }>('/api/orders', {
        body: { holderName: name, holderAge: age, governorate: gov, consent },
      })
      const paid = r.order.status === 'PAID'
      toast.success(
        paid
          ? 'مقعدك اتأكد — تذكرتك جاهزة دلوقتي!'
          : 'مقعدك اتحجز وانتظارك للدفع — عندك 15 دقيقة.',
      )
      onRefreshMe()
      onHoldCreated(r.order.id, paid)
    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 409) {
        toast.error(err.message)
        onRefreshMe()
      } else {
        toast.error(err.message || 'مشكلة في الحجز')
      }
    } finally {
      setBusy(false)
    }
  }

  const valid = name.trim().length >= 2 && Number(age) >= (event?.ageMin || 16) && Number(age) <= (event?.ageMax || 45) && !!gov && consent

  return (
    <section className="mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-24 w-full" aria-labelledby="book-title">
      <Reveal>
        <div className="mb-8">
          <span className="inline-block bg-ink text-lime font-serial font-bold text-xs tracking-[0.25em] rounded-lg px-3 py-1.5 mb-4" dir="ltr">
            BOOK YOUR SEAT
          </span>
          <h1 id="book-title" className="text-3xl sm:text-4xl font-extrabold">احجز مقعدك</h1>
          <p className="text-sm font-bold text-muted-foreground mt-2">
            اكتب بياناتك زي ما هتظهر على التذكرة بالظبط — تذكرة واحدة لكل حساب، والرقم التسلسلي بيصدر من نظام القمة بعد التأكيد.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="bg-white nb-lg rounded-3xl p-6 sm:p-8 space-y-5">
          {!phoneVerified && <PhoneVerifyInline onVerified={onRefreshMe} />}

          <div className="space-y-2">
            <Label htmlFor="holder-name" className="font-extrabold">الاسم الكامل (زي الهوية)</Label>
            <Input
              id="holder-name"
              placeholder="مثال: أحمد محمد علي"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              maxLength={60}
              className="bg-white border-[2.5px] border-ink rounded-xl h-12"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="holder-age" className="font-extrabold">السن</Label>
              <Input
                id="holder-age"
                inputMode="numeric"
                dir="ltr"
                placeholder={`${event?.ageMin || 16} - ${event?.ageMax || 45}`}
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                className="text-center font-serial bg-white border-[2.5px] border-ink rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-extrabold">المحافظة</Label>
              <Select value={gov} onValueChange={setGov}>
                <SelectTrigger
                  className="w-full bg-white border-[2.5px] border-ink rounded-xl h-12 font-bold"
                  aria-label="المحافظة"
                >
                  <SelectValue placeholder="اختار محافظتك" />
                </SelectTrigger>
                <SelectContent className="max-h-72 nice-scroll border-[2.5px] border-ink rounded-xl">
                  {GOVERNORATES.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-extrabold">رقم الموبايل (متثبت من حسابك)</Label>
            <div className="rounded-xl bg-lilac/50 border-2 border-ink px-4 py-2.5 text-sm font-serial" dir="ltr">
              {maskPhone(me.user?.phone || null)}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-xl bg-muted/70 border-2 border-ink/30 p-4 cursor-pointer">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <span className="text-xs font-bold leading-relaxed text-muted-foreground">
              أوافق على الشروط والأحكام وسياسة الخصوصية — وأعلم إن التذكرة شخصية ومرتبطة ببياناتي،
              ومفيش استرداد بعد تأكيد الدفع إلا في حالة إلغاء الايفنت من التنظيم.
            </span>
          </label>

          <Button
            onClick={submit}
            disabled={busy || !valid || !phoneVerified}
            className="w-full min-h-[54px] text-base font-extrabold rounded-xl border-[3px] border-ink bg-lime text-ink shadow-[4px_4px_0_0_var(--ink)] hover:bg-lime/90 disabled:opacity-50 disabled:shadow-none"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : `ادفع لتأكيد مقعدك — ${egp(event?.priceMinor || 10000)}`}
          </Button>

          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-grape" aria-hidden />
            بعد الحجز مقعدك بيتم الاحتفاظ به 15 دقيقة بس — الدفع بيتم في صفحة مؤمّنة.
          </p>
        </div>
      </Reveal>
    </section>
  )
}
