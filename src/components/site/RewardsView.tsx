'use client'

import { useCallback, useEffect, useState } from 'react'
import { Award, Shirt, Crown, Coins, Loader2, Check, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/client-api'
import type { RewardsResponse } from '@/lib/types'
import { toast } from 'sonner'
import { Reveal } from './Reveal'

const ICONS: Record<string, typeof Award> = { award: Award, shirt: Shirt, crown: Crown }
const BANDS = ['bg-lilac', 'bg-peach', 'bg-lime']

// جدول الاستبدال — الخصم بيحصل بـ Transaction واحدة فمفيش نقاط بتتلغب
export function RewardsView() {
  const [data, setData] = useState<RewardsResponse | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await api<RewardsResponse>('/api/rewards')
      setData(r)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في التحميل')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data?.rewards) return null

  const balance = data.balance || 0

  const redeem = async (id: string, name: string, cost: number) => {
    setBusyId(id)
    try {
      await api(`/api/rewards/${id}/redeem`, { method: 'POST' })
      toast.success(`استبدلت «${name}» بـ ${cost} نقطة — متابعة الاستلام مع الفريق في الايفنت.`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'مشكلة في الاستبدال')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 w-full" aria-labelledby="rewards-title">
      <Reveal>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-block bg-ink text-lime font-serial font-bold text-xs tracking-[0.25em] rounded-lg px-3 py-1.5 mb-4" dir="ltr">
              REDEEM
            </span>
            <h1 id="rewards-title" className="text-3xl sm:text-4xl font-extrabold">استبدل نقاطك</h1>
            <p className="text-sm font-bold text-muted-foreground mt-2">الجوائز بتتسلم في الايفنت من كشك الفريق — بالاسم المسجل.</p>
          </div>
          <span className="bg-lilac border-[3px] border-ink rounded-2xl px-5 py-3 inline-flex items-center gap-2 font-extrabold nb-sm">
            <Coins className="h-5 w-5 text-grape" aria-hidden />
            رصيدك: <span dir="ltr">{balance}</span> نقطة
          </span>
        </div>
      </Reveal>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.rewards.map((r, i) => {
          const Icon = ICONS[r.icon] || Award
          const afford = balance >= r.pointsCost
          const inStock = r.stock > 0
          return (
            <Reveal key={r.id} delay={(i % 3) * 0.08}>
              <div className="bg-white nb nb-pop rounded-3xl overflow-hidden flex flex-col h-full">
                <div className={`${BANDS[i % 3]} h-24 border-b-[3px] border-ink flex items-center justify-center`}>
                  <span className="h-14 w-14 rounded-2xl border-[3px] border-ink bg-white flex items-center justify-center rotate-3">
                    <Icon className="h-7 w-7 text-ink" aria-hidden />
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-extrabold leading-snug">{r.name}</h2>
                    <span className="bg-ink text-lime shrink-0 rounded-lg px-2.5 py-1 text-xs font-extrabold border-2 border-ink" dir="ltr">
                      {r.pointsCost} نقاط
                    </span>
                  </div>
                  <p className="text-xs font-bold text-muted-foreground leading-relaxed flex-1">{r.description}</p>
                  <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" aria-hidden />
                    متبقي: <span dir="ltr" className="font-extrabold">{r.stock}</span>
                  </p>
                  <Button
                    onClick={() => redeem(r.id, r.name, r.pointsCost)}
                    disabled={!afford || !inStock || busyId === r.id}
                    className={`w-full min-h-[46px] font-extrabold rounded-xl border-[3px] border-ink ${
                      afford && inStock
                        ? 'bg-lime text-ink shadow-[3px_3px_0_0_var(--ink)] hover:bg-lime/90'
                        : 'bg-white text-muted-foreground shadow-none opacity-70'
                    }`}
                  >
                    {busyId === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : !inStock ? (
                      'المخزون خلص'
                    ) : afford ? (
                      'استبدل الآن'
                    ) : (
                      `محتاج ${r.pointsCost - balance} نقطة كمان`
                    )}
                  </Button>
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>

      {(data.redemptions?.length || 0) > 0 && (
        <Reveal delay={0.05}>
          <div className="bg-white nb rounded-3xl mt-6 p-6">
            <p className="font-extrabold text-sm mb-4">استبدالاتك</p>
            <ul className="space-y-2">
              {data.redemptions!.map((r) => {
                const reward = data.rewards!.find((x) => x.id === r.rewardId)
                return (
                  <li key={r.id} className="flex items-center justify-between rounded-xl bg-lilac/40 border-2 border-ink/50 px-4 py-3 text-sm">
                    <span className="flex items-center gap-2 font-bold">
                      <Check className="h-4 w-4 text-grape" aria-hidden />
                      {reward?.name || 'جائزة'}
                    </span>
                    <span className="font-extrabold text-muted-foreground" dir="ltr">-{r.pointsSpent} نقطة</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </Reveal>
      )}
    </section>
  )
}
