path_debts = 'src/features/credit/components/merchant-debts-client.tsx'
with open(path_debts, 'r', encoding='utf-8') as f:
    text_debts = f.read()

old_debts_top = '<div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto pb-32">'
new_debts_top = '<div className="px-2 sm:px-4 py-2 sm:py-3.5 space-y-2.5 sm:space-y-3 max-w-4xl mx-auto pb-20">'
if old_debts_top in text_debts:
    text_debts = text_debts.replace(old_debts_top, new_debts_top, 1)

old_debts_header = """      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-blue flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-orange" />
            الديون والتسديد
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            إدارة الديون المستحقة على المشترين لقاء الطلبات الآجلة
          </p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 px-4 py-2 rounded-xl text-center">
          <p className="text-xs font-bold text-destructive mb-1">إجمالي الديون المستحقة</p>
          <p className="text-xl font-black text-destructive tabular-nums">{totalDebts.toLocaleString('en-US')} د.ع</p>
        </div>
      </div>"""

new_debts_header = """      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-black text-brand-blue flex items-center gap-2">
            <Wallet className="w-4 h-4 text-brand-orange" />
            الديون والتسديد
          </h1>
          <p className="text-muted-foreground text-[11px] sm:text-xs">
            إدارة الديون المستحقة على المشترين لقاء الطلبات الآجلة
          </p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-xl text-center flex sm:flex-col items-center justify-between gap-2 sm:gap-0">
          <span className="text-[10px] sm:text-xs font-bold text-destructive">إجمالي الديون:</span>
          <span className="text-sm sm:text-base font-black text-destructive tabular-nums" dir="ltr">{totalDebts.toLocaleString('en-US')} د.ع</span>
        </div>
      </div>"""

if "\r\n" in text_debts:
    old_debts_header = old_debts_header.replace("\n", "\r\n")
    new_debts_header = new_debts_header.replace("\n", "\r\n")

if old_debts_header in text_debts:
    text_debts = text_debts.replace(old_debts_header, new_debts_header, 1)

old_buyer_button = 'className="w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right cursor-pointer"'
new_buyer_button = 'className="w-full p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-right cursor-pointer"'
if old_buyer_button in text_debts:
    text_debts = text_debts.replace(old_buyer_button, new_buyer_button, 1)

with open(path_debts, 'w', encoding='utf-8') as f:
    f.write(text_debts)
print("SUCCESS: Updated merchant-debts-client.tsx")
