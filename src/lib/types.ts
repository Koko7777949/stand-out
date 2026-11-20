// أنواع مشتركة بين الواجهة والسيرفر

export type MeResponse = {
  ok: boolean
  user?: {
    id: string
    name: string
    phone: string | null
    email: string | null
    phoneVerified: boolean
    emailVerified: boolean
    provider: string
    role: string
    referralCode: string
    hideName: boolean
  }
  points?: { balance: number; qualified: number }
  ticket?: TicketPayload | null
}

export type TicketPayload = {
  id: string
  status: string
  serial: string
  holderName: string
  holderAge: number
  governorate: string
  issuedAt: string | null
  orderId: string
  orderStatus: string
  holdExpiresAt: string | null
  amountMinor: number
  eventName: string
  startsAt: string
  venue: string
  city: string
}

export type IssuedTicket = {
  id: string
  status: string
  serial: string
  holderName: string
  holderAge: number
  governorate: string
  issuedAt?: string
  qrPng: string
}

export type EventPayload = {
  id: string
  name: string
  startsAt: string
  venue: string
  city: string
  capacity: number
  soldCount: number
  priceMinor: number
  currency: string
  holdMinutes: number
  bookingOpensAt?: string
  bookingClosesAt: string
  ageMin: number
  ageMax: number
  settings: Record<string, string>
}

export type EventResponse = {
  ok: boolean
  event: EventPayload | null
  stats?: { sold: number; capacity: number; qualifiedReferrals: number }
}

export type OrderSummary = {
  id: string
  status: string
  amountMinor: number
  currency: string
  holdExpiresAt: string | null
  paymentMethod?: string | null
  paidAt?: string | null
  eventName: string
  startsAt: string
  venue: string
  city: string
}

export type CheckoutResponse = {
  ok: boolean
  error?: string
  paymentId?: string
  providerRef?: string
  amountMinor?: number
  method?: string
  reference?: string
  // لينك فتح تطبيق المحفظة/انستاباي — بيفتح التطبيق على الرقم اللي الأدمن حدده
  deepLink?: string
  instructions?: { title: string; lines: string[]; address?: string; accountName?: string }
}

export type DynamicMethod = { id: string; method: string; label: string }

export type ReferralsResponse = {
  ok: boolean
  referralCode?: string
  points?: { balance: number; qualified: number }
  nextTier?: { minReferrals: number; points: number; remaining: number } | null
  tiers?: { id: string; minReferrals: number; totalPoints: number }[]
  referrals?: { id: string; status: string; createdAt: string; firstName: string }[]
  ledger?: { id: string; delta: number; reason: string; note: string | null; createdAt: string }[]
}

export type RewardsResponse = {
  ok: boolean
  rewards?: { id: string; name: string; description: string; pointsCost: number; stock: number; icon: string }[]
  balance?: number
  redemptions?: { id: string; rewardId: string; pointsSpent: number; status: string; createdAt: string }[]
}

export type LeaderboardResponse = {
  ok: boolean
  leaderboard?: { firstName: string; qualified: number }[]
}

export const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية', 'القليوبية',
  'كفر الشيخ', 'الغربية', 'المنوفية', 'البحيرة', 'الإسماعيلية', 'بورسعيد',
  'السويس', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا',
  'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح', 'شمال سيناء',
  'جنوب سيناء', 'دمياط',
]

export const PAYMENT_METHODS = [
  { id: 'instapay', label: 'InstaPay', hint: 'تحويل فوري بين الحسابات', icon: 'zap' },
  { id: 'vodafone_cash', label: 'Vodafone Cash', hint: 'محفظة إلكترونية', icon: 'wallet' },
  { id: 'orange_cash', label: 'Orange Cash', hint: 'محفظة إلكترونية', icon: 'wallet' },
  { id: 'etisalat_cash', label: 'e& money', hint: 'محفظة إلكترونية', icon: 'wallet' },
  { id: 'we_pay', label: 'WE Pay', hint: 'محفظة إلكترونية', icon: 'wallet' },
  { id: 'card', label: 'فيزا / ماستركارد', hint: 'كروت بنكية وميزة', icon: 'credit-card' },
] as const

export function egp(minor: number): string {
  return `${(minor / 100).toLocaleString('en-US')} جنيه`
}
