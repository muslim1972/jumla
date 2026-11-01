path = 'src/features/products/components/product-explorer.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

hero_start = "{/* 1. واجهة الزائر الرشيقة المدمجة (Compact Above-The-Fold B2B Hero) */}"
hero_end = "{/* 2. شريط التحكم والبحث الموحد المدمج (Unified Compact Command Center) */}"

start_pos = text.find(hero_start)
end_pos = text.find(hero_end)

if start_pos == -1 or end_pos == -1:
    print(f"Error: bounds not found: start={start_pos}, end={end_pos}")
    exit(1)

# Backtrack to the start of the line
line_start = text.rfind("\n", 0, start_pos)
if line_start == -1:
    line_start = 0
else:
    line_start += 1

line_end = text.rfind("\n", 0, end_pos)
if line_end == -1:
    line_end = end_pos
else:
    line_end += 1

new_hero = """      {/* 1. واجهة الزائر الرشيقة المدمجة (Compact Above-The-Fold B2B Hero) */}
      {!user && (
        <div className="w-full bg-[#0c1c2e] text-white rounded-2xl overflow-hidden shadow-md border border-slate-800 mb-2.5 mt-1">
          {/* شريط الإعلان الزمردي الرشيق للتوصيل المجاني بكامل نصه وبدون تكرار الشارة */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 text-white px-3 sm:px-6 py-1.5 flex items-center justify-center text-center text-[11px] sm:text-xs font-bold border-b border-emerald-600/30">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-amber-400 text-sm shrink-0">🎁</span>
              <span><strong>بشرى لمتاجر كربلاء:</strong> التوصيل 0 د.ع متكفل به تطبيق جملتي لكافة طلبيات الجملة.</span>
            </div>
          </div>

          <div className="p-3 sm:p-4 lg:p-5 space-y-2 sm:space-y-2.5">
            {/* شارة سوق الجملة الأول ممركزة في وسط الحاوية بخط أكبر وأوضح */}
            <div className="w-full flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-black shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>سوق الجملة العراقي الأول في كربلاء المقدسة</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
              <div className="min-w-0 flex-1 text-center sm:text-right">
                <h1 className="text-sm sm:text-base lg:text-lg font-black leading-snug text-white tracking-tight">
                  بضاعة متجرك بالجملة بالكرتون والكيس، <span className="text-[#d97706]">من المصنع والمجهّز لباب محلك مباشرةً.</span>
                </h1>
              </div>

              <div className="shrink-0 flex items-center justify-center">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-[#d97706] hover:bg-[#b45309] text-white font-black px-4 py-2 h-9 sm:h-10 text-xs sm:text-sm rounded-xl shadow-md border-0 transition-all cursor-pointer">
                    افتح حساب متجرك مجاناً
                  </Button>
                </Link>
              </div>
            </div>

            {/* شارات الثقة السريعة المصغرة */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-[10px] sm:text-xs text-slate-300 font-bold">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> توصيل 0 د.ع لباب المحل</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> بيع بالكارتون والكيس الصافي</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> مجهّزون محليون موثوقون</span>
            </div>
          </div>
        </div>
      )}

"""

if "\r\n" in text:
    new_hero = new_hero.replace("\n", "\r\n")

text = text[:line_start] + new_hero + text[line_end:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: Centered hero badge and cleaned announcement bar in product-explorer.tsx")
