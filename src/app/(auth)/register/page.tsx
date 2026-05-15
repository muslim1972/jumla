import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function RegisterPage(props: { searchParams: Promise<{ message: string }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return redirect("/")
  }

  const signUp = async (formData: FormData) => {
    "use server"
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const full_name = formData.get("full_name") as string
    const role = formData.get("role") as string
    const supabase = await createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role,
        },
      },
    })

    if (error) {
      return redirect("/register?message=" + encodeURIComponent("حدث خطأ أثناء إنشاء الحساب: " + error.message))
    }

    // Since it's a demo or simple app, maybe auto login works or redirect to login
    return redirect("/login?message=" + encodeURIComponent("تم إنشاء الحساب بنجاح. يرجى تسجيل الدخول."))
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
        <form action={signUp}>
          <CardContent className="space-y-4">
            {searchParams?.message && (
              <div className="p-3 bg-secondary text-secondary-foreground text-sm rounded-md text-center">
                {searchParams.message}
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
              <Select name="role" defaultValue="guest" required>
                <SelectTrigger id="role" dir="rtl">
                  <SelectValue placeholder="اختر نوع الحساب" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="guest">مشتري (مفرد)</SelectItem>
                  <SelectItem value="merchant">تاجر (جملة)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full" type="submit">إنشاء الحساب</Button>
            <div className="text-center space-y-4 w-full">
              <p className="text-sm text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
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
                className={buttonVariants({ variant: "outline", className: "w-full" })}
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
