"use client"

import { useState } from "react"
import { chargeWallet } from "@/app/(app)/wallet/actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface TopUpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TopUpModal({ isOpen, onClose }: TopUpModalProps) {
  const [amount, setAmount] = useState<string>("25000")
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Auto-format card number
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 16) value = value.slice(0, 16)
    // Add space every 4 digits
    const formattedValue = value.replace(/(\d{4})/g, "$1 ").trim()
    setCardNumber(formattedValue)
  }

  // Auto-format expiry date
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 4) value = value.slice(0, 4)
    if (value.length >= 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`
    }
    setExpiry(value)
  }

  // Auto-format CVV
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length > 3) value = value.slice(0, 3)
    setCvv(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const numAmount = parseInt(amount)
    
    if (isNaN(numAmount) || numAmount < 25000) {
      setError("الحد الأدنى للشحن هو 25,000 دينار")
      setIsLoading(false)
      return
    }

    const res = await chargeWallet(numAmount, { cardNumber, expiry, cvv })
    
    if (res.success) {
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
        setAmount("25000")
        setCardNumber("")
        setExpiry("")
        setCvv("")
      }, 2000)
    } else {
      setError(res.error || "حدث خطأ غير معروف")
    }
    
    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden rounded-2xl border-0 p-0 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl"></div>
        
        <div className="relative z-10 bg-background/80 p-6 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="text-brand-blue w-6 h-6" />
              شحن المحفظة
            </DialogTitle>
          </DialogHeader>

          {success ? (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-600 mb-2">تم الشحن بنجاح!</h3>
              <p className="text-muted-foreground">تم إضافة الرصيد إلى محفظتك بنجاح.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 mt-6 animate-in fade-in duration-300">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ (دينار عراقي)</Label>
                <div className="relative">
                  <Input 
                    id="amount" 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-12 text-lg font-bold"
                    dir="ltr"
                    min="25000"
                    step="1000"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">IQD</span>
                </div>
                <p className="text-xs text-muted-foreground">الحد الأدنى 25,000 دينار</p>
              </div>

              <div className="space-y-4 bg-muted/30 p-4 rounded-xl border">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm">بيانات الماستر كارد</span>
                  <div className="flex gap-1">
                    {/* Simulated Mastercard circles */}
                    <div className="w-6 h-6 rounded-full bg-red-500/80 -mr-2"></div>
                    <div className="w-6 h-6 rounded-full bg-yellow-500/80 mix-blend-multiply"></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardNumber" className="text-xs">رقم البطاقة</Label>
                  <Input 
                    id="cardNumber" 
                    placeholder="0000 0000 0000 0000" 
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="font-mono"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry" className="text-xs">تاريخ الانتهاء</Label>
                    <Input 
                      id="expiry" 
                      placeholder="MM/YY" 
                      value={expiry}
                      onChange={handleExpiryChange}
                      className="font-mono text-center"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv" className="text-xs">رمز التحقق (CVV)</Label>
                    <Input 
                      id="cvv" 
                      placeholder="123" 
                      type="password"
                      value={cvv}
                      onChange={handleCvvChange}
                      className="font-mono text-center tracking-widest"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-brand-blue hover:bg-brand-blue/90 h-12 text-lg rounded-xl shadow-lg transition-all hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `شحن ${parseInt(amount || "0").toLocaleString('en-US')} دينار`}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
