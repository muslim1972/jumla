"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Loader2, Store } from "lucide-react"
import { getAllMerchants, assignMerchantToDeliveryWorker } from "@/app/(app)/delivery/actions"
import { toast } from "sonner"

export function AddMerchantDialog({ onMerchantAdded }: { onMerchantAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [merchants, setMerchants] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadMerchants()
    }
  }, [open])

  async function loadMerchants() {
    setIsLoading(true)
    const result = await getAllMerchants()
    if (result.merchants) {
      setMerchants(result.merchants)
    } else if (result.error) {
      toast.error(result.error)
    }
    setIsLoading(false)
  }

  async function handleAddMerchant(merchantId: string) {
    setAddingId(merchantId)
    const result = await assignMerchantToDeliveryWorker(merchantId)
    setAddingId(null)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("تم إضافة التاجر بنجاح")
      setOpen(false)
      onMerchantAdded() // Refresh the current merchants list
    }
  }

  const filteredMerchants = merchants.filter(m => 
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.store_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-brand-orange text-brand-orange hover:bg-brand-orange/10 hover:text-brand-orange">
          <Plus className="w-4 h-4" />
          إضافة تاجر
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-brand-blue">إضافة تاجر جديد</DialogTitle>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="ابحث عن اسم التاجر أو المتجر..." 
            className="pr-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2 mt-4 min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
            </div>
          ) : filteredMerchants.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              لم يتم العثور على تجار
            </div>
          ) : (
            filteredMerchants.map(merchant => (
              <div key={merchant.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-brand-blue">{merchant.full_name}</p>
                    {merchant.store_name && (
                      <p className="text-xs text-muted-foreground">{merchant.store_name}</p>
                    )}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleAddMerchant(merchant.id)}
                  disabled={addingId === merchant.id}
                  className="bg-brand-orange hover:bg-brand-orange/90 text-white"
                >
                  {addingId === merchant.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
