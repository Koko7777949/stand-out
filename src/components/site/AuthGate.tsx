'use client'

import { useState, useRef, useEffect } from 'react'
import { Phone, Mail, ShieldCheck, Loader2, ArrowRight, Lock, MessageSquare, KeyRound, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/client-api'
import { Logo, Spark } from './Logo'
import { toast } from 'sonner'

export function AuthGate({ onAuthed, refCode }: { onAuthed: () => void; refCode: string | null }) {
  return (
    <section className="min-h-[100svh] flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden" aria-labelledby="auth-title">
      {/* حقول ستيكرز خلفية */}
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-lilac border-[3px] border-ink opacity-70" aria-hidden />
      <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-peach border-[3px] border-ink opacity-60" aria-hidden />
      <Spark className="absolute top-24 left-16 h-9 w-9 text-lime twinkle hidden sm:block" aria-hidden />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="lg" stacked />
          <h1 id="auth-title" className="mt-6 text-2xl font-extrabold">على بوابة القمة — سجّل دخول</h1>
          <p className="text-sm font-bold text-muted-foreground mt-2">
            حساب واحد لكل رقم أو إيميل — وكل حساب بيتأكد بكود تحقق حقيقي.
          </p>
          {refCode && (
            <div className="mt-4 inline-flex items-center gap-2 bg-peach border-[3px] border-ink rounded-xl px-4 py-2 text-xs font-extrabold nb-sm rotate-1">
              <Spark className="h-3.5 w-3.5 text-grape" />
              صاحبك دعاك — دعوته بتتحسب له لما تسجل وتأكد
            </div>
          )}
        </div>

        <div className="bg-white nb-lg rounded-3xl p-6 sm:p-7">
          <Tabs defaultValue="phone" dir="rtl">
            <TabsList className="grid w-full grid-cols-2 bg-lilac border-[2.5px] border-ink rounded-xl h-11">
              <TabsTrigger value="phone" className="font-extrabold data-[state=active]:bg-white data-[state=active]:border-[2.5px] data-[state=active]:border-ink rounded-lg">
                برقم الموبايل
              </TabsTrigger>
              <TabsTrigger value="email" className="font-extrabold data-[state=active]:bg-white data-[state=active]:border-[2.5px] data-[state=active]:border-ink rounded-lg">
                بالايميل
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone">
              <PhoneFlow onAuthed={onAuthed} refCode={refCode} />
            </TabsContent>
            <TabsContent value="email">
              <EmailFlow onAuthed={onAuthed} refCode={refCode} />
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs font-bold text-muted-foreground flex items-center justify-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-grape" aria-hidden />
          بياناتك بتتشفير ومتتخزش أرقام حساسة عندنا
        </p>
      </div>
    </section>
  )
}

// نبش الكود على الشاشة في وضع التطوير — لما الأدمن يربط مزود واتساب/إيميل حقيقي الكود مش بيظهر
function DevCodeHint({ code, channel }: { code: string | null; channel: 'whatsapp' | 'email' }) {
  if (!code) return null
  return (
    <p className="text-xs font-bold rounded-lg bg-lilac border-2 border-ink px-3 py-2 flex items-center gap-1.5" dir="ltr">
      <MessageSquare className="h-3.5 w-3.5 text-grape shrink-0" aria-hidden />
      {channel === 'whatsapp' ? 'dev whatsapp' : 'dev email'}: <span className="font-serial text-grape font-extrabold">{code}</span>
    </p>
  )
}

// خطوة كلمة سر الأدمن — الطبقة التانية بعد كود الواتساب (حماية مزدوجة)
function AdminPasswordStep({
  ticket,
  onDone,
}: {
  ticket: string
  onDone: () => void
}) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      await api('/api/auth/admin/confirm', { body: { adminTicket: ticket, password } })
      toast.success('اتأكدت الطبقتين — أهلاً بالأدمن.')
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة غير متوقعة')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl bg-ink text-cream px-4 py-3 flex items-start gap-2.5">
        <ShieldAlert className="h-4.5 w-4.5 text-lime shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="text-xs font-extrabold">حساب أدمن — حماية مزدوجة</p>
          <p className="text-[11px] font-bold text-cream/80 mt-0.5">الكود اتأكد. دلوقتي اكتب كلمة سر الأدمن عشان تفتح اللوحة.</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminpass" className="font-extrabold">كلمة سر الأدمن</Label>
        <div className="relative" dir="ltr">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            id="adminpass"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && password.length >= 4 && confirm()}
            className="pl-10 text-left bg-white border-[2.5px] border-ink rounded-xl h-12"
          />
        </div>
      </div>
      <Button
        onClick={confirm}
        disabled={busy || password.length < 4}
        className="w-full min-h-[50px] font-extrabold text-base rounded-xl border-[3px] border-ink bg-grape text-cream shadow-[4px_4px_0_0_var(--ink)] hover:bg-grape/90 disabled:opacity-50 disabled:shadow-none"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'فتح لوحة التحكم'}
      </Button>
      <p className="text-xs font-bold text-muted-foreground flex items-start gap-1.5">
        <Lock className="h-3.5 w-3.5 text-grape mt-0.5 shrink-0" aria-hidden />
        كلمة السر بتتطلب مرة واحدة بعد كل كود تحقق — وبتتغير من لوحة التحكم.
      </p>
    </div>
  )
}

function PhoneFlow({ onAuthed, refCode }: { onAuthed: () => void; refCode: string | null }) {
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'phone' | 'code' | 'adminpass'>('phone')
  const [adminTicket, setAdminTicket] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [devCode, setDevCode] = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn((v) => v - 1), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  const send = async () => {
    setBusy(true)
    try {
      const r = await api<{ devCode?: string }>('/api/auth/otp/request', { body: { phone } })
      setStep('code')
      setResendIn(60)
      setDevCode(r.devCode || null)
      setTimeout(() => codeRef.current?.focus(), 100)
      toast.success('الكود اتبعت على واتساب على رقمك.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة غير متوقعة')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setBusy(true)
    try {
      const r = await api<{ needsAdminPassword?: boolean; adminTicket?: string }>('/api/auth/otp/verify', { body: { phone, code, refCode } })
      if (r.needsAdminPassword && r.adminTicket) {
        setAdminTicket(r.adminTicket)
        setStep('adminpass')
        return
      }
      toast.success('دخلت بنجاح.')
      onAuthed()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة غير متوقعة')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'adminpass' && adminTicket) {
    return <AdminPasswordStep ticket={adminTicket} onDone={onAuthed} />
  }

  return (
    <div className="mt-5 space-y-4">
      {step === 'phone' ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="phone" className="font-extrabold">رقم الموبايل</Label>
            <div className="relative" dir="ltr">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                id="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="01xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 11))}
                onKeyDown={(e) => e.key === 'Enter' && phone.length === 11 && send()}
                className="pl-10 text-left font-serial tracking-wider bg-white border-[2.5px] border-ink rounded-xl h-12 focus-visible:ring-grape"
              />
            </div>
            <p className="text-xs font-bold text-muted-foreground">بنقبل أرقام الشبكات المصرية: اتصالات، فودافون، أورنج، وي.</p>
            <p className="text-xs font-bold text-grape flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
              كود التحقق هيوصلك على واتساب — متأكد إن واتساب شغال على الرقم ده؟
            </p>
          </div>
          <Button
            onClick={send}
            disabled={busy || phone.length !== 11}
            className="w-full min-h-[50px] font-extrabold text-base rounded-xl border-[3px] border-ink bg-lime text-ink shadow-[4px_4px_0_0_var(--ink)] hover:bg-lime/90 disabled:opacity-50 disabled:shadow-none"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'ابعت كود التحقق'}
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="code" className="font-extrabold">كود التحقق — وصلك على {phone}</Label>
            <Input
              id="code"
              ref={codeRef}
              inputMode="numeric"
              dir="ltr"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verify()}
              className="text-center font-serial text-2xl tracking-[0.5em] bg-white border-[2.5px] border-ink rounded-xl h-14"
            />
            <DevCodeHint code={devCode} channel="whatsapp" />
          </div>
          <Button
            onClick={verify}
            disabled={busy || code.length !== 6}
            className="w-full min-h-[50px] font-extrabold text-base rounded-xl border-[3px] border-ink bg-lime text-ink shadow-[4px_4px_0_0_var(--ink)] hover:bg-lime/90 disabled:opacity-50 disabled:shadow-none"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'تأكيد الدخول'}
          </Button>
          <button
            onClick={() => { if (resendIn === 0 && !busy) { setCode(''); send() } }}
            disabled={resendIn > 0 || busy}
            className="w-full text-sm font-bold text-muted-foreground hover:text-grape disabled:opacity-50"
          >
            {resendIn > 0 ? `إعادة الإرسال بعد ${resendIn} ثانية` : 'أعد إرسال الكود'}
          </button>
          <button onClick={() => setStep('phone')} className="w-full text-xs font-bold text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1">
            <ArrowRight className="h-3.5 w-3.5" aria-hidden /> غيّر الرقم
          </button>
        </>
      )}
    </div>
  )
}

// تسجيل بالايميل — كود تحقق بيتبعت على الإيميل قبل إنشاء الحساب
function EmailFlow({ onAuthed, refCode }: { onAuthed: () => void; refCode: string | null }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'form' | 'code' | 'adminpass'>('form')
  const [adminTicket, setAdminTicket] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [devCode, setDevCode] = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn((v) => v - 1), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  const send = async () => {
    setBusy(true)
    try {
      const r = await api<{ devCode?: string }>('/api/auth/email/request', { body: { email } })
      setStep('code')
      setResendIn(60)
      setDevCode(r.devCode || null)
      setTimeout(() => codeRef.current?.focus(), 100)
      toast.success('كود التحقق اتبعت على إيميلك.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة غير متوقعة')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setBusy(true)
    try {
      const r = await api<{ needsAdminPassword?: boolean; adminTicket?: string }>('/api/auth/email/verify', { body: { name, email, code, refCode } })
      if (r.needsAdminPassword && r.adminTicket) {
        setAdminTicket(r.adminTicket)
        setStep('adminpass')
        return
      }
      toast.success('اتسجلت بنجاح.')
      onAuthed()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة غير متوقعة')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'adminpass' && adminTicket) {
    return <AdminPasswordStep ticket={adminTicket} onDone={onAuthed} />
  }

  return (
    <div className="mt-5 space-y-4">
      {step === 'form' ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="ename" className="font-extrabold">الاسم الكامل</Label>
            <Input
              id="ename"
              placeholder="اكتب اسمك زي ما هتظهر في التذكرة"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              className="bg-white border-[2.5px] border-ink rounded-xl h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eemail" className="font-extrabold">البريد الإلكتروني</Label>
            <div className="relative" dir="ltr">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                id="eemail"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim().length >= 2 && email.includes('@') && send()}
                className="pl-10 text-left bg-white border-[2.5px] border-ink rounded-xl h-12"
              />
            </div>
          </div>
          <Button
            onClick={send}
            disabled={busy || name.trim().length < 2 || !email.includes('@')}
            className="w-full min-h-[50px] font-extrabold text-base rounded-xl border-[3px] border-ink bg-lime text-ink shadow-[4px_4px_0_0_var(--ink)] hover:bg-lime/90 disabled:opacity-50 disabled:shadow-none"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'ابعت كود التحقق على الإيميل'}
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="ecode" className="font-extrabold">كود التحقق — وصلك على {email}</Label>
            <Input
              id="ecode"
              ref={codeRef}
              inputMode="numeric"
              dir="ltr"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verify()}
              className="text-center font-serial text-2xl tracking-[0.5em] bg-white border-[2.5px] border-ink rounded-xl h-14"
            />
            <DevCodeHint code={devCode} channel="email" />
          </div>
          <Button
            onClick={verify}
            disabled={busy || code.length !== 6}
            className="w-full min-h-[50px] font-extrabold text-base rounded-xl border-[3px] border-ink bg-lime text-ink shadow-[4px_4px_0_0_var(--ink)] hover:bg-lime/90 disabled:opacity-50 disabled:shadow-none"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'تأكيد التسجيل'}
          </Button>
          <button
            onClick={() => { if (resendIn === 0 && !busy) { setCode(''); send() } }}
            disabled={resendIn > 0 || busy}
            className="w-full text-sm font-bold text-muted-foreground hover:text-grape disabled:opacity-50"
          >
            {resendIn > 0 ? `إعادة الإرسال بعد ${resendIn} ثانية` : 'أعد إرسال الكود'}
          </button>
          <button onClick={() => setStep('form')} className="w-full text-xs font-bold text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1">
            <ArrowRight className="h-3.5 w-3.5" aria-hidden /> غيّر الإيميل
          </button>
        </>
      )}
      <p className="text-xs font-bold text-muted-foreground flex items-start gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-grape mt-0.5 shrink-0" aria-hidden />
        الحساب بيتأكد بكود على إيميلك — ولو حجزت لاحقًا ممكن نطلب تأكيد رقم موبايل كمان.
      </p>
    </div>
  )
}
