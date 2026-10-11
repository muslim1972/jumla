export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // تخطيط عرض فقط — لا استعلامات قاعدة بيانات هنا (كانت النتائج تُهمَل)
  return (
    <div className="flex flex-col flex-1 w-full min-h-[calc(100vh-140px)] items-center justify-center p-4">
      <main className="w-full max-w-md flex flex-col items-center justify-center">
        {children}
      </main>
    </div>
  )
}
