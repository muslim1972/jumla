export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col flex-1 w-full items-center justify-start px-3 py-1 sm:px-4 sm:py-2 -mb-28 sm:-mb-36 pb-6">
      <div className="w-full max-w-md flex flex-col items-center">
        {children}
      </div>
    </div>
  )
}
