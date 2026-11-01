# 1. Update dashboard/page.tsx
page_path = 'src/app/(merchant)/dashboard/page.tsx'
with open(page_path, 'r', encoding='utf-8') as f:
    text = f.read()

target = """    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <section className="mb-8 space-y-3">
        <MerchantSettings
          initialDeliveryFee={profile?.delivery_fee}
          initialSupportPhone={profile?.support_phone}
        />
        {!isProfileComplete && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-2 items-start text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-sm font-medium">يجب تحديد أجور التوصيل ورقم الدعم أولاً لتتمكن من إضافة المنتجات.</p>
          </div>
        )}
      </section>

      <div className="space-y-8">
          
          {/* Analytics Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-brand-orange" />
              نظرة عامة
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                  <div className="bg-emerald-500/20 p-2.5 sm:p-3 rounded-full text-emerald-600 shrink-0">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">مبيعات اليوم</p>
                    <h3 className="text-base sm:text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums truncate">
                      {todaySales.toLocaleString('en-US')} <span className="text-xs sm:text-sm font-bold">د.ع</span>
                    </h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-brand-blue/10 to-brand-blue/5 border-brand-blue/20">
                <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                  <div className="bg-brand-blue/20 p-2.5 sm:p-3 rounded-full text-brand-blue shrink-0">
                    <Target className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">إجمالي المبيعات</p>
                    <h3 className="text-base sm:text-xl font-black text-brand-blue dark:text-brand-blue/80 tabular-nums truncate">
                      {totalSales.toLocaleString('en-US')} <span className="text-xs sm:text-sm font-bold">د.ع</span>
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>"""

replacement = """    <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-5 max-w-6xl">
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

if "\r\n" in text:
    target = target.replace("\n", "\r\n")
    replacement = replacement.replace("\n", "\r\n")

assert target in text, "Target not found in dashboard/page.tsx"
text = text.replace(target, replacement, 1)

with open(page_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: Updated dashboard/page.tsx")

# 2. Update merchant-products-list.tsx
list_path = 'src/features/merchant/components/merchant-products-list.tsx'
with open(list_path, 'r', encoding='utf-8') as f:
    ltext = f.read()

ltarget = """      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">منتجاتي ({products?.length || 0})</h2>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      </div>"""

lreplacement = """      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-base sm:text-lg font-black text-foreground">منتجاتي ({products?.length || 0})</h2>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1 rounded-md transition-colors cursor-pointer",
              viewMode === 'list' ? "bg-background shadow-2xs text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            title="عرض كقائمة"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-1 rounded-md transition-colors cursor-pointer",
              viewMode === 'grid' ? "bg-background shadow-2xs text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            title="عرض كشبكة"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>"""

if "\r\n" in ltext:
    ltarget = ltarget.replace("\n", "\r\n")
    lreplacement = lreplacement.replace("\n", "\r\n")

assert ltarget in ltext, "Target not found in merchant-products-list.tsx"
ltext = ltext.replace(ltarget, lreplacement, 1)

with open(list_path, 'w', encoding='utf-8') as f:
    f.write(ltext)

print("SUCCESS: Updated merchant-products-list.tsx")
