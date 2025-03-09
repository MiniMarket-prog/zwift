import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Create a Supabase client with the service role key
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Get all users
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    // Track results
    const results = {
      total: userData.users.length,
      confirmed: 0,
      errors: 0,
      details: [] as string[],
    }

    // Confirm email for each user that needs it
    for (const user of userData.users) {
      if (!user.email_confirmed_at) {
        try {
          const { error } = await supabase.auth.admin.updateUserById(user.id, {
            email_confirm: true,
            app_metadata: { email_confirmed: true },
          })

          if (error) {
            results.errors++
            results.details.push(`Failed to confirm email for ${user.email}: ${error.message}`)
          } else {
            results.confirmed++
            results.details.push(`Confirmed email for ${user.email}`)
          }
        } catch (err) {
          results.errors++
          results.details.push(`Exception confirming email for ${user.email}: ${String(err)}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Confirmed ${results.confirmed} emails with ${results.errors} errors`,
      results,
    })
  } catch (error) {
    console.error("Error confirming all emails:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

