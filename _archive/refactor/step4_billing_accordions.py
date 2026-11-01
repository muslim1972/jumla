path_billing = 'src/app/(merchant)/dashboard/billing/billing-list-client.tsx'
with open(path_billing, 'r', encoding='utf-8') as f:
    text_billing = f.read()

# Add ChevronDown, ChevronUp to imports
if 'ChevronDown' not in text_billing:
    text_billing = text_billing.replace('import { CheckCircle,', 'import { CheckCircle, ChevronDown, ChevronUp,', 1)

# Add accordion state
target_state = '  const [selectedBill, setSelectedBill] = useState<any | null>(null)'
replacement_state = '''  const [selectedBill, setSelectedBill] = useState<any | null>(null)
  const [openSections, setOpenSections] = useState<{ pending: boolean, paid: boolean }>({
    pending: pendingBillings.length > 0,
    paid: pendingBillings.length === 0,
  })

  const toggleSection = (key: 'pending' | 'paid') => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }'''

assert target_state in text_billing, "target_state not found in billing-list-client.tsx"
text_billing = text_billing.replace(target_state, replacement_state, 1)

# Replace the layout
layout_target = """      <div className="grid grid-cols-2 gap-3 sm:gap-6 items-start">
        {/* العمود الأيمن: الفواتير المسددة (Right column in RTL) */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="font-bold text-sm sm:text-lg text-emerald-700 dark:text-emerald-500 flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            مسددة
          </h2>
          {paidBillings.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground p-4 sm:p-6 text-center bg-muted/20 rounded-xl border border-dashed">لا يوجد</p>
          ) : (
            paidBillings.map((bill) => (
              <BillingCard key={bill.id} bill={bill} isPaid={true} onClick={() => handleOpenDialog(bill)} />
            ))
          )}
        </div>

        {/* العمود الأيسر: فواتير بانتظار التسديد (Left column in RTL) */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="font-bold text-sm sm:text-lg text-amber-700 dark:text-amber-500 flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            بانتظار التسديد
          </h2>
          {pendingBillings.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground p-4 sm:p-6 text-center bg-muted/20 rounded-xl border border-dashed">لا يوجد</p>
          ) : (
            pendingBillings.map((bill) => (
              <BillingCard key={bill.id} bill={bill} isPaid={false} onClick={() => handleOpenDialog(bill)} />
            ))
          )}
        </div>
      </div>"""

replacement_layout = """      <div className="space-y-2.5 sm:space-y-3 max-w-5xl mx-auto">
        {/* 1. فواتير بانتظار التسديد */}
        <div className="rounded-xl border border-amber-500/30 overflow-hidden bg-card shadow-2xs">
          <button
            type="button"
            onClick={() => toggleSection('pending')}
            className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-amber-500/10 hover:bg-amber-500/15 transition-colors cursor-pointer text-right"
          >
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </span>
              <span className="font-black text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                فواتير بانتظار التسديد
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                pendingBillings.length > 0 
                  ? "bg-amber-500 text-white animate-pulse" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {pendingBillings.length}
              </span>
            </div>
            <div className="text-amber-700 dark:text-amber-400">
              {openSections.pending ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>
          {openSections.pending && (
            <div className="p-2 sm:p-3 border-t border-amber-500/20 bg-background/50">
              {pendingBillings.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 text-center">لا توجد فواتير معلقة بانتظار التسديد — حسابك سليم ✓</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                  {pendingBillings.map((bill) => (
                    <BillingCard key={bill.id} bill={bill} isPaid={false} onClick={() => handleOpenDialog(bill)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. الفواتير المسددة */}
        <div className="rounded-xl border border-emerald-500/30 overflow-hidden bg-card shadow-2xs">
          <button
            type="button"
            onClick={() => toggleSection('paid')}
            className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-emerald-500/10 hover:bg-emerald-500/15 transition-colors cursor-pointer text-right"
          >
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4" />
              </span>
              <span className="font-black text-xs sm:text-sm text-foreground">
                الفواتير المسددة
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white">
                {paidBillings.length}
              </span>
            </div>
            <div className="text-muted-foreground">
              {openSections.paid ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>
          {openSections.paid && (
            <div className="p-2 sm:p-3 border-t border-emerald-500/20 bg-background/50">
              {paidBillings.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 text-center">لا توجد فواتير مسددة سابقة.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                  {paidBillings.map((bill) => (
                    <BillingCard key={bill.id} bill={bill} isPaid={true} onClick={() => handleOpenDialog(bill)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>"""

if "\r\n" in text_billing:
    layout_target = layout_target.replace("\n", "\r\n")
    replacement_layout = replacement_layout.replace("\n", "\r\n")

assert layout_target in text_billing, "layout_target not found in billing-list-client.tsx"
text_billing = text_billing.replace(layout_target, replacement_layout, 1)

# Compact BillingCard
card_target = """function BillingCard({ bill, isPaid, onClick }: { bill: any, isPaid: boolean, onClick: () => void }) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "overflow-hidden border-2 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
        isPaid ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-amber-500/30 hover:border-amber-500/60"
      )}
    >
      <div 
        className={cn(
          "w-full text-right p-2.5 sm:p-4 flex flex-col gap-2.5 sm:gap-3 transition-colors",
          isPaid ? "bg-emerald-500/5" : "bg-amber-500/5"
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn(
            "w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner",
            isPaid ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
          )}>
            <FileText className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-bold text-xs sm:text-sm truncate",
              isPaid ? "text-emerald-700 dark:text-emerald-500" : "text-amber-700 dark:text-amber-500"
            )}>
              فاتورة التطبيق
            </h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-mono mt-0.5 truncate" dir="ltr">
              {new Date(bill.created_at).toLocaleDateString('ar-IQ')}
            </p>
          </div>
        </div>
        
        <div className="shrink-0 flex justify-end">
          {isPaid ? (
            <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-emerald-500/10 text-emerald-600 font-bold text-[9px] sm:text-xs">
              <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              مسددة
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-amber-500/10 text-amber-600 font-bold text-[9px] sm:text-xs shadow-sm">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse" />
              بانتظار التسديد
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}"""

replacement_card = """function BillingCard({ bill, isPaid, onClick }: { bill: any, isPaid: boolean, onClick: () => void }) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "overflow-hidden border shadow-2xs transition-all hover:shadow-sm cursor-pointer rounded-xl",
        isPaid ? "border-emerald-500/25 hover:border-emerald-500/50" : "border-amber-500/35 hover:border-amber-500/60"
      )}
    >
      <div 
        className={cn(
          "w-full text-right p-2 sm:p-2.5 flex items-center justify-between gap-2 transition-colors",
          isPaid ? "bg-emerald-500/5" : "bg-amber-500/5"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            isPaid ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"
          )}>
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h4 className={cn(
              "font-bold text-xs truncate",
              isPaid ? "text-emerald-800 dark:text-emerald-400" : "text-amber-800 dark:text-amber-400"
            )}>
              فاتورة التطبيق
            </h4>
            <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">
              {new Date(bill.created_at).toLocaleDateString('ar-IQ')}
            </p>
          </div>
        </div>
        
        <div className="shrink-0">
          {isPaid ? (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
              <CheckCircle className="w-3 h-3" />
              مسددة
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-[10px] shadow-xs">
              <Clock className="w-3 h-3 animate-pulse" />
              بانتظار التسديد
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}"""

if "\r\n" in text_billing:
    card_target = card_target.replace("\n", "\r\n")
    replacement_card = replacement_card.replace("\n", "\r\n")

assert card_target in text_billing, "card_target not found in billing-list-client.tsx"
text_billing = text_billing.replace(card_target, replacement_card, 1)

with open(path_billing, 'w', encoding='utf-8') as f:
    f.write(text_billing)
print("SUCCESS: Updated billing-list-client.tsx with compact accordions")
