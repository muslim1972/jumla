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

  // 1. توجيه غير المسجلين عند محاولة دخول المسارات المحمية
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // 2. فحص الحسابات المسجلة: قفل أي حساب معلق أو مرفوض تماماً عن كامل التطبيق
  if (user) {
    const isExcludedFromApprovalCheck = 
      pathname.startsWith("/awaiting-approval") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.includes(".")

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approval_status')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    const approvalStatus = profile?.approval_status

    // حظر الحسابات غير المفعلة (pending / rejected) من تصفح التطبيق بما فيه الرئيسية والسلة والمتاجر
    if (role !== 'admin' && (approvalStatus === 'pending' || approvalStatus === 'rejected')) {
      if (!isExcludedFromApprovalCheck) {
        const url = request.nextUrl.clone()
        url.pathname = "/awaiting-approval"
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // التحقق من صلاحيات الأدوار للمسارات المحمية
    if (isProtectedPath) {
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
  }

  return supabaseResponse
}
