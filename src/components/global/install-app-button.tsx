"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/**
 * زر «تثبيت التطبيق» — يجعل تثبيت جملتي كتطبيق سطح مكتب/جوال أمراً بنقرة
 * (قبل هذا الزر كان التثبيت متاحاً فقط من قائمة المتصفح).
 */
export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)

    // مثبت مسبقاً؟ (وضع standalone) — بمهمة مؤجلة كي لا نستدعي setState تزامنياً داخل الأثر
    if (window.matchMedia("(display-mode: standalone)").matches) {
      queueMicrotask(() => setInstalled(true))
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (installed || !deferredPrompt) return null

  return (
    <Button
      variant="outline"
      size="sm"
      className="font-bold text-xs h-8"
      onClick={async () => {
        deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === "accepted") setInstalled(true)
        setDeferredPrompt(null)
      }}
      title="ثبّت جملتي كتطبيق على جهازك للوصول السريع"
    >
      <Download className="w-3.5 h-3.5 ml-1" />
      تثبيت التطبيق
    </Button>
  )
}
