export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 gap-4">
      <div className="w-full max-w-sm bg-card border border-border/40 shadow-sm rounded-2xl p-6 space-y-5 animate-pulse">
        <div className="w-14 h-14 rounded-2xl bg-muted mx-auto" />
        <div className="h-4 w-2/3 rounded-full bg-muted mx-auto" />

        <div className="space-y-3 pt-2">
          <div className="h-10 w-full rounded-xl bg-muted" />
          <div className="h-10 w-full rounded-xl bg-muted" />
        </div>

        <div className="h-10 w-full rounded-xl bg-primary/20" />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">جاري التحميل...</p>
    </div>
  )
}
