"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Loader2, Store } from "lucide-react"
import { getAllMerchants, assignMerchantToDeliveryWorker } from "@/features/delivery/actions"

export function AddMerchantDialog({ 
  onMerchantAdded, 
  existingMerchantIds = [] 
}: { 
  onMerchantAdded: () => void
  existingMerchantIds?: string[] 
}) {
  const [open, setOpen] = useState(false)
  const [merchants, setMerchants] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string, type: "error" | "success" } | null>(null)

  useEffect(() => {
    if (open) {
      setMessage(null)
      loadMerchants()
    }
  }, [open])

  async function loadMerchants() {
    setIsLoading(true)
    const result = await getAllMerchants()
    if (result.merchants) {
      setMerchants(result.merchants)
    } else if (result.error) {
      setMessage({ text: result.error, type: "error" })
    }
    setIsLoading(false)
  }

  async function handleAddMerchant(merchantId: string) {
    setAddingId(merchantId)
    const result = await assignMerchantToDeliveryWorker(merchantId)
    setAddingId(null)
    
    if (result.error) {
      setMessage({ text: result.error, type: "error" })
    } else {
      setMessage({ text: "تم إضافة التاجر بنجاح", type: "success" })
      setTimeout(() => {
        setOpen(false)
        onMerchantAdded()
      }, 1000)
    }
  }

  const filteredMerchants = merchants.filter(m => 
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.store_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2 border-brand-orange text-brand-orange hover:bg-brand-orange/10 hover:text-brand-orange">
        <Plus className="w-4 h-4" />
        إضافة تاجر
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
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

        {message && (
          <div className={`mt-3 p-3 text-sm rounded-lg ${message.type === "error" ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
            {message.text}
          </div>
        )}

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
            filteredMerchants.map(merchant => {
              const isExisting = existingMerchantIds.includes(merchant.id)
              return (
                <div key={merchant.id} className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${isExisting ? 'bg-muted/50 opacity-70' : 'hover:bg-muted/30'}`}>
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
                  {isExisting ? (
                    <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md">
                      تمت الإضافة
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleAddMerchant(merchant.id)}
                      disabled={addingId === merchant.id}
                      className="bg-brand-orange hover:bg-brand-orange/90 text-white"
                    >
                      {addingId === merchant.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة"}
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
