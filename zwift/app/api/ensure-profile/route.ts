import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Get the cookie store
    const cookieStore = cookies()

    // Create the Supabase client
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    })

    // Get the current user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        {
          error: error?.message || "User not authenticated",
        },
        { status: 401 },
      )
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    // If profile exists, return it
    if (existingProfile) {
      return NextResponse.json({
        success: true,
        profile: existingProfile,
        message: "Profile already exists",
      })
    }

    // Create profile if it doesn't exist
    const { data: newProfile, error: createError } = await supabase
      .from("profiles")
      .insert([
        {
          id: user.id,
          role: "admin", // Default role
          full_name: user.email?.split("@")[0] || "User",
        },
      ])
      .select()
      .single()

    if (createError) {
      return NextResponse.json(
        {
          error: createError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      profile: newProfile,
      message: "Profile created successfully",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

