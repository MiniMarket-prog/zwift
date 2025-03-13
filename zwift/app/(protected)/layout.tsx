import type React from "react"
import Sidebar from "@/components/sidebar"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { BarcodeDetectorProvider } from "@/components/barcode-detector-provider"

export const metadata = {
  title: "Inventory Management System",
  description: "A simple inventory management system",
}

export default async function ProtectedLayout({
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

  // Verify the user's authentication with the server
  const { data: { user }, error } = await supabase.auth.getUser()

  // If there's an error or no authenticated user, redirect to login
  if (error || !user) {
    console.error("Authentication error:", error)
    redirect("/auth/login")
  }

  return (
    <div className="relative flex h-full min-h-screen">
      <Sidebar />
      <div className="flex-1 md:ml-[72px] transition-all duration-300">
        <BarcodeDetectorProvider>
          <main className="p-4">{children}</main>
        </BarcodeDetectorProvider>
      </div>
    </div>
  )
}