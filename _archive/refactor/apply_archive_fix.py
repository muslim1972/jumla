path = r"src/app/(merchant)/dashboard/archive/archive-client.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

target_card = """      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start justify-between p-4 text-right cursor-pointer"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base text-brand-blue">{order.store_name}</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> مكتمل
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>{order.address}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono" dir="ltr">
            <Phone className="w-3.5 h-3.5" />
            <span>{order.phone}</span>
          </div>
        </div>
        <div className="text-left shrink-0 flex flex-col items-end">
          <div className="font-black text-brand-orange tabular-nums">
            {order.total_rounded.toLocaleString('en-US')} د.ع
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
            {new Date(order.created_at).toLocaleTimeString('ar-IQ')}
          </div>
          <div className="text-muted-foreground mt-2">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>"""

replace_card = """      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2.5 sm:p-3 text-right cursor-pointer gap-2 hover:bg-muted/15 transition-colors"
      >
        <div className="space-y-1 min-w-0 flex-1">
          {/* السطر الأول: اسم الماركت وشارة مكتمل */}
          <div className="flex items-center gap-2">
            <span className="font-black text-xs sm:text-sm text-brand-blue truncate">{order.store_name}</span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.2 rounded-full flex items-center gap-1 shrink-0">
              <CheckCircle className="w-3 h-3" /> مكتمل
            </span>
          </div>

          {/* السطر الثاني: دمج العنوان الغامق مع رقم الهاتف في سطر واحد وإلغاء السطر الثالث */}
          <div className="flex items-center gap-2 text-xs text-foreground/90 dark:text-zinc-200 flex-wrap">
            <span className="flex items-center gap-1 font-bold">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-none">{order.address}</span>
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span className="flex items-center gap-1 font-bold font-mono text-foreground" dir="ltr">
              <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
              <span>{order.phone}</span>
            </span>
          </div>
        </div>

        {/* الجانب الأيسر: المبلغ والتوقيت وسهم التوسيع */}
        <div className="text-left shrink-0 flex items-center gap-2 sm:gap-3">
          <div className="flex flex-col items-end">
            <div className="font-black text-brand-orange text-xs sm:text-sm tabular-nums" dir="ltr">
              {Number(order.total_rounded || 0).toLocaleString('en-US')} د.ع
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              {new Date(order.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div className="text-muted-foreground p-1">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>"""

code_norm = code.replace("\r\n", "\n")
target_card_norm = target_card.replace("\r\n", "\n")

if target_card_norm in code_norm:
    code_norm = code_norm.replace(target_card_norm, replace_card.replace("\r\n", "\n"), 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code_norm)
    print("ARCHIVE: SUCCESS")
else:
    print("ARCHIVE: TARGET NOT FOUND")
