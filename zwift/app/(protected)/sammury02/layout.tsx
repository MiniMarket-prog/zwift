import type React from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const metadata = {
  title: "Inventory Reports",
  description: "Advanced inventory reporting and analytics",
}

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Create the Supabase client
  const supabase = await createServerSupabaseClient()

  // Get the initial session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session is found, redirect to login
  if (!session) {
    redirect("/auth/login")
  }

  return <div className="w-full">{children}</div>
}

