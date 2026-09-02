import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { PackagePlus } from "lucide-react"

export default async function MaterialsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'materials' && profile?.role !== 'admin') {
    redirect("/")
  }

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-16 pb-2 border-b">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/10 rounded-xl">
              <PackagePlus className="w-6 h-6 text-brand-blue" />
            </div>
            <div>
              <h1 className="font-black text-lg">إدارة المواد</h1>
              <p className="text-xs text-muted-foreground">الكتالوج المركزي لمواد تجار جملتي</p>
            </div>
          </div>
        </div>
      </div>
      <main className="flex-1 bg-muted/20 pt-4">
        {children}
      </main>
    </div>
  )
}
