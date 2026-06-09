import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-brand-orange" />
      <p className="text-muted-foreground font-bold animate-pulse">جاري تحميل البيانات...</p>
    </div>
  )
}
