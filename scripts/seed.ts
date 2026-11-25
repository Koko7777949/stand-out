import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  // ---- الحساب الأعلى صلاحية (SUPER ADMIN) ----
  // بيدخل بنفس بوابة التحقق (SMS/Email) — الرقم ده بيتسلفّر عليه كود الدخول
  const adminPhone = '01000000000'
  const adminEmail = 'admin@standout.app'
  await db.user.upsert({
    where: { phone: adminPhone },
    update: { role: 'super_admin', phoneVerifiedAt: new Date(), status: 'active' },
    create: {
      name: 'مسؤول النظام',
      phone: adminPhone,
      email: adminEmail,
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
      role: 'super_admin',
      provider: 'phone',
      referralCode: 'STOADMIN1',
      consentAt: new Date(),
      lastLoginAt: new Date(),
    },
  })

  // ---- الايفنت المفعّل (الوحيد اللي بيظهر للعامة) ----
  await db.event.updateMany({ data: { active: false } })
  await db.event.upsert({
    where: { slug: 'standout-summit-2026' },
    update: { active: true },
    create: {
      slug: 'standout-summit-2026',
      name: 'Stand Out Summit 2026',
      startsAt: new Date('2026-11-21T09:00:00+02:00'),
      venue: 'The GrEEK Campus',
      city: 'وسط البلد، القاهرة',
      active: true,
      capacity: 500,
      priceMinor: 10000, // 100 جنيه — رسوم تأكيد الحجز المضمون (الأدمن بيقدر يغيرها من اللوحة)
      holdMinutes: 15,
      bookingClosesAt: new Date('2026-11-19T23:59:00+02:00'),
      ageMin: 16,
      ageMax: 45,
      settings: JSON.stringify({
        doorsAt: '08:00',
        endsAt: '17:00',
        note: 'الدخول مجاني للجمهور العام — الحجز المضمون بيأكدلك مكانك',
        shareText: '',
      }),
    },
  })
  await db.event.updateMany({
    where: { slug: 'byf-summit-2026' },
    data: { active: false },
  })

  // ---- حسابات استلام الفلوس (الأدمن بيعدلها من اللوحة) ----
  const accounts = [
    { method: 'instapay', label: 'InstaPay', accountName: 'Stand Out', accountNumber: 'standout@instapay', sortOrder: 1 },
    { method: 'vodafone_cash', label: 'Vodafone Cash', accountName: 'Stand Out', accountNumber: '01000000000', sortOrder: 2 },
    { method: 'orange_cash', label: 'Orange Cash', accountName: 'Stand Out', accountNumber: '01000000000', sortOrder: 3 },
    { method: 'etisalat_cash', label: 'e& money', accountName: 'Stand Out', accountNumber: '01000000000', sortOrder: 4 },
    { method: 'we_pay', label: 'WE Pay', accountName: 'Stand Out', accountNumber: '01000000000', sortOrder: 5 },
  ]
  for (const a of accounts) {
    const exists = await db.paymentAccount.findFirst({ where: { method: a.method } })
    if (!exists) await db.paymentAccount.create({ data: { ...a, instructions: null } })
  }

  // ---- إعدادات النظام الافتراضية ----
  const defaults: Record<string, string> = {
    siteName: 'Stand Out',
    tagline: 'قمةStand Out السنوية — مكانك بين الأوائل',
    supportEmail: 'support@standout.app',
    supportPhone: '01000000000',
    // بوابة الإيميل العامة (متوافقة مع Resend وغيرها بنفس الشكل)
    emailGatewayUrl: '',
    emailGatewayKey: '',
    emailFromName: 'Stand Out',
    // عرض كود التحقق على الشاشة في وضع التطوير
    hideDevOtp: '0',
  }
  for (const [key, value] of Object.entries(defaults)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } })
  }

  // ---- السفراء (أكواد البرومو — بتتكتب في طلب المراجعة وقت الدفع) ----
  const ambassadors = [
    { code: 'BYF-MAZEN', name: 'مازن — فريق السفراء', note: 'كود تجريبي جاهز للاختبار' },
    { code: 'BYF-SARA', name: 'سارة — فريق السفراء', note: 'كود تجريبي جاهز للاختبار' },
  ]
  for (const a of ambassadors) {
    await db.ambassador.upsert({
      where: { code: a.code },
      update: {},
      create: a,
    })
  }

  // ---- مستويات النقاط ----
  const tiers = [
    { minReferrals: 5, totalPoints: 2 },
    { minReferrals: 10, totalPoints: 5 },
    { minReferrals: 20, totalPoints: 12 },
    { minReferrals: 50, totalPoints: 35 },
  ]
  for (const t of tiers) {
    const exists = await db.pointsTier.findFirst({ where: { minReferrals: t.minReferrals } })
    if (!exists) await db.pointsTier.create({ data: { ...t } })
  }

  // ---- الجوائز ----
  const rewards = [
    {
      name: 'شهادة حضور معتمدة',
      description: 'شهادة إلكترونية باسمك من قمة Stand Out عن مشاركتك في القمة',
      pointsCost: 5,
      stock: 500,
      icon: 'award',
      sortOrder: 1,
    },
    {
      name: 'تيشيرت Stand Out',
      description: 'تيشيرت رسمي بلغة الهوية البصرية للقمة — يتسلم يوم الايفنت من كشك الفريق',
      pointsCost: 10,
      stock: 120,
      icon: 'shirt',
      sortOrder: 2,
    },
    {
      name: 'مقعد VIP + لقاء الخطباء',
      description: 'مقعد في الصفوف الأمامية + جلسة لقاء مخصص مع الخطباء بعد البرنامج',
      pointsCost: 20,
      stock: 25,
      icon: 'crown',
      sortOrder: 3,
    },
  ]
  for (const r of rewards) {
    const exists = await db.reward.findFirst({ where: { name: r.name } })
    if (!exists) await db.reward.create({ data: r })
  }

  console.log('Seed done: super admin + active event + payment accounts + settings + tiers + rewards')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
