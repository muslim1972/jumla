"use client"

import { createContext, useContext, useMemo, useState } from "react"

const FloatingMenuContext = createContext<{
  openMenu: string | null;
  setOpenMenu: (menu: string | null) => void;
}>({ openMenu: null, setOpenMenu: () => {} })

export function FloatingMenuProvider({ children }: { children: React.ReactNode }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  // تثبيت مرجع قيمة السياق بين الرندرات لتقليل إعادة الرندر للمستهلكين
  const value = useMemo(() => ({ openMenu, setOpenMenu }), [openMenu])
  return (
    <FloatingMenuContext.Provider value={value}>
      {children}
    </FloatingMenuContext.Provider>
  )
}

export function useFloatingMenu() {
  return useContext(FloatingMenuContext)
}
