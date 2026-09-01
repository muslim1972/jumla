import OneSignalProvider from "@/components/global/onesignal-provider"
import { getCurrentUser } from "@/lib/app-context"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // استعلامات هذا التخطيط مغلّفة بـ React.cache في app-context
  // وتُستعاد من ذاكرة التخطيط الجذري بدلاً من تكرارها لكل طلب
  const user = await getCurrentUser()

  return (
    <div className="flex flex-col flex-1 w-full">
      <OneSignalProvider userId={user?.id} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
