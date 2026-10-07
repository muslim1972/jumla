import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, LogOut } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

async function signOutAndExit() {
  "use server"
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export default function NoPermissionPage() {
  return (
    <div className="flex-1 w-full flex items-center justify-center py-20 mesh-gradient">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-black">لا توجد صلاحيات مفعّلة</h1>
          <p className="text-sm text-muted-foreground leading-7">
            حسابك موظف داخلي ولا تملك أي صلاحية مفعّلة حالياً.
            راجع صاحب المتجر لمنحك صلاحية (المبيعات، أو العمل على المخازن، أو التجهيز).
          </p>
          <form action={signOutAndExit}>
            <Button variant="outline" className="font-bold" type="submit">
              <LogOut className="w-4 h-4 ml-1" />
              تسجيل خروج وتبديل الحساب
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
