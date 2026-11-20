import { db } from '@/lib/db'
import { hashPassword } from '@/lib/security'
import { normalizePhone } from '@/lib/otp'
import { uniqueReferralCode } from '@/lib/referrals'
import { setSettingPrivate, getPrivateSetting } from '@/lib/settings'

// تهيئة النظام مرة واحدة — بتشتغل أول ما السيرفر يتنهض:
// 1) أرقام المسؤولين المعتمدين بيتعملهم super_admin (من البيئة أو الأرقام الافتراضية)
// 2) كلمة سر الأدمن الافتراضية لو لسه مفيش (الطبقة التانية بعد كود الـ SMS)
// الأرقام الافتراضية المسجلة للأدمن: 01200506224 و 01107548985
const DEFAULT_ADMIN_PHONES = '01200506224,01107548985'
const DEFAULT_ADMIN_PASSWORD = 'StandOut@2026'

let memo: Promise<void> | null = null

export function ensureBootstrap(): Promise<void> {
  if (!memo) {
    memo = run().catch((e) => {
      memo = null // نسمح بإعادة المحاولة لو فشلت
      throw e
    })
  }
  return memo
}

async function run(): Promise<void> {
  const done = await db.setting.findUnique({ where: { key: 'bootstrapV3' } })
  if (done?.value === '1') return

  // 1) أرقام المسؤولين
  const rawList = (process.env.ADMIN_PHONES || DEFAULT_ADMIN_PHONES)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  for (const item of rawList) {
    const phone = normalizePhone(item)
    if (!phone) continue
    try {
      const existing = await db.user.findUnique({ where: { phone } })
      if (existing) {
        if (existing.role !== 'super_admin' || !existing.name) {
          await db.user.update({
            where: { id: existing.id },
            data: {
              role: 'super_admin',
              status: 'active',
              name: existing.name || 'Stand Out Admin',
              phoneVerifiedAt: existing.phoneVerifiedAt || new Date(),
            },
          })
        }
      } else {
        await db.user.create({
          data: {
            name: 'Stand Out Admin',
            phone,
            phoneVerifiedAt: new Date(),
            role: 'super_admin',
            provider: 'phone',
            referralCode: await uniqueReferralCode(),
            consentAt: new Date(),
          },
        })
      }
    } catch {
      // مش هنخلي فشل رقم واحد يوقف التهيئة
    }
  }

  // 2) كلمة سر الأدمن الافتراضية
  const existingHash = await getPrivateSetting('adminPasswordHash')
  if (!existingHash) {
    await setSettingPrivate('adminPasswordHash', hashPassword(DEFAULT_ADMIN_PASSWORD))
    await setSettingPrivate('adminPasswordChangedAt', new Date().toISOString())
  }

  // 3) حسابات استلام الفلوس الافتراضية — انستاباي + المحافظات، بأرقام الأدمن كنقطة بداية
  //    (الأدمن بيعدل الأرقام الحقيقية من اللوحة — طرق استلام الدفع)
  const accountsCount = await db.paymentAccount.count()
  if (accountsCount === 0) {
    const firstPhone = (rawList[0] || '01200506224').replace(/\D/g, '')
    const defaults: {
      method: string
      label: string
      accountName: string
      accountNumber: string
      deepLinkTemplate: string
      instructions: string
      sortOrder: number
    }[] = [
      {
        method: 'instapay',
        label: 'InstaPay',
        accountName: 'Stand Out',
        accountNumber: `${firstPhone}@instapay`,
        deepLinkTemplate: 'ipn://{account}?amount={amount}&ref={reference}',
        instructions: 'زر الدفع بيفتح تطبيق انستاباي — ولو مفتحش انسخ العنوان وافتحه يدويًا.',
        sortOrder: 1,
      },
      {
        method: 'vodafone_cash',
        label: 'Vodafone Cash',
        accountName: 'Stand Out',
        accountNumber: firstPhone,
        deepLinkTemplate: 'tel:*9*7*{account}*{amount}#',
        instructions: 'زر الدفع بيفتح الاتصال بكود تحويل فودافون كاش جاهز — اضغط اتصال وكمّل.',
        sortOrder: 2,
      },
      {
        method: 'orange_cash',
        label: 'Orange Cash',
        accountName: 'Stand Out',
        accountNumber: firstPhone,
        deepLinkTemplate: 'tel:*9*79*{account}*{amount}#',
        instructions: 'زر الدفع بيفتح الاتصال بكود تحويل أورنج كاش — راجع الكود من مزودك لو اتغير.',
        sortOrder: 3,
      },
      {
        method: 'etisalat_cash',
        label: 'e& money',
        accountName: 'Stand Out',
        accountNumber: firstPhone,
        deepLinkTemplate: 'tel:*9*7*{account}*{amount}#',
        instructions: 'زر الدفع بيفتح الاتصال بكود تحويل اتصالات كاش — قابل للتعديل من اللوحة.',
        sortOrder: 4,
      },
      {
        method: 'we_pay',
        label: 'WE Pay',
        accountName: 'Stand Out',
        accountNumber: firstPhone,
        deepLinkTemplate: 'tel:*9*7*{account}*{amount}#',
        instructions: 'زر الدفع بيفتح الاتصال بكود تحويل WE Pay — قابل للتعديل من اللوحة.',
        sortOrder: 5,
      },
    ]
    for (const a of defaults) {
      try {
        await db.paymentAccount.create({ data: a })
      } catch (e) {
        // لو اتعملت في نفس اللحظة من عملية تانية — عادي، غير كده نطبع السبب
        console.error('[bootstrap] paymentAccount create failed:', a.method, e)
      }
    }
  }

  await db.setting.upsert({
    where: { key: 'bootstrapV3' },
    update: { value: '1' },
    create: { key: 'bootstrapV3', value: '1' },
  })
}
