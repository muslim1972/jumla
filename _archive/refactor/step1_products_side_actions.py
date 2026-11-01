# 1. Update edit-product-modal.tsx to support sideActions prop
modal_path = 'src/features/merchant/components/edit-product-modal.tsx'
with open(modal_path, 'r', encoding='utf-8') as f:
    text_modal = f.read()

target_signature = 'export function EditProductModal({ product, categories = [], compactMode = false }: { product: any, categories?: {id: string, name: string}[], compactMode?: boolean }) {'
replacement_signature = 'export function EditProductModal({ product, categories = [], compactMode = false, sideActions = false }: { product: any, categories?: {id: string, name: string}[], compactMode?: boolean, sideActions?: boolean }) {'

assert target_signature in text_modal, "Signature not found in edit-product-modal.tsx"
text_modal = text_modal.replace(target_signature, replacement_signature, 1)

target_trigger = """      {compactMode ? (
        <DialogTrigger render={
          <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 font-bold border-brand-orange text-brand-orange hover:bg-brand-orange/10">
            <Edit className="w-3 h-3 ml-1" /> تعديل
          </Button>
        } />
      ) : (
        <div className="flex gap-1.5 w-full mt-2">
          <DialogTrigger render={
            <Button variant="outline" className="flex-1 border-brand-orange text-brand-orange hover:bg-brand-orange/10 h-8 sm:h-9 text-[11px] sm:text-sm px-1 sm:px-4">
              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:ml-2" /> تعديل
            </Button>
          } />
          <Button 
            variant="outline" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 border-destructive text-destructive hover:bg-destructive/10 h-8 sm:h-9 text-[11px] sm:text-sm px-1 sm:px-4"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:ml-2" /> {isLinked ? "إلغاء الربط" : "حذف"}</>}
          </Button>
        </div>
      )}"""

replacement_trigger = """      {sideActions ? (
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
        </div>
      ) : compactMode ? (
        <DialogTrigger render={
          <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 font-bold border-brand-orange text-brand-orange hover:bg-brand-orange/10">
            <Edit className="w-3 h-3 ml-1" /> تعديل
          </Button>
        } />
      ) : (
        <div className="flex gap-1.5 w-full mt-2">
          <DialogTrigger render={
            <Button variant="outline" className="flex-1 border-brand-orange text-brand-orange hover:bg-brand-orange/10 h-8 sm:h-9 text-[11px] sm:text-sm px-1 sm:px-4">
              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:ml-2" /> تعديل
            </Button>
          } />
          <Button 
            variant="outline" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 border-destructive text-destructive hover:bg-destructive/10 h-8 sm:h-9 text-[11px] sm:text-sm px-1 sm:px-4"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:ml-2" /> {isLinked ? "إلغاء الربط" : "حذف"}</>}
          </Button>
        </div>
      )}"""

if "\r\n" in text_modal:
    target_trigger = target_trigger.replace("\n", "\r\n")
    replacement_trigger = replacement_trigger.replace("\n", "\r\n")

assert target_trigger in text_modal, "Trigger target not found in edit-product-modal.tsx"
text_modal = text_modal.replace(target_trigger, replacement_trigger, 1)

with open(modal_path, 'w', encoding='utf-8') as f:
    f.write(text_modal)
print("SUCCESS: Updated edit-product-modal.tsx with sideActions")

# 2. Update merchant-products-list.tsx
list_path = 'src/features/merchant/components/merchant-products-list.tsx'
with open(list_path, 'r', encoding='utf-8') as f:
    text_list = f.read()

target_products_map = """          {products.map((product) => (
            <Card key={product.id} className={cn(
              "overflow-hidden flex shadow-sm hover:shadow-md transition-shadow",
              viewMode === 'grid' ? "flex-col rounded-xl" : "flex-row rounded-lg items-stretch"
            )}>
              {/* Product Image */}
              {product.image_url ? (
                <div className={cn(
                  "relative bg-muted",
                  viewMode === 'grid' ? "h-28 w-full" : "w-28 shrink-0 border-l"
                )}>
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-contain p-2"
                  />
                </div>
              ) : (
                <div className={cn(
                  "relative bg-muted flex items-center justify-center",
                  viewMode === 'grid' ? "h-28 w-full" : "w-28 shrink-0 border-l"
                )}>
                  <span className="text-xs text-muted-foreground">بدون صورة</span>
                </div>
              )}

              {/* Product Content */}
              <div className="flex flex-col flex-1 min-w-0">
                <CardHeader className={cn("pb-1", viewMode === 'grid' ? "p-3" : "p-3 pb-0")}>
                  <CardTitle className="text-xs sm:text-sm font-bold line-clamp-2 leading-snug flex items-center gap-1.5 flex-wrap">
                    <span>{product.name}</span>
                    {product.master_product_id && (
                      <span className="bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0">
                        مربوطة مركزياً
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className={cn("pt-0 flex-1 flex flex-col", viewMode === 'grid' ? "p-3" : "p-3")}>
                  {viewMode === 'grid' && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 mb-2">
                      {product.description || "لا يوجد وصف"}
                    </p>
                  )}
                  
                  <div className={cn(
                    "mt-auto",
                    viewMode === 'list' && "flex items-center justify-between gap-4"
                  )}>
                    <div className={cn("space-y-1", viewMode === 'list' && "flex-1")}>
                      {product.units && product.units.length > 0 ? (
                        product.units.map((unit: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs border-b border-border/50 pb-1 last:border-0 last:pb-0">
                            <span className="font-bold text-brand-blue" dir="ltr">{unit.price.toLocaleString('en-US')}</span>
                            <span className="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium">{unit.type}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-brand-blue" dir="ltr">{product.price?.toLocaleString('en-US')}</span>
                          <span className="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium">{product.unit_type}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className={cn(
                      "flex items-center justify-between border-border/50",
                      viewMode === 'grid' ? "mt-3 border-t pt-2" : "border-r pr-4"
                    )}>
                      <div className="text-xs text-muted-foreground flex flex-col gap-1">
                        <span>المخزون: <span className="font-bold text-foreground">
                          {product.stock_quantity !== undefined 
                            ? Math.floor(product.stock_quantity / (product.units?.find((u: any) => u.type === (product.stock_unit || "كارتون"))?.multiplier_to_base || 1))
                            : 0} {product.stock_unit || "كارتون"}
                        </span></span>
                        {product.categories?.name && <span>القسم: <span className="font-medium text-foreground">{product.categories.name}</span></span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                <div className={cn(
                  "mt-auto",
                  viewMode === 'grid' ? "p-3 pt-0" : "p-3 border-t bg-muted/20"
                )}>
                  <EditProductModal product={product} categories={categories} />
                </div>
              </div>
            </Card>
          ))}"""

replacement_products_map = """          {products.map((product) => {
            const stockQty = product.stock_quantity !== undefined 
              ? Math.floor(product.stock_quantity / (product.units?.find((u: any) => u.type === (product.stock_unit || "كارتون"))?.multiplier_to_base || 1))
              : 0
            const unitLabel = product.stock_unit || product.unit_type || "كارتون"

            return (
              <Card key={product.id} className={cn(
                "overflow-hidden shadow-2xs hover:shadow-md transition-shadow border border-border/80",
                viewMode === 'grid' ? "flex flex-col rounded-xl" : "p-2 sm:p-2.5 rounded-xl flex items-center gap-2 sm:gap-3 bg-card"
              )}>
                {viewMode === 'list' ? (
                  <>
                    {/* الصورة الدلالية المصغرة لتاجر الجملة على اليمين */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-muted/50 rounded-lg overflow-hidden border border-border/60 flex items-center justify-center">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="64px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <span className="text-[9px] text-muted-foreground">بدون صورة</span>
                      )}
                    </div>

                    {/* بيانات المادة في المنتصف */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[190px] sm:max-w-none">
                          {product.name}
                        </h3>
                        {product.master_product_id && (
                          <span className="bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0">
                            مربوطة مركزياً
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="font-black text-brand-blue text-xs sm:text-sm" dir="ltr">
                          {Number(product.price || 0).toLocaleString('en-US')} د.ع
                        </span>
                        <span className="bg-secondary/60 text-secondary-foreground px-1.5 py-0.2 rounded text-[10px] font-medium">
                          {unitLabel}
                        </span>
                        <span className="text-muted-foreground text-[10px] font-medium">
                          • المخزون: <strong className={stockQty <= 5 ? "text-rose-600 font-bold" : "text-foreground"}>{stockQty} {unitLabel}</strong>
                        </span>
                        {product.categories?.name && (
                          <span className="text-muted-foreground text-[10px] hidden sm:inline">
                            • {product.categories.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* زري الإجراءات على أقصى اليسار بشكل عمودي مدمج */}
                    <EditProductModal product={product} categories={categories} sideActions={true} />
                  </>
                ) : (
                  <>
                    {/* عرض الشبكة الكلاسيكي المريح */}
                    {product.image_url ? (
                      <div className="relative bg-muted h-28 w-full">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-contain p-2"
                        />
                      </div>
                    ) : (
                      <div className="relative bg-muted flex items-center justify-center h-28 w-full">
                        <span className="text-xs text-muted-foreground">بدون صورة</span>
                      </div>
                    )}

                    <div className="flex flex-col flex-1 min-w-0 p-3">
                      <CardTitle className="text-xs sm:text-sm font-bold line-clamp-2 leading-snug flex items-center gap-1.5 flex-wrap mb-2">
                        <span>{product.name}</span>
                        {product.master_product_id && (
                          <span className="bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0">
                            مربوطة مركزياً
                          </span>
                        )}
                      </CardTitle>

                      <div className="mt-auto space-y-2 border-t pt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-brand-blue text-sm" dir="ltr">
                            {Number(product.price || 0).toLocaleString('en-US')} د.ع
                          </span>
                          <span className="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium">
                            {unitLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex justify-between">
                          <span>المخزون:</span>
                          <span className="font-bold text-foreground">{stockQty} {unitLabel}</span>
                        </div>
                        <EditProductModal product={product} categories={categories} />
                      </div>
                    </div>
                  </>
                )}
              </Card>
            )
          })}"""

if "\r\n" in text_list:
    target_products_map = target_products_map.replace("\n", "\r\n")
    replacement_products_map = replacement_products_map.replace("\n", "\r\n")

assert target_products_map in text_list, "Products map target not found in merchant-products-list.tsx"
text_list = text_list.replace(target_products_map, replacement_products_map, 1)

with open(list_path, 'w', encoding='utf-8') as f:
    f.write(text_list)
print("SUCCESS: Updated merchant-products-list.tsx with vertical side actions in list mode")
