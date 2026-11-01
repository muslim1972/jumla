path_tb = 'src/features/credit/components/trusted-buyers-client.tsx'
with open(path_tb, 'r', encoding='utf-8') as f:
    text_tb = f.read()

# 1. Container padding
old_container = '<div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto pb-32">'
new_container = '<div className="px-2 sm:px-4 py-2 sm:py-3.5 space-y-2.5 sm:space-y-3 max-w-4xl mx-auto pb-20">'
if old_container in text_tb:
    text_tb = text_tb.replace(old_container, new_container, 1)

# 2. Header
old_header = """      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-blue flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-orange" />
            إدارة قائمة الثقات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            المشترون في هذه القائمة يمكنهم الشراء بالآجل (دين) من متجرك.
          </p>
        </div>
      </div>"""

new_header = """      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <h1 className="text-base sm:text-lg font-black text-brand-blue flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-brand-orange" />
            إدارة قائمة الثقات
          </h1>
          <p className="text-muted-foreground text-[11px] sm:text-xs">
            المشترون المصرح لهم بالشراء بالآجل (دين) من متجرك
          </p>
        </div>
      </div>"""

if "\r\n" in text_tb:
    old_header = old_header.replace("\n", "\r\n")
    new_header = new_header.replace("\n", "\r\n")

if old_header in text_tb:
    text_tb = text_tb.replace(old_header, new_header, 1)

# 3. Search card
old_search_card = """      <div className="bg-card border rounded-2xl p-4 sm:p-6 shadow-sm relative z-20">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-muted-foreground" />
          إضافة مشتري جديد
        </h2>"""

new_search_card = """      <div className="bg-card border rounded-xl p-2.5 sm:p-3.5 shadow-2xs relative z-20">
        <h2 className="font-bold text-xs sm:text-sm mb-2 flex items-center gap-1.5 text-foreground">
          <Search className="w-4 h-4 text-brand-orange" />
          إضافة مشتري جديد لقائمة الآجل
        </h2>"""

if "\r\n" in text_tb:
    old_search_card = old_search_card.replace("\n", "\r\n")
    new_search_card = new_search_card.replace("\n", "\r\n")

if old_search_card in text_tb:
    text_tb = text_tb.replace(old_search_card, new_search_card, 1)

# 4. List card header & items
old_list_card = """      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm relative z-10">
        <div className="p-4 sm:p-6 border-b bg-muted/10">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-brand-orange" />
            قائمة الثقات الحالية
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full mr-auto">
              {trustedBuyers.length} مشتري
            </span>
          </h2>
        </div>"""

new_list_card = """      <div className="bg-card border rounded-xl overflow-hidden shadow-2xs relative z-10">
        <div className="p-2.5 sm:p-3 border-b bg-muted/10 flex items-center justify-between">
          <h2 className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-foreground">
            <UserCheck className="w-4 h-4 text-brand-orange" />
            قائمة الثقات الحالية
          </h2>
          <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full">
            {trustedBuyers.length} مشتري
          </span>
        </div>"""

if "\r\n" in text_tb:
    old_list_card = old_list_card.replace("\n", "\r\n")
    new_list_card = new_list_card.replace("\n", "\r\n")

if old_list_card in text_tb:
    text_tb = text_tb.replace(old_list_card, new_list_card, 1)

old_row = """            {trustedBuyers.map(buyer => (
              <div key={buyer.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                <div>
                  <h3 className="font-bold text-lg">{buyer.full_name}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1.5">
                    {buyer.store_name && (
                      <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md">
                        <Store className="w-4 h-4" /> {buyer.store_name}
                      </span>
                    )}
                    {buyer.phone && (
                      <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md">
                        <Phone className="w-4 h-4" /> {buyer.phone}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleRemove(buyer.id)}
                  disabled={isRemoving === buyer.id}
                  className="shrink-0"
                >
                  {isRemoving === buyer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "إزالة من القائمة"}
                </Button>
              </div>
            ))}"""

new_row = """            {trustedBuyers.map(buyer => (
              <div key={buyer.id} className="p-2 sm:p-2.5 flex items-center justify-between gap-2.5 hover:bg-muted/10 transition-colors">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">{buyer.full_name}</h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    {buyer.store_name && (
                      <span className="flex items-center gap-1 bg-muted/60 px-1.5 py-0.2 rounded font-medium">
                        <Store className="w-3 h-3 text-muted-foreground" /> {buyer.store_name}
                      </span>
                    )}
                    {buyer.phone && (
                      <span className="flex items-center gap-1 font-mono" dir="ltr">
                        <Phone className="w-3 h-3 text-muted-foreground" /> {buyer.phone}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleRemove(buyer.id)}
                  disabled={isRemoving === buyer.id}
                  className="shrink-0 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 h-7 text-[10px] sm:text-xs px-2.5 font-bold rounded-lg cursor-pointer shadow-2xs"
                >
                  {isRemoving === buyer.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "إزالة من القائمة"}
                </Button>
              </div>
            ))}"""

if "\r\n" in text_tb:
    old_row = old_row.replace("\n", "\r\n")
    new_row = new_row.replace("\n", "\r\n")

if old_row in text_tb:
    text_tb = text_tb.replace(old_row, new_row, 1)
    print("SUCCESS: Updated trusted-buyers-client.tsx")
else:
    print("Warning: old_row not found in trusted-buyers-client.tsx")

with open(path_tb, 'w', encoding='utf-8') as f:
    f.write(text_tb)
