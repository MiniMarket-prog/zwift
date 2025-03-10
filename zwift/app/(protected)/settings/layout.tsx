import type React from "react"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Create the Supabase client
  try {
    const supabase = await createServerSupabaseClient()

    // Get the session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If no session is found, redirect to login
    if (!session) {
      redirect("/auth/login")
    }
  } catch (error) {
    // If there's an error with cookies or session, we'll still render the children
    // The client-side auth check will handle redirection if needed
    console.error("Session check error:", error)
  }

  return <>{children}</>
}

