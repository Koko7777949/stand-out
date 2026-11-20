'use client'

import {
  CalendarDays, Clock, MapPin, Users, Ticket, Share2, Download, BadgeCheck,
  Coins, Trophy, Gift, Zap, Target, ArrowLeft, Lock,
} from 'lucide-react'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { Reveal } from './Reveal'
import { Spark } from './Logo'
import CountUp from '@/components/reactbits/CountUp'
import type { EventPayload } from '@/lib/types'

function SectionHead({ tag, title, sub }: { tag: string; title: string; sub?: string }) {
  return (
    <div className="mb-10">
      <span className="inline-block bg-ink text-lime font-serial font-bold text-xs tracking-[0.25em] rounded-lg px-3 py-1.5 mb-4" dir="ltr">
        {tag}
      </span>
      <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">{title}</h2>
      {sub && <p className="mt-3 text-muted-foreground font-bold max-w-2xl leading-relaxed">{sub}</p>}
    </div>
  )
}

// ---- عن القمة ----
export function AboutSection({ qualified }: { qualified: number }) {
  return (
    <section id="about" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24" aria-labelledby="about-title">
      <Reveal>
        <SectionHead
          tag="ABOUT THE SUMMIT"
          title="قمة بتقعد من 11 سنة… ولسه بتكبر"
          sub="Stand Out مش يوم كلام — يوم بتلمس فيه مستقبلك بإيدك: شركات، جامعات، مؤسسين، وورش شغل حقيقية. منظمينها مبادرة Stand Out — مسار، والمنصة دي بتضمن إن مقعدك محسوم لحد ما توصل."
        />
      </Reveal>

      <div className="grid sm:grid-cols-3 gap-4">
        <Reveal delay={0}>
          <div className="nb nb-pop rounded-3xl bg-lilac p-6 h-full rotate-[-0.5deg]">
            <Users className="h-7 w-7 text-ink" aria-hidden />
            <p className="mt-4 font-display font-extrabold text-4xl" dir="ltr">
              <CountUp to={80000} separator="," duration={2.2} trigger="view" />
            </p>
            <p className="text-sm font-bold mt-1">طالب حضروا النسخ اللي فاتت على مدار 11 سنة</p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="nb nb-pop rounded-3xl bg-peach p-6 h-full rotate-[0.75deg]">
            <Zap className="h-7 w-7 text-ink" aria-hidden />
            <p className="mt-4 font-display font-extrabold text-4xl" dir="ltr">1 يوم</p>
            <p className="text-sm font-bold mt-1">من 10 الصبح لـ 6 المساء — ورش، بوتات، ومقابلات مباشرة</p>
          </div>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="nb nb-pop rounded-3xl bg-lime p-6 h-full rotate-[-0.75deg]">
            <Target className="h-7 w-7 text-ink" aria-hidden />
            <p className="mt-4 font-display font-extrabold text-4xl" dir="ltr">{qualified}</p>
            <p className="text-sm font-bold mt-1">دعوة مؤكدة على المنصة الموسم ده — وأنت ممكن تكون اللي بعدها</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ---- تفاصيل الايفنت ----
export function DetailsSection({ event }: { event: EventPayload | null }) {
  const facts: { icon: React.ReactNode; label: string; value: string; bg: string }[] = [
    {
      icon: <CalendarDays className="h-5 w-5" aria-hidden />,
      label: 'الموعد',
      value: 'السبت 21 نوفمبر 2026',
      bg: 'bg-lilac',
    },
    {
      icon: <Clock className="h-5 w-5" aria-hidden />,
      label: 'الوقت',
      value: 'من 10:00 الصبح لـ 6:00 المساء',
      bg: 'bg-peach',
    },
    {
      icon: <MapPin className="h-5 w-5" aria-hidden />,
      label: 'المكان',
      value: `${event?.venue || 'The GrEEK Campus'} — 28 شارع فلكي، باب اللوق، ${event?.city || 'وسط البلد، القاهرة'}`,
      bg: 'bg-lime',
    },
    {
      icon: <Users className="h-5 w-5" aria-hidden />,
      label: 'السن المسموح',
      value: `من ${event?.ageMin || 16} لـ ${event?.ageMax || 45} سنة`,
      bg: 'bg-lilac',
    },
    {
      icon: <Ticket className="h-5 w-5" aria-hidden />,
      label: 'المقاعد',
      value: `${event?.capacity || 500} مقعد — بيقفل الحجز ${event ? new Date(event.bookingClosesAt).toLocaleDateString('ar-EG') : 'قبل الايفنت'}`,
      bg: 'bg-peach',
    },
    {
      icon: <BadgeCheck className="h-5 w-5" aria-hidden />,
      label: 'التذكرة',
      value: 'QR موقّع من النظام + رقم تسلسلي خاص فيك',
      bg: 'bg-lime',
    },
  ]

  return (
    <section id="details" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24" aria-labelledby="details-title">
      <Reveal>
        <SectionHead
          tag="EVENT DETAILS"
          title="كل التفاصيل في ورقة واحدة"
          sub="مفيش مفاجآت آخر لحظة — الموعد، المكان، وشروط الحجز كلها قدامك."
        />
      </Reveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {facts.map((f, i) => (
          <Reveal key={f.label} delay={(i % 3) * 0.08}>
            <div className={`${f.bg} nb nb-pop rounded-3xl p-5 h-full`}>
              <div className="flex items-center gap-2.5 mb-3 text-ink">
                {f.icon}
                <span className="text-sm font-extrabold text-ink/70">{f.label}</span>
              </div>
              <p className="font-extrabold leading-snug">{f.value}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ---- ازاي تحجز ----
export function StepsSection() {
  const steps = [
    {
      n: '01',
      title: 'سجّل دخول',
      body: 'برقم موبايلك أو حساب جوجل — دقيقة واحدة ومفيش بيانات زيادة.',
      bg: 'bg-lilac',
      icon: <BadgeCheck className="h-6 w-6" aria-hidden />,
    },
    {
      n: '02',
      title: 'اكتب بياناتك',
      body: 'الاسم زي الهوية، السن، والمحافظة — النظام بيصدرلك رقم تسلسلي خاص فيك.',
      bg: 'bg-peach',
      icon: <Ticket className="h-6 w-6" aria-hidden />,
    },
    {
      n: '03',
      title: 'أكّد مقعدك',
      body: 'رسوم تأكيد بسيطة عبر InstaPay أو أي محفظة إلكترونية — وبعد التأكيد تذكرتك بتتحرر فورًا.',
      bg: 'bg-lime',
      icon: <BadgeCheck className="h-6 w-6" aria-hidden />,
    },
    {
      n: '04',
      title: 'حمّل وشارك',
      body: 'زرار التحميل بيظهر تلقائي بـ QR موقّع — وشير لينكك الشخصي واجمع نقاط وجوائز.',
      bg: 'bg-lilac',
      icon: <Share2 className="h-6 w-6" aria-hidden />,
    },
  ]

  return (
    <section id="steps" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24" aria-labelledby="steps-title">
      <Reveal>
        <SectionHead
          tag="HOW IT WORKS"
          title="من السيجن أب لالتذكرة في 4 خطوات"
          sub="كل خطوة بتقفل اللي بعدها — لحد ما تدفع، مفيش تحميل. بعد الدفع، كل البوابات بتفتح لوحدها."
        />
      </Reveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.08}>
            <div className={`${s.bg} nb nb-pop rounded-3xl p-6 h-full relative`}>
              <span className="font-display font-extrabold text-5xl text-ink/15 absolute top-3 left-4 select-none" dir="ltr" aria-hidden>
                {s.n}
              </span>
              <div className="h-11 w-11 rounded-xl border-[3px] border-ink bg-white flex items-center justify-center mb-4">
                {s.icon}
              </div>
              <h3 className="font-extrabold text-lg mb-2">{s.title}</h3>
              <p className="text-sm font-bold text-ink/75 leading-relaxed">{s.body}</p>
              {i < 3 && <ArrowLeft className="hidden lg:block h-5 w-5 text-ink/40 absolute top-1/2 -left-6" aria-hidden />}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ---- نظام النقاط ----
export function PointsSection({ onCta, authenticated }: { onCta: () => void; authenticated: boolean }) {
  return (
    <section id="points" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24" aria-labelledby="points-title">
      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
        <Reveal>
          <SectionHead
            tag="INVITE & EARN"
            title="ادعُ أصحابك… واجمع نقاط تتفصّل"
            sub="بعد ما تأكد مقعدك، بوابه المشاركة بتفتح ليك بلينك شخصي. كل صديق يسجل ويأكد حسابه من لينكك = نقطة في رصيدك، والمستويات الأعلى ليها بونص — والنقاط بتتحول جوائز حقيقية في الايفنت."
          />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onCta}
              className="nb-pop bg-grape text-cream nb font-extrabold rounded-2xl px-7 min-h-[52px] inline-flex items-center gap-2"
            >
              <Coins className="h-5 w-5" aria-hidden />
              {authenticated ? 'افتح بوابتك' : 'ابدأ دلوقتي'}
            </button>
            <span className="inline-flex items-center gap-2 bg-white nb-sm rounded-xl px-4 text-sm font-bold">
              <Spark className="h-4 w-4 text-grape twinkle" />
              القاعدة: النقاط بتتحسب بس لما صاحبك يسجل ويأكد — مش بس يفتح اللينك
            </span>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-4">
          <Reveal delay={0}>
            <div className="bg-white nb nb-pop rounded-3xl p-5 h-full">
              <Share2 className="h-6 w-6 text-grape" aria-hidden />
              <h3 className="font-extrabold mt-3 mb-1">لينكك الشخصي</h3>
              <p className="text-sm font-bold text-muted-foreground leading-relaxed">
                كود دعوة خاص فيك تبعته واتساب فيسبوك تليجرام — وكل تسجيل حقيقي بيرجع لحسابك.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="bg-lime nb nb-pop rounded-3xl p-5 h-full rotate-[0.5deg]">
              <Trophy className="h-6 w-6" aria-hidden />
              <h3 className="font-extrabold mt-3 mb-1">مستويات وبونص</h3>
              <p className="text-sm font-bold text-ink/75 leading-relaxed">
                أول ما توصل 5 أصحاب مؤكدين بياخدلك بونص، و10 بونص أكبر — والليدربورد بيكلمنك.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="bg-peach nb nb-pop rounded-3xl p-5 h-full rotate-[-0.5deg]">
              <Gift className="h-6 w-6" aria-hidden />
              <h3 className="font-extrabold mt-3 mb-1">جدول الجوائز</h3>
              <p className="text-sm font-bold text-ink/75 leading-relaxed">
                من 5 نقاط تبدأ تستبدل: مرشح صدامة، كاتات الايفنت، ولانش — لحد مقاعد VIP.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="bg-white nb nb-pop rounded-3xl p-5 h-full">
              <Lock className="h-6 w-6 text-grape" aria-hidden />
              <h3 className="font-extrabold mt-3 mb-1">حماية من التلاعب</h3>
              <p className="text-sm font-bold text-muted-foreground leading-relaxed">
                كل إحالة بتتراجع: نفس الجهاز، حسابات مكررة، أو تلاعب باللينك بيتقفل ويتمسح من الدفتر.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ---- الأسئلة الشائعة ----
const FAQS = [
  {
    q: 'الدخول مجاني… وليه في رسوم تأكيد؟',
    a: 'الدخول على القمة نفسها مجاني بالكامل. رسوم التأكيد البسيطة بتنظم المقاعد — بتقفل مقعدك باسمك وتمنع الحجز الوهمي، وبترد في حالة إلغاء الايفنت من التنظيم.',
  },
  {
    q: 'ليه مفيش زرار تحميل قبل الدفع؟',
    a: 'عشان التذكرة تشتغل لازم تتأكد. قبل التأكيد التذكرة بتظهرلك بمعاينة مقفولة بعلامة مائية — والـ QR الحقيقي بيتولد ومتوقّع من السيرفر بعد الدفع بس.',
  },
  {
    q: 'ازاي تتحسب نقاط الدعوات؟',
    a: 'بتبعت لينكك لصاحبك — لازم هو يسجل حساب جديد ويأكد رقمه من نفس اللينك. مجرد فتح اللينك أو التسجيل من غيره مش بيتحسب. أول لينك لكل شخص بس.',
  },
  {
    q: 'أنا في سن الجامعة، أقدر أحضر؟',
    a: 'أيوه — القمة أساسًا لطلاب المدارس والجامعات. الشرط الوحيد إنك تكتب بياناتك صح زي الهوية، لأن التذكرة شخصية وتتدقق عند البوابة.',
  },
  {
    q: 'التذكرة بتشتغل بصورة من الموبايل؟',
    a: 'التحميل الرسمي بيديك صورة و PDF بـ QR موقّع — دي اللي بتتدخل. سكرين شوت غير واضح أو معاد استخدامه بيرفض عند المسح، وأول مسح بيحقق التذكرة.',
  },
  {
    q: 'الرسوم بترد لو مش حضرت؟',
    a: 'في حالة إلغاء الايفنت من التنظيم، الرسوم بترد كاملة لنفس وسيلة الدفع. لو مقدرتش تحضر، المقعد بيتم الاحتفاظ بلفة كاملة لصالحك والرسوم مش بترد.',
  },
]

export function FaqSection() {
  return (
    <section id="faq" className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24" aria-labelledby="faq-title">
      <Reveal>
        <SectionHead tag="FAQ" title="أسئلة بتتكرر… بإجابات مباشرة" />
      </Reveal>
      <Reveal delay={0.08}>
        <Accordion type="single" collapsible className="space-y-3">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="bg-white nb rounded-2xl px-5 border-none !border-b-0 last:border-none"
            >
              <AccordionTrigger className="font-extrabold text-base sm:text-lg py-4 hover:no-underline [&>svg]:h-5 [&>svg]:w-5">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm font-bold text-muted-foreground leading-relaxed pb-5">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  )
}
