export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // تخطيط عرض فقط — لا استعلامات قاعدة بيانات هنا (كانت النتائج تُهمَل)
  return (
    <div className="flex flex-col flex-1 w-full">
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
