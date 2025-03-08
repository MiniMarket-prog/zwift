import type React from "react"
import Sidebar from "@/components/sidebar"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"

export const metadata = {
  title: "Inventory Management System",
  description: "A simple inventory management system",
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Create the Supabase client once
  const cookieStore = cookies()
  const supabase = createServerComponentClient({
    cookies: () => cookieStore,
  })

  // Get the initial session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session is found, redirect to login
  if (!session) {
    redirect("/auth/login")
  }

  return (
    <div className="relative flex h-full min-h-screen">
      <Sidebar />
      <div className="flex-1 md:ml-[var(--sidebar-width,256px)] transition-all duration-300">
        <main className="p-4">{children}</main>
      </div>
    </div>
  )
}

