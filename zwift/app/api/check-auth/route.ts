import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get the cookie store and await it
    const cookieStore = cookies()

    // Create the Supabase client with proper cookie handling
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    })

    // Get the user and await it
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If we have a user, get their profile
    let profile = null
    if (user) {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      profile = data
    }

    return NextResponse.json({
      authenticated: !!user,
      user,
      profile,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

