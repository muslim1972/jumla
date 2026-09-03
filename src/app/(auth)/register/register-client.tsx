"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { signUp } from "./actions"
import { useState, useTransition } from "react"
import { Loader2, MapPin, Eye, EyeOff } from "lucide-react"

export function RegisterClient({ message }: { message?: string }) {
  const [role, setRole] = useState("guest")
  const [isPending, startTransition] = useTransition()
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleGetLocation = () => {
    setIsLocating(true)
    setLocationError("")
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude)
          setLongitude(position.coords.longitude)
          setIsLocating(false)
        },
        (error) => {
          setIsLocating(false)
          setLocationError("تعذر تحديد الموقع. يرجى التأكد من تفعيل خدمات الموقع والمحاولة مرة أخرى.")
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      )
    } else {
      setIsLocating(false)
      setLocationError("المتصفح الخاص بك لا يدعم تحديد الموقع.")
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // التحقق من رقم الهاتف: 11 رقماً تبدأ بـ07 (لا أكثر ولا أقل)
    if (!/^07\d{9}$/.test(phone)) {
      setPhoneError("رقم الهاتف يجب أن يكون 11 رقماً ويبدأ بـ07")
      return
    }
    setPhoneError("")

    startTransition(() => {
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
              <Label htmlFor="phone">رقم الهاتف</Label>
              <div className="flex items-stretch gap-2" dir="ltr">
                {/* حقل الدولة ثابت: العلم المصغر + رمز العراق ولا يمكن تعديله */}
                <div
                  className="flex items-center gap-1.5 px-3 rounded-md border bg-muted/60 text-sm font-bold select-none shrink-0"
                  title="العراق"
                >
                  <span aria-hidden>🇮🇶</span>
                  <span dir="ltr">+964</span>
                </div>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="07XX XXX XXXX"
                  required
                  dir="ltr"
                  maxLength={11}
                  className="flex-1 tracking-wider"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                />
              </div>
              {phoneError ? (
                <p className="text-xs text-destructive">{phoneError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">11 رقماً تبدأ بـ07 — مثال: 07701234567</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  dir="ltr"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">نوع الحساب</Label>
              <Select name="role" value={role} onValueChange={(val) => setRole(val || "guest")} required>
                <SelectTrigger id="role" dir="rtl">
                  <SelectValue placeholder="اختر نوع الحساب" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="guest">مشتري</SelectItem>
                  <SelectItem value="merchant">تاجر</SelectItem>
                  <SelectItem value="member">عضو تطبيق</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Section */}
            {(role === "guest" || role === "merchant") && (
              <div className="space-y-2 pt-2 border-t mt-4">
                <Label>الموقع الجغرافي للمتجر / البقالة (اختياري لكنه يسهل التوصيل)</Label>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant={latitude ? "secondary" : "outline"}
                    className="w-full gap-2 border-primary/20 hover:bg-primary/5"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <MapPin className={`w-4 h-4 ${latitude ? "text-emerald-500" : "text-brand-orange"}`} />
                    )}
                    {latitude ? "تم تحديد الموقع بنجاح ✓" : "التقاط موقعي الحالي"}
                  </Button>
                  {locationError && <p className="text-xs text-destructive">{locationError}</p>}
                </div>
                {latitude && longitude && (
                  <>
                    <input type="hidden" name="latitude" value={latitude} />
                    <input type="hidden" name="longitude" value={longitude} />
                  </>
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
