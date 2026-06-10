"use client"

import { createContext, useContext, useState } from "react"

const FloatingMenuContext = createContext<{
  openMenu: string | null;
  setOpenMenu: (menu: string | null) => void;
}>({ openMenu: null, setOpenMenu: () => {} })

export function FloatingMenuProvider({ children }: { children: React.ReactNode }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  return (
    <FloatingMenuContext.Provider value={{ openMenu, setOpenMenu }}>
      <div className="fixed bottom-4 sm:bottom-6 left-4 sm:left-6 z-[100] flex flex-col-reverse gap-2 pointer-events-none">
        {children}
      </div>
    </FloatingMenuContext.Provider>
  )
}

export function useFloatingMenu() {
  return useContext(FloatingMenuContext)
}
