import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, ShieldCheck, MessageCircle, ArrowRight, UserCheck } from "lucide-react"
import { getAppSettings } from "@/lib/app-context"

export default async function AwaitingApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; phone?: string; role?: string }>
}) {
  const params = await searchParams
  const name = params.name || "مستخدمنا العزيز"
  const phone = params.phone || ""
  const role = params.role || "guest"

  const ROLE_NAMES: Record<string, string> = {
    guest: "مشتري / صاحب ماركت",
    merchant: "تاجر جملة",
    delivery: "مندوب توصيل",
    materials: "إدارة المواد",
    support: "موظف دعم",
    call_center: "Call Center",
  }
  const roleName = ROLE_NAMES[role] || role

  const settings = await getAppSettings()
  const supportPhone = settings?.support_phone || "07800000000"
  const whatsappNumber = settings?.whatsapp_number || supportPhone

  const whatsappMessage = encodeURIComponent(
    `السلام عليكم، قمت بإنشاء حساب جديد في تطبيق جملتي:\nالاسم: ${name}\nرقم الهاتف: ${phone}\nالصفة: ${roleName}\nأرجو التكرم بمراجعة وتفعيل الحساب.`
  )
  const cleanWhatsappNumber = whatsappNumber.replace(/\D/g, "").replace(/^0/, "964")
  const whatsappUrl = `https://wa.me/${cleanWhatsappNumber}?text=${whatsappMessage}`

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl border-border/40 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-brand-orange to-brand-blue" />
        
        <CardHeader className="text-center pb-2 pt-6">
          <div className="mx-auto w-16 h-16 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
            <Clock className="w-9 h-9 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-black text-foreground">
            تم استلام طلبك بنجاح! ⏳
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
            حسابك قيد المراجعة والتفعيل من قبل إدارة جملتي
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {/* بطاقة تفاصيل الحساب */}
          <div className="bg-muted/40 p-4 rounded-xl border border-border/50 space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">الاسم الكامل:</span>
              <span className="font-bold text-foreground">{name}</span>
            </div>
            {phone && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">رقم الهاتف:</span>
                <span className="font-mono font-bold text-foreground" dir="ltr">{phone}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">نوع الحساب:</span>
              <span className="font-bold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-md">
                {roleName}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/40">
              <span className="text-muted-foreground">حالة الحساب:</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                بانتظار موافقة الإدارة
              </span>
            </div>
          </div>

          {/* رسالة الطمأنة */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              نحرص في تطبيق <strong>جملتي</strong> على التحقق من صحة الحسابات لضمان بيئة تجارية آمنة وموثوقة بين التجار وأصحاب الماركت. ستتم مراجعة وتفعيل حسابك في أقرب وقت.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2.5 pb-6">
          <a 
            href={whatsappUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button className="w-full font-bold text-xs sm:text-sm h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 shadow-md shadow-emerald-600/20">
              <MessageCircle className="w-4 h-4" />
              تواصل مع الإدارة عبر واتساب للتعجيل
            </Button>
          </a>

          <form action={async () => {
            "use server"
            const { createClient } = await import("@/utils/supabase/server")
            const supabase = await createClient()
            await supabase.auth.signOut()
            const { redirect } = await import("next/navigation")
            redirect("/login")
          }} className="w-full">
            <Button type="submit" variant="outline" className="w-full font-bold text-xs sm:text-sm h-10 rounded-xl gap-1.5 border-border/60 cursor-pointer hover:bg-muted">
              <ArrowRight className="w-4 h-4" />
              تسجيل الخروج والعودة لشاشة الدخول
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
