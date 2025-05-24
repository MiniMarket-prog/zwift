import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export default async function HomePage() {
  const supabase = createClient()

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If not authenticated, redirect to login
  if (!session) {
    redirect("auth/login")
  }

  // If authenticated, redirect to dashboard
  redirect("/postofsale04")
}

