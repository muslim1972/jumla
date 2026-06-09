"use client"

import { useTransition } from "react"
import { LogOut, Loader2 } from "lucide-react"
import { buttonVariants } from "./ui/button"
import { signOut } from "@/app/(auth)/actions"

export function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button 
      onClick={() => startTransition(() => { signOut() })}
      disabled={isPending}
      className={buttonVariants({ variant: "default", size: "sm" }) + " rounded-full shadow-lg shadow-primary/20 disabled:opacity-50"}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 sm:ml-2 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4 sm:ml-2" />
      )}
      <span className="hidden sm:inline-block">
        {isPending ? "جاري الخروج..." : "خروج"}
      </span>
    </button>
  )
}
