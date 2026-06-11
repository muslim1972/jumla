"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, KeyRound, Trash2, ArrowRight, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

interface UserProfileModalProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  userRole?: string | null
  fullName?: string | null
}

export function UserProfileModal({ isOpen, setIsOpen, userRole, fullName }: UserProfileModalProps) {
  const [newFullName, setNewFullName] = useState(fullName || "")
  const [newPassword, setNewPassword] = useState("")
  
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const supabase = createClient()

  const handleUpdateName = async () => {
    if (!newFullName.trim() || newFullName.trim() === fullName) return
    setIsUpdatingName(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: newFullName.trim() })
        .eq('id', user.id)

      if (!profileError) {
        await supabase.auth.updateUser({
          data: { full_name: newFullName.trim() }
        })
        window.location.reload()
      } else {
        alert("حدث خطأ أثناء التحديث")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsUpdatingName(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md w-[92%] sm:w-full rounded-2xl p-0 overflow-hidden border border-border shadow-premium" dir="rtl">
        {/* الهيدر مع زر الرجوع */}
        <div className="bg-muted/50 p-4 border-b flex items-center gap-3">
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-background rounded-full transition-colors active:scale-95"
          >
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <DialogTitle className="text-xl font-black text-brand-blue m-0">
            الصفحة الشخصية
          </DialogTitle>
          <DialogDescription className="sr-only">
            إدارة إعدادات حسابك الشخصي
          </DialogDescription>
        </div>

        <div className="p-6 space-y-8">
          
          {/* قسم تعديل الاسم */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-brand-orange font-bold">
              <User className="w-5 h-5" />
              <h3>تعديل اسم المستخدم</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="fullName" className="text-xs text-muted-foreground">الاسم الكامل</Label>
                <Input 
                  id="fullName" 
                  value={newFullName} 
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="bg-background"
                  placeholder="ادخل اسمك الجديد..."
                />
              </div>
              <Button 
                onClick={handleUpdateName}
                disabled={isUpdatingName || !newFullName.trim() || newFullName.trim() === fullName}
                className="sm:mt-5 bg-brand-blue hover:bg-brand-blue/90 text-white min-w-[100px]"
              >
                {isUpdatingName ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الاسم"}
              </Button>
            </div>
          </div>

          <div className="h-px bg-border w-full" />

          {/* قسم تغيير كلمة المرور */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-brand-orange font-bold">
              <KeyRound className="w-5 h-5" />
              <h3>تغيير كلمة المرور</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="password" className="text-xs text-muted-foreground">كلمة المرور الجديدة</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background"
                  placeholder="********"
                />
              </div>
              <Button className="sm:mt-5 bg-brand-blue hover:bg-brand-blue/90 text-white">
                تحديث السر
              </Button>
            </div>
          </div>

          <div className="h-px bg-border w-full" />

          {/* قسم حذف الحساب */}
          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-right w-full">
                <h3 className="font-bold text-destructive flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  منطقة الخطر
                </h3>
                <p className="text-xs text-muted-foreground">
                  حذف حسابك سيؤدي إلى مسح جميع بياناتك بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>
              <Button variant="destructive" className="w-full sm:w-auto shrink-0 whitespace-nowrap">
                حذف الحساب
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
