# 1. Update layout.tsx
path_layout = 'src/app/(merchant)/layout.tsx'
with open(path_layout, 'r', encoding='utf-8') as f:
    text_layout = f.read()

target_main = '<main className="flex-1 bg-muted/20 pt-4">'
replacement_main = '<main className="flex-1 bg-muted/20 pt-1 sm:pt-2 pb-6">'

if target_main in text_layout:
    text_layout = text_layout.replace(target_main, replacement_main, 1)
    with open(path_layout, 'w', encoding='utf-8') as f:
        f.write(text_layout)
    print("SUCCESS: Updated layout.tsx main padding")
else:
    print("Warning: target_main not found in layout.tsx")

# 2. Update dashboard/page.tsx
path_page = 'src/app/(merchant)/dashboard/page.tsx'
with open(path_page, 'r', encoding='utf-8') as f:
    text_page = f.read()

target_page = """    <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-5 max-w-6xl">
      <section className="mb-2.5 space-y-1.5">
        <MerchantSettings
          initialDeliveryFee={profile?.delivery_fee}
          initialSupportPhone={profile?.support_phone}
        />
        {!isProfileComplete && (
          <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xl flex gap-2 items-start text-destructive text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="font-medium">يجب تحديد أجور التوصيل ورقم الدعم أولاً لتتمكن من إضافة المنتجات.</p>
          </div>
        )}
      </section>

      <div className="space-y-3.5 sm:space-y-4">
          
          {/* Analytics Section - Compact KPI Strip */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-0.5">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-brand-orange" />
                <span>نظرة عامة على المبيعات</span>
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 shadow-2xs">
                <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3">
                  <div className="bg-emerald-500/20 p-2 sm:p-2.5 rounded-lg text-emerald-600 shrink-0">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mb-0.5">مبيعات اليوم</p>
                    <h3 className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums truncate">
                      {todaySales.toLocaleString('en-US')} <span className="text-[10px] sm:text-xs font-bold">د.ع</span>
                    </h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-brand-blue/10 to-brand-blue/5 border-brand-blue/20 shadow-2xs">
                <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3">
                  <div className="bg-brand-blue/20 p-2 sm:p-2.5 rounded-lg text-brand-blue shrink-0">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mb-0.5">إجمالي المبيعات</p>
                    <h3 className="text-sm sm:text-base font-black text-brand-blue dark:text-brand-blue/80 tabular-nums truncate">
                      {totalSales.toLocaleString('en-US')} <span className="text-[10px] sm:text-xs font-bold">د.ع</span>
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>"""

replacement_page = """    <div className="container mx-auto px-2 sm:px-4 py-1.5 sm:py-2.5 max-w-6xl space-y-2 sm:space-y-2.5">
      <section className="space-y-1">
        <MerchantSettings
          initialDeliveryFee={profile?.delivery_fee}
          initialSupportPhone={profile?.support_phone}
        />
        {!isProfileComplete && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-xl flex gap-2 items-start text-destructive text-xs">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="font-medium">يجب تحديد أجور التوصيل ورقم الدعم أولاً لتتمكن من إضافة المنتجات.</p>
          </div>
        )}
      </section>

      <div className="space-y-2.5 sm:space-y-3">
          
          {/* Analytics Section - High Density Sleek Financial Row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shrink-0">
                  <DollarSign className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">مبيعات اليوم:</span>
              </div>
              <div className="font-black text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0" dir="ltr">
                {todaySales.toLocaleString('en-US')} <span className="text-[10px] font-bold">د.ع</span>
              </div>
            </div>

            <div className="bg-brand-blue/10 border border-brand-blue/25 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="p-1 rounded-md bg-brand-blue/20 text-brand-blue shrink-0">
                  <Target className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">إجمالي المبيعات:</span>
              </div>
              <div className="font-black text-xs sm:text-sm text-brand-blue dark:text-brand-blue/90 tabular-nums shrink-0" dir="ltr">
                {totalSales.toLocaleString('en-US')} <span className="text-[10px] font-bold">د.ع</span>
              </div>
            </div>
          </div>"""

if "\r\n" in text_page:
    target_page = target_page.replace("\n", "\r\n")
    replacement_page = replacement_page.replace("\n", "\r\n")

if target_page in text_page:
    text_page = text_page.replace(target_page, replacement_page, 1)
    with open(path_page, 'w', encoding='utf-8') as f:
        f.write(text_page)
    print("SUCCESS: Updated dashboard/page.tsx KPI row")
else:
    print("Warning: target_page not found in dashboard/page.tsx")
