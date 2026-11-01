path = 'src/app/(merchant)/layout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

target = """      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-16 pb-2 border-b">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* زر تثبيت التطبيق على الجهاز — ركن ثابت لصفحات التاجر والموظفين */}
          <div className="flex justify-start mb-2">
            <InstallAppButton />
          </div>
          {/* Rewards Banner — للتجار فقط، موظفو المتجر لا يعملون به */}
          {ctx.role === "merchant" && (
            <Link href="/rewards" className="block w-full rounded-2xl bg-gradient-to-r from-brand-blue to-cyan-600 p-3 sm:p-4 text-white shadow-md relative overflow-hidden group mb-4">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -ml-10 -mt-10 group-hover:scale-125 transition-transform duration-700"></div>
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md shadow-inner">
                    <Award className="w-6 h-6 text-yellow-300 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg flex items-center gap-2">
                      برنامج مكافآت جملتي
                      <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-bounce">جديد</span>
                    </h3>
                    <p className="text-white/80 text-xs mt-0.5">ارتقِ بمستواك واحصل على إعلانات وتخفيضات!</p>
                  </div>
                </div>
                <div className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm transition-all sm:group-hover:-translate-x-1">
                  <ArrowLeft className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}"""

replacement = """      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-14 pb-1.5 border-b">
        <div className="container mx-auto px-3 sm:px-4 max-w-6xl">
          {/* شريط الإجراءات العلوي للتاجر: زر التثبيت وبانر المكافآت الرشيق */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 mb-1.5">
            <InstallAppButton />
            {ctx.role === "merchant" && (
              <Link 
                href="/rewards" 
                className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-brand-blue via-cyan-700 to-brand-blue px-3 py-1.5 text-white shadow-2xs hover:opacity-95 transition-all text-xs flex-1 max-w-xl"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Award className="w-4 h-4 text-yellow-300 shrink-0" />
                  <span className="font-black truncate">برنامج مكافآت جملتي:</span>
                  <span className="text-white/90 text-[11px] truncate hidden sm:inline">ارتقِ بمستواك واحصل على إعلانات وتخفيضات أسبوعية</span>
                  <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold shrink-0">جديد</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-yellow-300 shrink-0">
                  <span>تفاصيل</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </div>
              </Link>
            )}
          </div>"""

if "\r\n" in text:
    target = target.replace("\n", "\r\n")
    replacement = replacement.replace("\n", "\r\n")

assert target in text, "Target not found in layout.tsx"
text = text.replace(target, replacement, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: Updated merchant layout.tsx")
