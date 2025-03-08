import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  try {
    // Create the Supabase client
    const supabase = createMiddlewareClient({ req, res })

    // Use getUser instead of getSession for better security
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // If user exists, refresh the session
    if (user) {
      await supabase.auth.refreshSession()
    }
  } catch (error) {
    console.error("Auth error in middleware:", error)
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|auth/login).*)"],
}

