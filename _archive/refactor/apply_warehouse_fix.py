path = r"src/features/warehouse/components/warehouse-hub.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update shortage alert
target_shortage = """          {/* تنبيه النقص */}
          {lowItems.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400"><AlertTriangle className="w-4 h-4" /></span>
                <div>
                  <div className="text-sm font-black text-red-600 dark:text-red-400">تنبيه النقص — {lowItems.length} صنف</div>
                  <div className="text-[10px] text-muted-foreground">وصلت للحد الأدنى أو دونه</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                {lowItems.slice(0, 4).map(c => (
                  <button
                    key={c.item.id}
                    onClick={() => { setSelectedItem(c.item); setItemDialogOpen(true) }}
                    className="text-[11px] font-bold bg-background/80 border border-border rounded-lg px-2.5 py-1.5 hover:border-red-500/40"
                  >
                    {c.item.product?.name} — بقي <b className="text-red-600 dark:text-red-400">{formatIQD(c.displayQty)} {c.du}</b>
                  </button>
                ))}
                {lowItems.length > 4 && <span className="text-[11px] text-muted-foreground self-center">+{lowItems.length - 4} أصناف</span>}
              </div>
            </div>
          )}"""

replace_shortage = """          {/* تنبيه النقص — شريط أفقي رشيق عالي المقروئية يستغل الطرفين */}
          {lowItems.length > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-2 sm:p-2.5 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 shrink-0">
                <span className="p-1.5 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-red-600 dark:text-red-400">
                    تنبيه النقص — {lowItems.length} صنف
                  </span>
                  <span className="text-xs font-bold text-foreground/90 dark:text-zinc-200">
                    (وصلت للحد الأدنى أو دونه)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {lowItems.slice(0, 2).map(c => (
                  <button
                    key={c.item.id}
                    onClick={() => { setSelectedItem(c.item); setItemDialogOpen(true) }}
                    className="text-xs font-bold bg-background border border-red-500/30 text-foreground px-2.5 py-1 rounded-lg hover:border-red-500/60 shadow-2xs cursor-pointer transition-colors"
                  >
                    {c.item.product?.name} — بقي <b className="text-red-600 dark:text-red-400">{formatIQD(c.displayQty)} {c.du}</b>
                  </button>
                ))}
                {lowItems.length > 2 && <span className="text-xs font-bold text-foreground/80 self-center">+{lowItems.length - 2} أصناف</span>}
              </div>
            </div>
          )}"""

# 2. Update bounded container max-h and sticky header styling
target_table = """                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs">
                        <tr className="text-muted-foreground border-b border-border">
                          <th className="text-right font-bold p-3">المادة</th>
                          <th className="text-right font-bold p-3 hidden md:table-cell">أسعار البيع</th>
                          <th className="text-right font-bold p-3">الكمية</th>
                          <th className="text-right font-bold p-3 hidden sm:table-cell">حد التنبيه</th>
                          <th className="text-right font-bold p-3">الحالة</th>
                          <th className="text-left font-bold p-3">إجراءات</th>
                        </tr>
                      </thead>"""

replace_table = """                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                  {/* حاوية محددة الارتفاع تستوعب 4 مواد فقط مع ترويسة ثابتة وسكرول داخلي */}
                  <div className="overflow-x-auto max-h-[260px] overflow-y-auto [scrollbar-width:thin]">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10 bg-sky-50 dark:bg-zinc-800 text-sky-950 dark:text-sky-100 border-b border-sky-200 dark:border-zinc-700 backdrop-blur-xs">
                        <tr>
                          <th className="text-right font-black p-2.5">المادة</th>
                          <th className="text-right font-black p-2.5 hidden md:table-cell">أسعار البيع</th>
                          <th className="text-right font-black p-2.5">الكمية</th>
                          <th className="text-right font-black p-2.5 hidden sm:table-cell">حد التنبيه</th>
                          <th className="text-right font-black p-2.5">الحالة</th>
                          <th className="text-left font-black p-2.5">إجراءات</th>
                        </tr>
                      </thead>"""

code_norm = code.replace("\r\n", "\n")
target_shortage_norm = target_shortage.replace("\r\n", "\n")
target_table_norm = target_table.replace("\r\n", "\n")

if target_shortage_norm in code_norm:
    code_norm = code_norm.replace(target_shortage_norm, replace_shortage.replace("\r\n", "\n"), 1)
    print("SHORTAGE: SUCCESS")
else:
    print("SHORTAGE: TARGET NOT FOUND")

if target_table_norm in code_norm:
    code_norm = code_norm.replace(target_table_norm, replace_table.replace("\r\n", "\n"), 1)
    print("TABLE: SUCCESS")
else:
    print("TABLE: TARGET NOT FOUND")

with open(path, "w", encoding="utf-8") as f:
    f.write(code_norm)
