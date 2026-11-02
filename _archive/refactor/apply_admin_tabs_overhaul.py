path = r"src/app/(app)/admin/admin-client.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Imports
target_imports = """import { ContactSettingsModal } from "@/features/admin/components/contact-settings-modal" """
replace_imports = """import { ContactSettingsModal } from "@/features/admin/components/contact-settings-modal"
import { ContactSettingsTab } from "@/features/admin/components/contact-settings-tab"
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react" """

code = code.replace(target_imports.strip(), replace_imports.strip(), 1)

# 2. Tab Type
target_tab_type = """const [activeTab, setActiveTab] = useState<"overview" | "banners" | "paidBanners" | "users" | "merchantBilling" | "productivity" | "catalogImport">(
    searchParams.get("tab") === "users" ? "users" : "overview"
  )"""

replace_tab_type = """export type AdminTab = "overview" | "paidBanners" | "banners" | "users" | "merchantBilling" | "productivity" | "catalogImport" | "contactSettings"
  const [activeTab, setActiveTab] = useState<AdminTab>(
    (searchParams.get("tab") as AdminTab) || "overview"
  )"""

code = code.replace(target_tab_type.replace("\r\n", "\n"), replace_tab_type.replace("\r\n", "\n"), 1)

# 3. useEffect
target_use_effect = """  useEffect(() => {
    const tab = searchParams.get("tab")
    const approval = searchParams.get("approval")
    if (tab === "users") setActiveTab("users")
    if (approval === "pending") setApprovalFilter("pending")
  }, [searchParams])"""

replace_use_effect = """  useEffect(() => {
    const tab = searchParams.get("tab") as AdminTab
    const approval = searchParams.get("approval")
    if (tab) setActiveTab(tab)
    if (approval === "pending") setApprovalFilter("pending")
  }, [searchParams])"""

code = code.replace(target_use_effect.replace("\r\n", "\n"), replace_use_effect.replace("\r\n", "\n"), 1)

# 4. Header & Tabs Control
target_header = """      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-brand-blue dark:text-foreground">لوحة إدارة النظام</h1>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                className="rounded-full shadow-sm gap-1 sm:gap-1.5 border-slate-400/30 text-slate-700 hover:bg-slate-500/10 text-xs sm:text-sm cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">تحديث</span>
              </Button>
              <Button 
                onClick={() => setShowContactSettings(true)}
                variant="outline"
                size="sm"
                className="rounded-full shadow-sm gap-1 sm:gap-2 border-emerald-500/30 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-500/10 text-xs sm:text-sm"
              >
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                إعدادات التواصل
              </Button>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">تتبع الأداء، وأدر المتاجر، وخصص الإعلانات الترويجية.</p>
        </div>
        
        {/* Tabs Control */}
        <div className="flex bg-muted/65 p-1 rounded-xl w-full sm:w-auto shadow-inner flex-wrap gap-1">
          <button 
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "overview" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            الإحصائيات
          </button>
          <button 
            onClick={() => setActiveTab("paidBanners")}
            className={cn(
              "relative flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "paidBanners" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            الإعلانات المدفوعة العليا
            {adRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-orange text-[9px] font-black text-white shadow-sm animate-pulse border-2 border-background">
                {adRequests.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab("banners")}
            className={cn(
              "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "banners" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            إعلانات السلايدر السفلي
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={cn(
              "relative flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === "users" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            المستخدمين والتوصيل
            {pendingApprovalCount > 0 && (
              <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white shadow-sm animate-pulse border-2 border-background">
                {pendingApprovalCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab("merchantBilling")}
            className={cn(
              "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
              activeTab === "merchantBilling" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <DollarSign className="w-3.5 h-3.5" />
            التحاسب والفواتير
            </button>
            <button 
              onClick={() => setActiveTab("productivity")}
              className={cn(
                "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                activeTab === "productivity" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              أداء الموظفين
            </button>
            <button
              onClick={() => setActiveTab("catalogImport")}
              className={cn(
                "flex-grow sm:flex-grow-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                activeTab === "catalogImport" ? "bg-card text-brand-blue dark:text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Package className="w-3.5 h-3.5" />
              تعزيز الكتالوج
            </button>
          </div>
      </div>"""

replace_header = """      {/* شريط الإدارة المرشوق — محذوف منه العناوين الضخمة والمساحات الميتة */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 bg-card border border-border/80 px-3 py-2 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
            <span className="text-xs sm:text-sm font-black text-foreground">مركز التحكم والإدارة</span>
            <span className="hidden sm:inline-block text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">Admin Portal</span>
          </div>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="h-8 px-3 rounded-xl border-border/80 text-foreground hover:bg-muted text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
            title="تحديث البيانات"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-brand-orange", isRefreshing && "animate-spin")} />
            <span>تحديث البيانات</span>
          </Button>
        </div>

        {/* شريط التبويبات الأفقي المرشوق بسطر واحد دائم مع تحكم انسيابي */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("admin-tabs-scroll");
              if (el) el.scrollBy({ left: 160, behavior: "smooth" });
            }}
            aria-label="تمرير التبويبات لليمين"
            className="shrink-0 w-7 h-7 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer transition-colors ml-1 z-10 shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div 
            id="admin-tabs-scroll"
            className="flex items-center gap-1.5 p-1 bg-muted/65 rounded-2xl border border-border/60 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full"
          >
            <button 
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                activeTab === "overview" ? "bg-card text-brand-blue dark:text-foreground shadow-xs border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className="w-3.5 h-3.5 text-brand-blue" />
              الإحصائيات
            </button>

            <button 
              onClick={() => setActiveTab("paidBanners")}
              className={cn(
                "relative px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                activeTab === "paidBanners" ? "bg-card text-brand-blue dark:text-foreground shadow-xs border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Megaphone className="w-3.5 h-3.5 text-brand-orange" />
              الإعلانات المدفوعة العليا
              {adRequests.length > 0 && (
                <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-brand-orange text-[9px] font-black text-white shadow-2xs animate-pulse">
                  {adRequests.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab("banners")}
              className={cn(
                "relative px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                activeTab === "banners" ? "bg-card text-brand-blue dark:text-foreground shadow-xs border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
              إعلانات السلايدر السفلي
              {banners.length > 0 && (
                <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-purple-600 text-[9px] font-black text-white shadow-2xs">
                  {banners.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab("users")}
              className={cn(
                "relative px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                activeTab === "users" ? "bg-card text-brand-blue dark:text-foreground shadow-xs border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-3.5 h-3.5 text-blue-500" />
              المستخدمين والتوصيل
              {pendingApprovalCount > 0 && (
                <span className="flex h-4 min-w-4 px-1.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white shadow-2xs animate-pulse">
                  {pendingApprovalCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab("merchantBilling")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                activeTab === "merchantBilling" ? "bg-card text-brand-blue dark:text-foreground shadow-xs border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              التحاسب والفواتير
            </button>

            <button 
              onClick={() => setActiveTab("productivity")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                activeTab === "productivity" ? "bg-card text-brand-blue dark:text-foreground shadow-xs border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              أداء الموظفين
            </button>

            <button
              onClick={() => setActiveTab("catalogImport")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                activeTab === "catalogImport" ? "bg-card text-brand-blue dark:text-foreground shadow-xs border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Package className="w-3.5 h-3.5 text-amber-500" />
              تعزيز الكتالوج
            </button>

            <button
              onClick={() => setActiveTab("contactSettings")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                activeTab === "contactSettings" ? "bg-card text-brand-blue dark:text-foreground shadow-xs border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              إعدادات التواصل
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("admin-tabs-scroll");
              if (el) el.scrollBy({ left: -160, behavior: "smooth" });
            }}
            aria-label="تمرير التبويبات لليسار"
            className="shrink-0 w-7 h-7 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer transition-colors mr-1 z-10 shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>"""

code = code.replace(target_header.replace("\r\n", "\n"), replace_header.replace("\r\n", "\n"), 1)

# 5. Live preview in paidBanners tab
target_paid_tab = """      {/* PAID TOP BANNERS TAB */}
      {activeTab === "paidBanners" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">"""

replace_paid_tab = """      {/* PAID TOP BANNERS TAB */}
      {activeTab === "paidBanners" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* معاينة حية لشريط الإعلانات العلوية — تظهر فقط في هذا التبويب */}
          <div className="rounded-2xl border border-brand-orange/30 bg-card p-3 sm:p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-brand-orange/15 text-brand-orange">
                  <Megaphone className="w-4 h-4" />
                </span>
                <span className="text-xs sm:text-sm font-black text-foreground">
                  معاينة حية لشريط الإعلانات العلوية (تظهر لك فقط هنا لمراجعة المظهر المباشر)
                </span>
              </div>
              <span className="text-[10px] font-bold bg-brand-orange/15 text-brand-orange px-2 py-0.5 rounded-full border border-brand-orange/20">
                مباشر للجمهور
              </span>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-muted/20 p-4 text-center">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-brand-orange/10 text-brand-orange border border-brand-orange/20 px-3 py-0.5 rounded-full mb-1.5">
                <Sparkles className="w-3 h-3 text-brand-orange animate-pulse" />
                إعلان مميز
              </span>
              <h4 className="text-xs sm:text-sm md:text-base font-black text-foreground leading-snug">
                {topBanners.find(b => b.is_active)?.text || "هل تريد مضاعفة مبيعاتك؟ أعلن معنا في صدارة التطبيق لتصل عروضك مباشرة إلى آلاف تجار الجملة والمشترين! 🚀"}
              </h4>
              <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                <span>الرابط: <strong className="text-brand-blue underline" dir="ltr">{topBanners.find(b => b.is_active)?.link_url || "/"}</strong></span>
                <span>•</span>
                <span>الحالة: <strong className="text-emerald-600 font-bold">نشط ومفعل</strong></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">"""

code = code.replace(target_paid_tab.replace("\r\n", "\n"), replace_paid_tab.replace("\r\n", "\n"), 1)

# 6. Live preview in banners tab (Bottom slider)
target_banners_tab = """      {/* FREE BOTTOM BANNERS TAB */}
      {activeTab === "banners" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">"""

replace_banners_tab = """      {/* FREE BOTTOM BANNERS TAB */}
      {activeTab === "banners" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* معاينة حية لسلايدر الإعلانات السفلي — تظهر فقط في هذا التبويب */}
          <div className="rounded-2xl border border-purple-500/30 bg-card p-3 sm:p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <ImageIcon className="w-4 h-4" />
                </span>
                <span className="text-xs sm:text-sm font-black text-foreground">
                  معاينة حية لسلايدر الإعلانات السفلي (تظهر لك فقط هنا لمراجعة المظهر المباشر)
                </span>
              </div>
              <span className="text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                مباشر للجمهور
              </span>
            </div>

            <div className="relative overflow-hidden rounded-2xl h-24 sm:h-28 border border-border/40 shadow-sm flex items-center justify-between p-4 text-white">
              <div className={cn("absolute inset-0 bg-gradient-to-r", banners[0]?.bg_gradient || GRADIENT_PRESETS[0].value)} />
              <div className="relative z-10 space-y-1 text-right">
                <h4 className="font-black text-sm sm:text-base text-white">{banners[0]?.title || "عنوان الإعلان بالسلايدر"}</h4>
                <p className="text-xs text-white/90 line-clamp-1">{banners[0]?.description || "الوصف الترويجي يظهر هنا..."}</p>
                <span className="text-[10px] bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded text-white inline-block">
                  الرابط: {banners[0]?.link_url || "/"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">"""

code = code.replace(target_banners_tab.replace("\r\n", "\n"), replace_banners_tab.replace("\r\n", "\n"), 1)

# 7. Add contactSettings tab rendering before contact settings modal
target_end = """      {/* حوار إعدادات التواصل */}
      <ContactSettingsModal 
        open={showContactSettings}
        onOpenChange={setShowContactSettings}
      />"""

replace_end = """      {/* CONTACT SETTINGS TAB */}
      {activeTab === "contactSettings" && (
        <div className="animate-in fade-in duration-300">
          <ContactSettingsTab />
        </div>
      )}

      {/* حوار إعدادات التواصل */}
      <ContactSettingsModal 
        open={showContactSettings}
        onOpenChange={setShowContactSettings}
      />"""

code = code.replace(target_end.replace("\r\n", "\n"), replace_end.replace("\r\n", "\n"), 1)

# 8. Bounded container for users table
target_users_table = """              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs">"""

replace_users_table = """              {/* حاوية محددة الارتفاع مع ترويسة ثابتة وسكرول داخلي لقائمة المستخدمين */}
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto [scrollbar-width:thin] border border-border/60 rounded-xl">
                <table className="w-full text-right border-collapse text-xs sm:text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs">
                    <tr className="border-b border-border text-muted-foreground text-xs">"""

code = code.replace(target_users_table.replace("\r\n", "\n"), replace_users_table.replace("\r\n", "\n"), 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("ADMIN CLIENT OVERHAUL: SUCCESS")
