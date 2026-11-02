path = r"src/app/(app)/admin/admin-client.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# Make sure CheckCircle2 is imported
if "CheckCircle2" not in code:
    code = code.replace("Check,", "Check, CheckCircle2,", 1)

target_metrics_grid = """      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* New Registrations Card */}
            <Card 
              onClick={() => {
                setActiveTab("users")
                setApprovalFilter("pending")
              }}
              className={cn(
                "border shadow-premium cursor-pointer transition-all hover:scale-[1.02] col-span-2 sm:col-span-1",
                pendingApprovalCount > 0 
                  ? "border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/30" 
                  : "border-border/40"
              )}
            >
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">طلبات التسجيل الجديدة</CardTitle>
                <div className={cn(
                  "p-2 rounded-xl", 
                  pendingApprovalCount > 0 ? "bg-amber-500/20 text-amber-600 animate-pulse" : "bg-muted text-muted-foreground"
                )}>
                  <UserCheck className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className={cn(
                  "text-lg sm:text-2xl font-black", 
                  pendingApprovalCount > 0 ? "text-amber-600" : "text-brand-blue dark:text-foreground"
                )}>
                  {pendingApprovalCount}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {pendingApprovalCount > 0 ? "حساب بانتظار موافقتك ⏳ (انقر هنا)" : "لا توجد طلبات معلقة"}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium lg:col-span-1">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">أرباح التطبيق (مسددة)</CardTitle>
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-emerald-600">{totalPaidRevenue.toLocaleString('en-US')}</div>
                <p className="text-[10px] text-muted-foreground mt-1">د.ع تم استلامها من التجار</p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium lg:col-span-1">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">أرباح التطبيق (غير مسددة)</CardTitle>
                <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-orange">{totalUnpaidRevenue.toLocaleString('en-US')}</div>
                <p className="text-[10px] text-muted-foreground mt-1">د.ع بانتظار دفعها من التجار</p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">التجار المعتمدون</CardTitle>
                <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl">
                  <Store className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">{merchantsCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">تاجر جملتي نشط</p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">الأسواق المسجلة (المشترون)</CardTitle>
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">{buyersCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">سوق مشتري مسجل بالتطبيق</p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">المواد والمعروضات</CardTitle>
                <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-xl">
                  <Package className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">{productsCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">منتج نشط بالمنصة</p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">السلايدر السفلي</CardTitle>
                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                  <ImageIcon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">{mockBannersCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">إعلانات نشطة بالأسفل</p>
              </CardContent>
            </Card>

            <Card className="border border-border/40 shadow-premium">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-muted-foreground">الإعلانات العليا</CardTitle>
                <div className="p-2 bg-indigo-500/10 text-indigo-550 rounded-xl">
                  <Megaphone className="w-4 h-4 text-indigo-600" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-lg sm:text-2xl font-black text-brand-blue dark:text-foreground">{mockTopBannersCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">إعلانات مدفوعة نشطة</p>
              </CardContent>
            </Card>
          </div>"""

replace_metrics_grid = """      {/* OVERVIEW TAB — هندسة بصرية ومعمارية راقية عالية الكثافة والتباين */}
      {activeTab === "overview" && (
        <div className="space-y-3.5 animate-in fade-in duration-300">
          {/* 1. شريط الإجراءات الحرجة والتنبيهات المباشرة (Action Strip) */}
          {pendingApprovalCount > 0 ? (
            <div 
              onClick={() => {
                setActiveTab("users")
                setApprovalFilter("pending")
              }}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/35 cursor-pointer hover:border-amber-500/60 transition-all shadow-2xs group"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-xl bg-amber-500 text-white animate-pulse shadow-xs">
                  <UserCheck className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200">
                    لديك ({pendingApprovalCount}) حسابات جديدة بانتظار المراجعة والموافقة ⏳
                  </span>
                  <span className="text-[11px] font-bold text-amber-800/80 dark:text-amber-300/80 mr-2 hidden sm:inline">
                    يرجى تدقيق بيانات المتاجر وتفعيلها
                  </span>
                </div>
              </div>
              <span className="text-xs font-black text-amber-700 dark:text-amber-300 group-hover:translate-x-[-4px] transition-transform flex items-center gap-1 shrink-0 bg-amber-500/15 px-2.5 py-1 rounded-xl border border-amber-500/30">
                مراجعة الآن ←
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>حالة الحسابات ممتازة — تمت مراجعة كافة الطلبات ولا توجد حسابات معلقة</span>
              </div>
              <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black">
                0 معلق
              </span>
            </div>
          )}

          {/* 2. كبسولة الميزان المالي المزدوجة الفاخرة (Financial Balance Matrix) */}
          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 p-3 sm:p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </span>
                <span className="text-xs sm:text-sm font-black text-foreground">الميزان المالي لأرباح التطبيق</span>
              </div>
              <button 
                onClick={() => setActiveTab("merchantBilling")} 
                className="text-[11px] font-bold text-brand-blue hover:underline cursor-pointer"
              >
                تفاصيل الفواتير والتحاسب ←
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
              {/* الأرباح المسددة المستلمة */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <div>
                  <div className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    أرباح التطبيق المحصلة (المسددة)
                  </div>
                  <div className="text-base sm:text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5" dir="ltr">
                    {Number(totalPaidRevenue || 0).toLocaleString('en-US')} <span className="text-xs font-bold">د.ع</span>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                  مسددة ✓
                </span>
              </div>

              {/* الأرباح غير المسددة بانتظار الدفع */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <div>
                  <div className="text-[11px] font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    أرباح بانتظار التحصيل (غير مسددة)
                  </div>
                  <div className="text-base sm:text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5" dir="ltr">
                    {Number(totalUnpaidRevenue || 0).toLocaleString('en-US')} <span className="text-xs font-bold">د.ع</span>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                  قيد الانتظار ⏳
                </span>
              </div>
            </div>
          </div>

          {/* 3. مصفوفة المؤشرات الحيوية للمنظومة (4-Tile Compact Matrix) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* التجار والموردون */}
            <div 
              onClick={() => { setActiveTab("users"); setRoleFilter("merchant"); }}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-card border border-border/70 hover:border-brand-blue/50 transition-colors shadow-2xs cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="text-[11px] sm:text-xs font-bold text-foreground/80 block">التجار المعتمدون</span>
                <span className="text-base sm:text-xl font-black text-brand-blue dark:text-sky-400 block">{merchantsCount}</span>
                <span className="text-[10px] font-bold text-muted-foreground block">مورد جملة نشط</span>
              </div>
              <div className="p-2 rounded-xl bg-brand-blue/10 text-brand-blue group-hover:scale-105 transition-transform shrink-0">
                <Store className="w-4 h-4" />
              </div>
            </div>

            {/* الأسواق والمشترون */}
            <div 
              onClick={() => { setActiveTab("users"); setRoleFilter("guest"); }}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-card border border-border/70 hover:border-emerald-500/50 transition-colors shadow-2xs cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="text-[11px] sm:text-xs font-bold text-foreground/80 block">المشترون والأسواق</span>
                <span className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 block">{buyersCount}</span>
                <span className="text-[10px] font-bold text-muted-foreground block">سوق تجزئة مسجل</span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:scale-105 transition-transform shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>

            {/* المواد والكتالوج */}
            <div 
              onClick={() => setActiveTab("catalogImport")}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-card border border-border/70 hover:border-brand-orange/50 transition-colors shadow-2xs cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="text-[11px] sm:text-xs font-bold text-foreground/80 block">المواد والمعروضات</span>
                <span className="text-base sm:text-xl font-black text-brand-orange block">{productsCount}</span>
                <span className="text-[10px] font-bold text-muted-foreground block">صنف بضاعة معروض</span>
              </div>
              <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange group-hover:scale-105 transition-transform shrink-0">
                <Package className="w-4 h-4" />
              </div>
            </div>

            {/* الإعلانات النشطة */}
            <div 
              onClick={() => setActiveTab("banners")}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-card border border-border/70 hover:border-purple-500/50 transition-colors shadow-2xs cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="text-[11px] sm:text-xs font-bold text-foreground/80 block">الحملات الترويجية</span>
                <span className="text-base sm:text-xl font-black text-purple-600 dark:text-purple-400 block">{banners.length + topBanners.length}</span>
                <span className="text-[10px] font-bold text-muted-foreground block">إعلانات نشطة بالمنصة</span>
              </div>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 group-hover:scale-105 transition-transform shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
            </div>
          </div>"""

code_norm = code.replace("\r\n", "\n")
target_norm = target_metrics_grid.replace("\r\n", "\n")

if target_norm in code_norm:
    code_norm = code_norm.replace(target_norm, replace_metrics_grid.replace("\r\n", "\n"), 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code_norm)
    print("OVERVIEW OVERHAUL: SUCCESS")
else:
    print("OVERVIEW OVERHAUL: TARGET NOT FOUND")
