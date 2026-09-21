import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAdminPath = pathname.startsWith("/admin")
  const isSupportPath = pathname.startsWith("/support")
  const isMerchantPath = pathname.startsWith("/dashboard")
  const isMaterialsPath = pathname.startsWith("/materials")
  const isProtectedPath = isAdminPath || isSupportPath || isMerchantPath || isMaterialsPath

  // Protected routes logic: redirect to login when unauthenticated
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Role-based and approval protection: read from profiles (the trusted source)
  if (user && isProtectedPath) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approval_status')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    const approvalStatus = profile?.approval_status

    // منع الحسابات غير المفعلة من دخول لوحات التحكم أو المسارات المحمية
    if (role !== 'admin' && (approvalStatus === 'pending' || approvalStatus === 'rejected')) {
      const url = request.nextUrl.clone()
      url.pathname = "/awaiting-approval"
      return NextResponse.redirect(url)
    }

    const unauthorized =
      (isMerchantPath && role !== 'merchant') ||
      (isAdminPath && role !== 'admin') ||
      (isSupportPath && role !== 'support' && role !== 'call_center' && role !== 'admin') ||
      (isMaterialsPath && role !== 'materials' && role !== 'admin')

    if (unauthorized) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
