import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Create a Supabase client with the service role key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()
    const { id } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
    }

    // Update the user to confirm their email
    const { error } = await supabase.auth.admin.updateUserById(id, {
      email_confirm: true,
      app_metadata: { email_confirmed: true },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Email confirmed successfully" })
  } catch (error) {
    console.error("Error confirming email:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

