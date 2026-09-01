"use client"

import { useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ArrowRight } from "lucide-react"
import { ProfileInfoForm } from "./profile/profile-info-form"
import { PasswordManager } from "./profile/password-manager"
import { RewardsSummary } from "./profile/rewards-summary"
import { AccountDeletion } from "./profile/account-deletion"

interface UserProfileModalProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  userRole?: string | null
  fullName?: string | null
}

export function UserProfileModal({ isOpen, setIsOpen, userRole, fullName }: UserProfileModalProps) {
  // مستمع الإغلاق عند تسجيل الخروج
  useEffect(() => {
    const handleLogout = () => setIsOpen(false)
    window.addEventListener('user-logout', handleLogout)
    return () => window.removeEventListener('user-logout', handleLogout)
  }, [setIsOpen])

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
          <div className="flex-1">
            <DialogTitle className="text-xl font-black text-brand-blue m-0">
              الصفحة الشخصية
            </DialogTitle>
            <DialogDescription className="sr-only">
              إدارة إعدادات حسابك الشخصي
            </DialogDescription>
          </div>
          <RewardsSummary isOpen={isOpen} />
        </div>

        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
          <ProfileInfoForm isOpen={isOpen} fullName={fullName} />

          <div className="h-px bg-border w-full" />

          <PasswordManager isOpen={isOpen} />

          <div className="h-px bg-border w-full" />

          <AccountDeletion />
        </div>
      </DialogContent>
    </Dialog>
  )
}
