"use client"

import { useState } from "react"
import { TopUpModal } from "./top-up-modal"
import { Wallet, ArrowDownRight, ArrowUpRight, Clock, Plus, ShieldCheck, ChevronLeft } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import Link from "next/link"

interface Transaction {
  id: string
  amount: number
  type: string
  status: string
  reference_id: string
  description: string
  created_at: string
}

interface WalletDashboardProps {
  initialWallet: any
  initialTransactions: Transaction[]
}

export function WalletDashboard({ initialWallet, initialTransactions }: WalletDashboardProps) {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false)

  // This can be synced with real-time subscriptions in the future, for now it relies on revalidatePath
  const wallet = initialWallet
  const transactions = initialTransactions

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) return <ArrowDownRight className="w-5 h-5 text-green-500" />
    return <ArrowUpRight className="w-5 h-5 text-red-500" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black flex items-center gap-3">
          <Wallet className="w-8 h-8 text-brand-blue" />
          المحفظة
        </h1>
        <Link 
          href="/dashboard"
          className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-full transition-all text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4 rotate-180" />
          العودة
        </Link>
      </div>

      {/* Main Wallet Card (Glassmorphism / Credit Card style) */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 text-white shadow-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-blue border border-white/10">
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-brand-orange/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-12">
            <div className="flex items-center gap-2 text-white/80">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">رصيد محمي وموثق</span>
            </div>
            {/* Fake Chip */}
            <div className="w-12 h-10 bg-yellow-600/50 rounded-md border border-yellow-500/30 flex flex-col justify-around py-1 px-2 opacity-80">
              <div className="w-full h-px bg-yellow-500/30"></div>
              <div className="w-full h-px bg-yellow-500/30"></div>
              <div className="w-full h-px bg-yellow-500/30"></div>
            </div>
          </div>

          <div className="space-y-1 mb-8">
            <p className="text-white/70 text-sm font-medium">الرصيد المتاح</p>
            <div className="text-5xl font-black tracking-tighter flex items-end gap-2">
              {parseFloat(wallet?.balance || "0").toLocaleString('en-US')} 
              <span className="text-xl font-bold text-white/60 mb-2">د.ع</span>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={() => setIsTopUpOpen(true)}
              className="flex items-center gap-2 bg-white text-brand-blue hover:bg-white/90 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              شحن الرصيد
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-orange" />
            سجل الحركات
          </h2>
        </div>
        
        <div className="divide-y">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              لا توجد حركات سابقة في المحفظة.
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {getTransactionIcon(tx.type, tx.amount)}
                  </div>
                  <div>
                    <h4 className="font-bold">{tx.description || tx.type}</h4>
                    <p className="text-sm text-muted-foreground" dir="ltr" style={{textAlign: 'right'}}>
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale: ar })}
                    </p>
                    {tx.reference_id && (
                      <p className="text-xs text-muted-foreground/60 mt-1">الرقم المرجعي: {tx.reference_id}</p>
                    )}
                  </div>
                </div>
                <div className={`text-lg font-black text-left ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`} dir="ltr">
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-US')} د.ع
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TopUpModal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} />
    </div>
  )
}
