"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    // إعادة التمرير للأعلى عند تغيير المسار (الواجهة)
    // نستخدم setTimeout لضمان اكتمال تحميل عناصر الواجهة الجديدة قبل التمرير
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }, 10)
    
    return () => clearTimeout(timeoutId)
  }, [pathname])

  return null
}
