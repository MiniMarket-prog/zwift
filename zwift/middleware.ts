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

  // Refresh session if expired
  await supabase.auth.getSession()

  return res
}

export const config = {
  matcher: [
    // Exclude files with extensions, api routes, and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

