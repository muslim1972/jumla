export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 gap-4">
      <div className="w-full max-w-md bg-card border border-border/40 shadow-sm rounded-2xl p-6 space-y-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/2 rounded-full bg-muted" />
            <div className="h-2.5 w-1/3 rounded-full bg-muted" />
          </div>
        </div>

        <div className="h-px bg-border/60" />

        <div className="space-y-3">
          <div className="h-3 w-full rounded-full bg-muted" />
          <div className="h-3 w-5/6 rounded-full bg-muted" />
          <div className="h-3 w-2/3 rounded-full bg-muted" />
        </div>

        <div className="h-10 w-full rounded-xl bg-primary/20" />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">جاري التحميل...</p>
    </div>
  )
}
