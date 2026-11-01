# 1. Update merchant-products-list.tsx
list_path = 'src/features/merchant/components/merchant-products-list.tsx'
with open(list_path, 'r', encoding='utf-8') as f:
    text_list = f.read()

target_card = """            return (
              <Card key={product.id} className={cn(
                "overflow-hidden shadow-2xs hover:shadow-md transition-shadow border border-border/80",
                viewMode === 'grid' ? "flex flex-col rounded-xl" : "p-2 sm:p-2.5 rounded-xl flex items-center gap-2 sm:gap-3 bg-card"
              )}>"""

replacement_div = """            return (
              <div key={product.id} className={cn(
                "overflow-hidden border border-border/80 bg-card transition-all",
                viewMode === 'grid' 
                  ? "flex flex-col rounded-xl shadow-2xs hover:shadow-md" 
                  : "flex flex-row items-center justify-between p-2.5 sm:p-3 rounded-xl gap-2.5 sm:gap-3.5 shadow-2xs hover:shadow-sm"
              )}>"""

if "\r\n" in text_list:
    target_card = target_card.replace("\n", "\r\n")
    replacement_div = replacement_div.replace("\n", "\r\n")

assert target_card in text_list, "target_card not found in merchant-products-list.tsx"
text_list = text_list.replace(target_card, replacement_div, 1)

# Also ensure closing tag is </div> instead of </Card>
target_close = """                    </div>
                  </>
                )}
              </Card>"""

replacement_close = """                    </div>
                  </>
                )}
              </div>"""

if "\r\n" in text_list:
    target_close = target_close.replace("\n", "\r\n")
    replacement_close = replacement_close.replace("\n", "\r\n")

assert target_close in text_list, "target_close not found in merchant-products-list.tsx"
text_list = text_list.replace(target_close, replacement_close, 1)

with open(list_path, 'w', encoding='utf-8') as f:
    f.write(text_list)
print("SUCCESS: Converted Card to flex-row div in merchant-products-list.tsx")

# 2. Update edit-product-modal.tsx to give buttons w-20 justify-center
modal_path = 'src/features/merchant/components/edit-product-modal.tsx'
with open(modal_path, 'r', encoding='utf-8') as f:
    text_modal = f.read()

target_modal_btn = """      {sideActions ? (
        <div className="flex flex-col gap-1.5 shrink-0 justify-center">
          <DialogTrigger render={
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 h-7 text-[10px] sm:text-[11px] px-2 font-bold cursor-pointer rounded-lg shadow-2xs"
            >
              <Edit className="w-3 h-3 ml-1 text-brand-orange" /> تعديل
            </Button>
          } />
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 h-7 text-[10px] sm:text-[11px] px-2 font-bold cursor-pointer rounded-lg shadow-2xs"
          >
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3 ml-1" /> {isLinked ? "إلغاء الربط" : "حذف"}</>}
          </Button>
        </div>"""

replacement_modal_btn = """      {sideActions ? (
        <div className="flex flex-col gap-1.5 shrink-0 justify-center">
          <DialogTrigger render={
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 h-7 text-[10px] sm:text-[11px] px-2 font-bold cursor-pointer rounded-lg shadow-2xs w-20 justify-center"
            >
              <Edit className="w-3 h-3 ml-1 text-brand-orange" /> تعديل
            </Button>
          } />
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 h-7 text-[10px] sm:text-[11px] px-2 font-bold cursor-pointer rounded-lg shadow-2xs w-20 justify-center"
          >
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3 ml-1" /> {isLinked ? "إلغاء الربط" : "حذف"}</>}
          </Button>
        </div>"""

if "\r\n" in text_modal:
    target_modal_btn = target_modal_btn.replace("\n", "\r\n")
    replacement_modal_btn = replacement_modal_btn.replace("\n", "\r\n")

if target_modal_btn in text_modal:
    text_modal = text_modal.replace(target_modal_btn, replacement_modal_btn, 1)
    with open(modal_path, 'w', encoding='utf-8') as f:
        f.write(text_modal)
    print("SUCCESS: Updated edit-product-modal.tsx button width")
else:
    print("Warning: target_modal_btn not matched")
