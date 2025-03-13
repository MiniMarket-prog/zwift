import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(req: NextRequest) {
  // Create a response object
  const res = NextResponse.next()

  // Create the Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          req.cookies.set(name, value)
          res.cookies.set(name, value, options)
        },
        remove(name, options) {
          req.cookies.set(name, "")
          res.cookies.set(name, "", { ...options, maxAge: 0 })
        },
      },
    },
  )

  // Get the session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Define protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/inventory", "/pos", "/sales", "/settings", "/reports"]

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => req.nextUrl.pathname.startsWith(route) || req.nextUrl.pathname === "/",
  )

  // Check if we're already on the login page
  const isLoginPage = req.nextUrl.pathname.startsWith("/auth/login")

  // If accessing a protected route without a session, redirect to login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/auth/login", req.url)
    // Add the original URL as a query parameter to redirect back after login
    redirectUrl.searchParams.set("redirect", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is visiting the login page but is already authenticated, redirect to dashboard
  if ((isLoginPage || req.nextUrl.pathname === "/") && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Refresh session if expired, but only if not on login page
  // This helps maintain the session across page loads
  if (!isLoginPage && session) {
    await supabase.auth.getSession()
  }

  return res
}

export const config = {
  matcher: [
    // Exclude files with extensions, api routes, and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

