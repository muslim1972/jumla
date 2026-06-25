"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { signIn, checkUserRoleByEmail } from "./actions"
import { useState, useRef, useTransition } from "react"
import { Loader2, UserCircle, Eye, EyeOff } from "lucide-react"

const roleLabels: Record<string, { label: string, color: string }> = {
  "guest": { label: "حساب مشتري", color: "bg-blue-100 text-blue-700" },
  "merchant": { label: "حساب تاجر", color: "bg-emerald-100 text-emerald-700" },
  "delivery": { label: "حساب مندوب", color: "bg-amber-100 text-amber-700" },
  "support": { label: "موظف دعم", color: "bg-purple-100 text-purple-700" },
  "admin": { label: "مدير النظام", color: "bg-red-100 text-red-700" }
}

export function LoginClient({ message }: { message?: string }) {
  const [email, setEmail] = useState("")
  const [roleInfo, setRoleInfo] = useState<{ role: string, name: string | null } | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState(message || "")
  const [showPassword, setShowPassword] = useState(false)
  const lastCheckedEmailRef = useRef("")
  
  const checkEmailRole = async (emailValue: string) => {
    const trimmed = emailValue.trim()
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setRoleInfo(null)
      return
    }
    
    if (trimmed === lastCheckedEmailRef.current) return

    lastCheckedEmailRef.current = trimmed
    setIsChecking(true)
    try {
      const foundRole = await checkUserRoleByEmail(trimmed)
      setRoleInfo(foundRole)
    } catch (e) {
      console.error(e)
    } finally {
      setIsChecking(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    
    if (!value || !value.includes('@')) {
      setRoleInfo(null)
      lastCheckedEmailRef.current = ""
    }
    
    // Check automatically when email has a valid format (to avoid setTimeout)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(value.trim())) {
      checkEmailRole(value)
    }
  }

  const handleEmailBlur = () => {
    checkEmailRole(email)
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
            أدخل بريدك الإلكتروني وكلمة المرور للدخول إلى حسابك
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
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                className="text-right"
                dir="ltr"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
              />
              
              {/* Role Indicator below email input */}
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
