import { getWalletData } from "./actions"
import { WalletDashboard } from "@/features/wallet/components/wallet-dashboard"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "المحفظة | جملتي",
}

export default async function WalletPage() {
  const { success, wallet, transactions, error } = await getWalletData()

  if (!success) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-muted-foreground">
        <p>{error || "حدث خطأ غير معروف"}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <WalletDashboard initialWallet={wallet} initialTransactions={transactions || []} />
    </div>
  )
}
