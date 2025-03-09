import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Create a Supabase client with the anon key for regular auth operations
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // Create a Supabase admin client with the service role key
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // First try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // If we get an "Email not confirmed" error, try to confirm it
    if (error && error.message.includes("Email not confirmed")) {
      // Get user by email
      const { data: authData } = await adminSupabase.auth.admin.listUsers()
      const user = authData?.users.find((u: { email?: string }) => u.email === email)

      if (user) {
        // Update the user to confirm their email
        await adminSupabase.auth.admin.updateUserById(user.id, {
          email_confirm: true,
          app_metadata: { email_confirmed: true },
        })

        // Try signing in again
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 400 })
        }

        // Set cookies for the session
        const cookieOptions = {
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 1 week
          sameSite: "lax" as const,
          secure: process.env.NODE_ENV === "production",
        }

        // Set the session cookie in the response
        const response = NextResponse.json({
          user: retryData.user,
          session: retryData.session,
        })

        if (retryData.session) {
          response.cookies.set(
            "supabase-auth-token",
            JSON.stringify([retryData.session.access_token, retryData.session.refresh_token]),
            cookieOptions,
          )
        }

        return response
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Set cookies for the session
    const cookieOptions = {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    }

    // Set the session cookie in the response
    const response = NextResponse.json({
      user: data.user,
      session: data.session,
    })

    if (data.session) {
      response.cookies.set(
        "supabase-auth-token",
        JSON.stringify([data.session.access_token, data.session.refresh_token]),
        cookieOptions,
      )
    }

    return response
  } catch (error) {
    console.error("Error in login API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

