import { redirect } from 'next/navigation'

// لينكات الدعوة الشخصية — /i/{code}
// التحويل بيحصل للصفحة الرئيسية مع ?ref={code} — والكود بيتسجل first-touch
// في الكوكيز وليل أوكال ستوراج، والنقاط بتتحسب بس لما الصديق يسجل ويأكد حسابه.
export default async function ReferralLinkPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  // نفس فحص الكود اللي في الواجهة — 4 لـ 16 حرف/رقم
  const clean = decodeURIComponent(code || '').replace(/[^A-Za-z0-9]/g, '')
  if (clean.length >= 4 && clean.length <= 16) {
    redirect(`/?ref=${encodeURIComponent(clean.toUpperCase())}`)
  }
  redirect('/')
}
