"use client"

import { useState, useEffect } from "react"
import { Award, Wallet } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

export function RewardsSummary({ isOpen }: { isOpen: boolean }) {
  const [userTier, setUserTier] = useState<string | null>(null)
  const [userPoints, setUserPoints] = useState<number>(0)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          const { data } = await supabase.from('profiles').select('tier, points').eq('id', user.id).single()
          if (data) {
            if (data.tier) setUserTier(data.tier)
            if (data.points) setUserPoints(data.points)
          }
        }
      })
    }
  }, [isOpen])

  if (!userTier) return null

  return (
    <div className="flex items-center gap-2">
      <a href="/wallet" className="flex items-center justify-center bg-green-500/10 p-2 rounded-xl border border-green-500/20 hover:bg-green-500/20 transition-colors" title="المحفظة">
        <Wallet className="w-5 h-5 text-green-600" />
      </a>
      <a href="/rewards" className="flex flex-col items-center justify-center bg-brand-orange/10 px-3 py-1.5 rounded-xl border border-brand-orange/20 hover:bg-brand-orange/20 transition-colors">
        <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">{userTier}</span>
        <span className="text-sm font-black text-brand-orange flex items-center gap-1">
          {userPoints?.toLocaleString() || 0}
          <Award className="w-3 h-3" />
        </span>
      </a>
    </div>
  )
}
