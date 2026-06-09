"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { signUp, getMerchantsForRegistration } from "./actions"
import { useState, useEffect, useTransition } from "react"
import { Loader2, Search, CheckSquare, Square } from "lucide-react"

export function RegisterClient({ message }: { message?: string }) {
  const [role, setRole] = useState("guest")
  const [merchants, setMerchants] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(false)

  useEffect(() => {
    if (role === "delivery") {
      setIsLoadingMerchants(true)
      getMerchantsForRegistration().then(data => {
        setMerchants(data)
        setIsLoadingMerchants(false)
      })
    }
  }, [role])

  const toggleMerchant = (id: string) => {
    setSelectedMerchants(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const filteredMerchants = merchants.filter(m => 
    (m.full_name || "").includes(searchQuery) || 
    (m.store_name || "").includes(searchQuery)
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(() => {
      if (role === "delivery") {
        formData.append("assigned_merchants", JSON.stringify(selectedMerchants))
      }
      signUp(formData)
    })
  }

  return (
    <div className="w-full max-w-md p-4">
      <Card className="shadow-lg border-muted">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">إنشاء حساب جديد</CardTitle>
          <CardDescription>
            أدخل بياناتك لإنشاء حساب والبدء بالتسوق أو البيع
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {message && (
              <div className="p-3 bg-secondary text-secondary-foreground text-sm rounded-md text-center">
                {message}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="محمد علي"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                className="text-right"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" name="password" type="password" required dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">نوع الحساب</Label>
              <Select name="role" value={role} onValueChange={(val) => setRole(val || "guest")} required>
                <SelectTrigger id="role" dir="rtl">
                  <SelectValue placeholder="اختر نوع الحساب" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="guest">مشتري (مفرد)</SelectItem>
                  <SelectItem value="merchant">تاجر (جملتي)</SelectItem>
                  <SelectItem value="delivery">عامل توصيل</SelectItem>
                  <SelectItem value="support">موظف دعم</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Delivery Merchants Selection */}
            {role === "delivery" && (
              <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                <Label>اختر التجار الذين تعمل معهم</Label>
                
                <div className="relative">
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="ابحث عن تاجر..." 
                    className="pr-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="h-40 overflow-y-auto space-y-1 pr-1 border rounded-md p-2 bg-background">
                  {isLoadingMerchants ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredMerchants.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      لا يوجد تجار بهذا الاسم
                    </div>
                  ) : (
                    filteredMerchants.map((merchant) => {
                      const isSelected = selectedMerchants.includes(merchant.id)
                      return (
                        <div 
                          key={merchant.id}
                          onClick={() => toggleMerchant(merchant.id)}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                            isSelected ? "bg-brand-orange/10 text-brand-orange" : "hover:bg-muted"
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">
                            {merchant.store_name || merchant.full_name || "تاجر غير معروف"}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
                {selectedMerchants.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    تم اختيار {selectedMerchants.length} تاجر
                  </div>
                )}
              </div>
            )}

          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full font-bold text-lg" type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء حساب"}
            </Button>
            <div className="text-center space-y-4 w-full">
              <p className="text-sm text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <Link href="/login" className="text-brand-orange hover:underline font-bold">
                  تسجيل الدخول
                </Link>
              </p>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">أو</span>
                </div>
              </div>
              <Link 
                href="/" 
                className={buttonVariants({ variant: "outline", className: "w-full font-bold" })}
              >
                تصفح كزائر
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
