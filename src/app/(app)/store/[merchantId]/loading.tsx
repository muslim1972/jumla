import { Loader2, Store } from "lucide-react"

export default function StoreLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="p-4 rounded-full bg-brand-blue/10 animate-pulse">
        <Store className="w-10 h-10 text-brand-blue" />
      </div>
      <div className="flex items-center gap-2 text-brand-blue font-bold">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>جاري تحميل متجر التاجر...</span>
      </div>
    </div>
  )
}
