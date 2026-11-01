path_wh = 'src/features/warehouse/components/warehouse-hub.tsx'
with open(path_wh, 'r', encoding='utf-8') as f:
    text_wh = f.read()

# 1. Add ChevronRight, ChevronLeft to imports
if 'ChevronRight' not in text_wh:
    text_wh = text_wh.replace('import { Loader2,', 'import { ChevronRight, ChevronLeft, Loader2,', 1)

# 2. Top container
old_top = '<div className="container mx-auto px-4 py-6 max-w-6xl space-y-4">'
new_top = '<div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3.5 max-w-6xl space-y-2.5 sm:space-y-3">'
if old_top in text_wh:
    text_wh = text_wh.replace(old_top, new_top, 1)

# 3. KPIs contrast and compact styling
old_kpis = """          {/* المؤشرات */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {visibleKpis.map(k => (
              <div key={k.label} className="rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${k.cls}`}><k.icon className="w-4 h-4" /></div>
                <div className="min-w-0">
                  <div className="font-black text-base sm:text-lg truncate">{k.value}</div>
                  <div className="text-[10px] text-muted-foreground">{k.label}</div>
                </div>
              </div>
            ))}
          </div>"""

new_kpis = """          {/* المؤشرات المحسنة عالية التباين والمدمجة */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            {visibleKpis.map(k => (
              <div key={k.label} className="rounded-xl border border-border/80 bg-card p-2 sm:p-2.5 flex items-center gap-2 shadow-2xs">
                <div className={`p-1.5 rounded-lg shrink-0 ${k.cls}`}><k.icon className="w-4 h-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-xs sm:text-sm text-foreground truncate">{k.value}</div>
                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{k.label}</div>
                </div>
              </div>
            ))}
          </div>"""

if "\r\n" in text_wh:
    old_kpis = old_kpis.replace("\n", "\r\n")
    new_kpis = new_kpis.replace("\n", "\r\n")

if old_kpis in text_wh:
    text_wh = text_wh.replace(old_kpis, new_kpis, 1)
    print("SUCCESS: Updated KPIs in warehouse-hub.tsx")
else:
    print("Warning: old_kpis not found")

# 4. Sub-tabs with smart buttons and hidden scrollbar
old_tabs = """          {/* تبويبات المركز */}
          <div className="flex gap-1 border-b border-border/60 overflow-x-auto">
            {([
              { id: "items", label: "المواد", icon: Boxes, show: true },
              { id: "add", label: "إضافة مواد", icon: Plus, show: true },
              { id: "deductions", label: "طلبات الطرح", icon: FileMinus, show: canWarehouse, badge: pendingDeductionsCount },
              { id: "staff", label: "فريق العمل", icon: Users, show: canManageStaff },
              { id: "movements", label: "دفتر الحركات", icon: Activity, show: !isStaff },
              { id: "activity", label: "سجل التغييرات", icon: ScrollText, show: !isStaff },
            ] as { id: HubTab; label: string; icon: typeof Users; show: boolean; badge?: number }[]).filter(t => t.show).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                  tab === t.id ? "border-brand-orange text-brand-orange" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                {t.badge != null && t.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-brand-orange text-white font-black">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>"""

new_tabs = """          {/* تبويبات المركز مع أسهم تحريك ذكية بدون سكرولبار */}
          <div className="relative flex items-center gap-1 border-b border-border/60">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("wh-tabs-container");
                if (el) el.scrollBy({ left: 140, behavior: "smooth" });
              }}
              aria-label="تمرير التبويبات لليمين"
              className="shrink-0 w-6 h-6 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <div 
              id="wh-tabs-container"
              className="flex gap-1 overflow-x-auto flex-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
            >
              {([
                { id: "items", label: "المواد", icon: Boxes, show: true },
                { id: "add", label: "إضافة مواد", icon: Plus, show: true },
                { id: "deductions", label: "طلبات الطرح", icon: FileMinus, show: canWarehouse, badge: pendingDeductionsCount },
                { id: "staff", label: "فريق العمل", icon: Users, show: canManageStaff },
                { id: "movements", label: "دفتر الحركات", icon: Activity, show: !isStaff },
                { id: "activity", label: "سجل التغييرات", icon: ScrollText, show: !isStaff },
              ] as { id: HubTab; label: string; icon: typeof Users; show: boolean; badge?: number }[]).filter(t => t.show).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    tab === t.id ? "border-brand-orange text-brand-orange" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                  {t.badge != null && t.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-orange text-white font-black">
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("wh-tabs-container");
                if (el) el.scrollBy({ left: -140, behavior: "smooth" });
              }}
              aria-label="تمرير التبويبات لليسار"
              className="shrink-0 w-6 h-6 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>"""

if "\r\n" in text_wh:
    old_tabs = old_tabs.replace("\n", "\r\n")
    new_tabs = new_tabs.replace("\n", "\r\n")

if old_tabs in text_wh:
    text_wh = text_wh.replace(old_tabs, new_tabs, 1)
    print("SUCCESS: Updated sub-tabs in warehouse-hub.tsx")
else:
    print("Warning: old_tabs not found")

# 5. Materials Table max height container
old_table = """                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground bg-muted/40 border-b border-border">"""

new_table = """                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs">
                        <tr className="text-muted-foreground border-b border-border">"""

if "\r\n" in text_wh:
    old_table = old_table.replace("\n", "\r\n")
    new_table = new_table.replace("\n", "\r\n")

if old_table in text_wh:
    text_wh = text_wh.replace(old_table, new_table, 1)
    print("SUCCESS: Updated materials table container in warehouse-hub.tsx")
else:
    print("Warning: old_table not found")

with open(path_wh, 'w', encoding='utf-8') as f:
    f.write(text_wh)
