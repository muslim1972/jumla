const fs = require('fs');
const file = 'd:/jumla/src/features/merchant/components/master-catalog-linker.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('MasterProductForm')) {
  content = content.replace(
    'import { createMerchantProduct } from "@/features/merchant/actions"',
    `import { createMerchantProduct } from "@/features/merchant/actions"
import { MasterProductForm } from "@/features/materials/components/materials-manager"
import { createMasterProduct } from "@/features/materials/actions"`
  );
  
  content = content.replace(
    'const [isSubmitting, setIsSubmitting] = useState(false)',
    `const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCreateMasterModal, setShowCreateMasterModal] = useState(false)`
  );
  
  content = content.replace(
    `<p className="text-muted-foreground text-sm">لا توجد مواد مطابقة لبحثك.</p>`,
    `<p className="text-muted-foreground text-sm mb-4">لا توجد مواد مطابقة لبحثك.</p>
              <Button type="button" variant="outline" className="w-full text-brand-blue border-brand-blue/30 hover:bg-brand-blue/10" onClick={() => setShowCreateMasterModal(true)}>
                <Plus className="w-4 h-4 ml-1" />
                المادة غير موجودة؟ أضف مادة جديدة للكتالوج المركزي
              </Button>`
  );
  
  // Also add it at the bottom of the list for easy access
  content = content.replace(
    `</div>
          )}

        </CardContent>`,
    `</div>
          )}
          
          {filtered.length > 0 && (
            <div className="pt-2">
              <Button type="button" variant="ghost" className="w-full text-xs text-brand-blue hover:bg-brand-blue/10 border border-dashed border-brand-blue/30" onClick={() => setShowCreateMasterModal(true)}>
                <Plus className="w-3.5 h-3.5 ml-1" />
                لم تجد المادة المطلوبة؟ أضف مادة جديدة للكتالوج
              </Button>
            </div>
          )}

        </CardContent>
        
        {/* نافذة إضافة مادة مركزية جديدة (خاصية مشتركة مع إدارة المواد) */}
        <Dialog open={showCreateMasterModal} onOpenChange={showCreateMasterModal ? () => {} : setShowCreateMasterModal}>
          <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto" dir="rtl" hideCloseButton>
            <DialogHeader className="mb-4">
              <div className="flex items-center justify-between w-full">
                <DialogTitle className="text-brand-blue flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  إضافة مادة جديدة للكتالوج المركزي
                </DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateMasterModal(false)} className="shrink-0 hover:bg-destructive/10 hover:text-destructive">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <CardDescription className="text-right">
                ستتم إضافة هذه المادة إلى الكتالوج العام ليتمكن الجميع من رؤيتها. يرجى التأكد من كتابة الاسم والوصف بشكل دقيق.
              </CardDescription>
            </DialogHeader>
            <div className="-mx-4 sm:mx-0">
              <MasterProductForm 
                categories={categories}
                formId="merchant-master-add"
                submitLabel="إضافة المادة للكتالوج"
                onSubmit={createMasterProduct}
                onSuccess={() => {
                  setShowCreateMasterModal(false)
                  router.refresh()
                }}
              />
            </div>
          </DialogContent>
        </Dialog>`
  );
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Injected MasterProductForm into Merchant Linker!');
} else {
  console.log('Already injected.');
}
