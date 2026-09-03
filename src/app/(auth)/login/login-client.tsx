"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { signIn, checkUserRole } from "./actions"
import { isPhoneIdentity } from "@/utils/phone"
import { useState, useRef, useTransition } from "react"
import { Loader2, UserCircle, Eye, EyeOff } from "lucide-react"

const roleLabels: Record<string, { label: string, color: string }> = {
  "guest": { label: "حساب مشتري", color: "bg-blue-100 text-blue-700" },
  "merchant": { label: "حساب تاجر", color: "bg-emerald-100 text-emerald-700" },
  "member": { label: "عضو تطبيق", color: "bg-indigo-100 text-indigo-700" },
  "delivery": { label: "حساب مندوب", color: "bg-amber-100 text-amber-700" },
  "support": { label: "موظف دعم", color: "bg-purple-100 text-purple-700" },
  "call_center": { label: "Call Center", color: "bg-teal-100 text-teal-700" },
  "admin": { label: "مدير النظام", color: "bg-red-100 text-red-700" },
  "materials": { label: "إدارة المواد", color: "bg-cyan-100 text-cyan-700" }
}

export function LoginClient({ message }: { message?: string }) {
  const [identity, setIdentity] = useState("")
  const [mode, setMode] = useState<"phone" | "email">("phone")
  const [roleInfo, setRoleInfo] = useState<{ role: string, name: string | null } | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState(message || "")
  const [showPassword, setShowPassword] = useState(false)
  const lastCheckedIdentityRef = useRef("")

  const checkIdentityRole = async (value: string) => {
    const trimmed = value.trim()
    // رقم هاتف صالح (11 رقماً تبدأ بـ07) أو بريد إلكتروني صالح (للحسابات القديمة)
    const isValid = isPhoneIdentity(trimmed) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    if (!trimmed || !isValid) {
      setRoleInfo(null)
      return
    }

    if (trimmed === lastCheckedIdentityRef.current) return

    lastCheckedIdentityRef.current = trimmed
    setIsChecking(true)
    try {
      const foundRole = await checkUserRole(trimmed)
      setRoleInfo(foundRole)
    } catch (e) {
      console.error(e)
    } finally {
      setIsChecking(false)
    }
  }

  const handleIdentityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // في وضع الهاتف: أرقام فقط بحد أقصى 11 رقماً
    const value = mode === "phone" ? e.target.value.replace(/\D/g, "").slice(0, 11) : e.target.value
    setIdentity(value)

    if (!value) {
      setRoleInfo(null)
      lastCheckedIdentityRef.current = ""
      return
    }

    // فحص دوري مباشر عند اكتمال الصيغة (رقم هاتف كامل أو بريد صالح)
    if (isPhoneIdentity(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      checkIdentityRole(value)
    } else if (mode === "phone") {
      setRoleInfo(null)
      lastCheckedIdentityRef.current = ""
    }
  }

  const handleIdentityBlur = () => {
    checkIdentityRole(identity)
  }

  const switchMode = (newMode: "phone" | "email") => {
    setMode(newMode)
    setIdentity("")
    setRoleInfo(null)
    lastCheckedIdentityRef.current = ""
    setErrorMsg("")
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      setErrorMsg("")
      const result = await signIn(formData)
      if (result?.error) {
        setErrorMsg(result.error)
      }
    })
  }

  return (
    <div className="w-full max-w-md p-4">
      <Card className="shadow-lg border-muted">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
          <CardDescription>
            {mode === "phone"
              ? "أدخل رقم هاتفك وكلمة المرور للدخول إلى حسابك"
              : "الدخول بالبريد الإلكتروني — للحسابات القديمة المسجلة ببريد"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md text-center">
                {errorMsg}
              </div>
            )}
            
            <div className="space-y-2 relative">
              {mode === "phone" ? (
                <>
                  <Label htmlFor="identity">رقم الهاتف</Label>
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
                      id="identity"
                      name="identity"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="07XX XXX XXXX"
                      required
                      dir="ltr"
                      maxLength={11}
                      className="flex-1 tracking-wider"
                      value={identity}
                      onChange={handleIdentityChange}
                      onBlur={handleIdentityBlur}
                    />
                  </div>
                </>
              ) : (
                <>
                  <Label htmlFor="identity">البريد الإلكتروني</Label>
                  <Input
                    id="identity"
                    name="identity"
                    type="email"
                    placeholder="m@example.com"
                    required
                    className="text-right"
                    dir="ltr"
                    value={identity}
                    onChange={handleIdentityChange}
                    onBlur={handleIdentityBlur}
                  />
                </>
              )}

              {/* مؤشر الدور أسفل حقل الهوية */}
              <div className="h-6 flex items-center justify-between">
                <div className="text-sm font-bold text-brand-blue flex-1 text-right">
                   {roleInfo?.name ? <span className="animate-in fade-in slide-in-from-right-2">أهلاً بك، {roleInfo.name} 👋</span> : null}
                </div>
                {isChecking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                ) : roleInfo?.role && roleLabels[roleInfo.role] ? (
                  <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${roleLabels[roleInfo.role].color}`}>
                    <UserCircle className="w-3.5 h-3.5" />
                    {roleLabels[roleInfo.role].label}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => switchMode(mode === "phone" ? "email" : "phone")}
                className="text-xs text-muted-foreground hover:text-brand-orange underline underline-offset-2"
              >
                {mode === "phone"
                  ? "تسجيل الدخول بالبريد الإلكتروني (حسابات قديمة)"
                  : "تسجيل الدخول برقم الهاتف"}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">كلمة المرور</Label>
              </div>
              
              <div className="relative">
                <Input 
                  id="password" 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  dir="ltr" 
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full font-bold text-lg" type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "دخول"}
            </Button>
            <div className="text-center space-y-4 w-full">
              <p className="text-sm text-muted-foreground">
                ليس لديك حساب؟{" "}
                <Link href="/register" className="text-brand-orange hover:underline font-bold">
                  إنشاء حساب جديد
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
