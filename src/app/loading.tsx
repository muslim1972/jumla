import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-brand-orange">
      <Loader2 className="w-12 h-12 animate-spin" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">جاري التحميل...</p>
    </div>
  )
}
