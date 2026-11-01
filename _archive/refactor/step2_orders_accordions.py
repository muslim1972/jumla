path_orders = 'src/app/(merchant)/dashboard/orders/orders-client.tsx'
with open(path_orders, 'r', encoding='utf-8') as f:
    text = f.read()

# Add ChevronDown, ChevronUp to imports if not present
if 'ChevronDown' not in text:
    text = text.replace('import { CheckCircle,', 'import { CheckCircle, ChevronDown, ChevronUp,', 1)

# Add accordion state
state_target = '  const [pickingOrderId, setPickingOrderId] = useState<string | null>(null)'
state_replacement = '''  const [pickingOrderId, setPickingOrderId] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    pending: true,
    preparing: false,
    approved: false,
    delivered: false,
    cancellation: false,
  })

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }'''

assert state_target in text, "state_target not found in orders-client.tsx"
text = text.replace(state_target, state_replacement, 1)

# Replace the layout
layout_start = '        <div className="space-y-6 sm:space-y-8">'
layout_end = '      <OrderDialog'

start_idx = text.find(layout_start)
end_idx = text.find(layout_end)
assert start_idx != -1 and end_idx != -1, "Layout bounds not found in orders-client.tsx"

new_layout = '''        <div className="space-y-2.5 sm:space-y-3">
          {/* 1. بانتظار الموافقة */}
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
                  بانتظار الموافقة
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  pendingOrders.length > 0 
                    ? "bg-amber-500 text-white animate-pulse" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {pendingOrders.length}
                </span>
              </div>
              <div className="text-amber-700 dark:text-amber-400">
                {openSections.pending ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            {openSections.pending && (
              <div className="p-2 sm:p-3 border-t border-amber-500/20 bg-background/50">
                {pendingOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">لا توجد طلبات بانتظار الموافقة حالياً.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {pendingOrders.map((order) => (
                      <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. قيد التجهيز في المخزن */}
          {warehouseEnabled && (
            <div className="rounded-xl border border-brand-orange/30 overflow-hidden bg-card shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('preparing')}
                className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-brand-orange/10 hover:bg-brand-orange/15 transition-colors cursor-pointer text-right"
              >
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-brand-orange/20 text-brand-orange">
                    <Warehouse className="w-4 h-4" />
                  </span>
                  <span className="font-black text-xs sm:text-sm text-foreground">
                    قيد التجهيز في المخزن
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                    preparingOrders.length > 0 
                      ? "bg-brand-orange text-white" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {preparingOrders.length}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {openSections.preparing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {openSections.preparing && (
                <div className="p-2 sm:p-3 border-t border-brand-orange/20 bg-background/50">
                  {preparingOrders.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 text-center">لا توجد طلبات قيد التجهيز في المخزن حالياً.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                      {preparingOrders.map((order) => (
                        <OrderCard key={order.id} order={order} isPreparing={true} onClick={() => setPickingOrderId(order.id)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. بانتظار المندوب */}
          <div className="rounded-xl border border-emerald-500/30 overflow-hidden bg-card shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection('approved')}
              className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-emerald-500/10 hover:bg-emerald-500/15 transition-colors cursor-pointer text-right"
            >
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  <Truck className="w-4 h-4" />
                </span>
                <span className="font-black text-xs sm:text-sm text-foreground">
                  بانتظار المندوب (مجهّزة)
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  approvedOrders.length > 0 
                    ? "bg-emerald-600 text-white" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {approvedOrders.length}
                </span>
              </div>
              <div className="text-muted-foreground">
                {openSections.approved ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            {openSections.approved && (
              <div className="p-2 sm:p-3 border-t border-emerald-500/20 bg-background/50">
                {approvedOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">لا توجد طلبات بانتظار المندوب حالياً.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {approvedOrders.map((order) => (
                      <OrderCard key={order.id} order={order} isApproved={true} onClick={() => setSelectedOrder(order)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. مُسلمة بانتظار استلام المبلغ */}
          <div className="rounded-xl border border-rose-500/30 overflow-hidden bg-card shadow-2xs">
            <button
              type="button"
              onClick={() => toggleSection('delivered')}
              className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-rose-500/10 hover:bg-rose-500/15 transition-colors cursor-pointer text-right"
            >
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-400">
                  <CheckCircle className="w-4 h-4" />
                </span>
                <span className="font-black text-xs sm:text-sm text-foreground">
                  مُسلمة بانتظار استلام المبلغ
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                  deliveredOrders.length > 0 
                    ? "bg-rose-600 text-white" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {deliveredOrders.length}
                </span>
              </div>
              <div className="text-muted-foreground">
                {openSections.delivered ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            {openSections.delivered && (
              <div className="p-2 sm:p-3 border-t border-rose-500/20 bg-background/50">
                {deliveredOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">لا توجد طلبات بانتظار استلام المبلغ حالياً.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {deliveredOrders.map((order) => (
                      <OrderCard key={order.id} order={order} isDelivered={true} onClick={() => setSelectedOrder(order)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. طلبات الإلغاء إن وجدت */}
          {cancellationRequests.length > 0 && (
            <div className="rounded-xl border border-purple-500/30 overflow-hidden bg-card shadow-2xs">
              <button
                type="button"
                onClick={() => toggleSection('cancellation')}
                className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-purple-500/10 hover:bg-purple-500/15 transition-colors cursor-pointer text-right"
              >
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-purple-500/20 text-purple-700 dark:text-purple-400">
                    <XCircle className="w-4 h-4" />
                  </span>
                  <span className="font-black text-xs sm:text-sm text-foreground">
                    طلبات الإلغاء
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-600 text-white">
                    {cancellationRequests.length}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {openSections.cancellation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {openSections.cancellation && (
                <div className="p-2 sm:p-3 border-t border-purple-500/20 bg-background/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {cancellationRequests.map((order) => (
                      <OrderCard key={order.id} order={order} isCancellation={true} onClick={() => setSelectedOrder(order)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

'''

if "\r\n" in text:
    new_layout = new_layout.replace("\n", "\r\n")

text = text[:start_idx] + new_layout + text[end_idx:]

with open(path_orders, 'w', encoding='utf-8') as f:
    f.write(text)
print("SUCCESS: Transformed orders-client.tsx with Intelligent Accordions")
