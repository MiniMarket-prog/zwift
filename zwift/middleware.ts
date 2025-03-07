import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if the user is authenticated
  const isAuthenticated = !!session
  const isAuthRoute = req.nextUrl.pathname.startsWith("/auth")
  const isApiRoute = req.nextUrl.pathname.startsWith("/api")
  const isRootRoute = req.nextUrl.pathname === "/"

  // If user is at the root route, redirect to dashboard if authenticated, otherwise to login
  if (isRootRoute) {
    return isAuthenticated
      ? NextResponse.redirect(new URL("/dashboard", req.url))
      : NextResponse.redirect(new URL("/auth/login", req.url))
  }

  // If the user is on an auth route but is already authenticated, redirect to dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // If the user is not authenticated and not on an auth route or API route, redirect to login
  if (!isAuthenticated && !isAuthRoute && !isApiRoute) {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  return res
}

// Specify which routes this middleware should run on
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

