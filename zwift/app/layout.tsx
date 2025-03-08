import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { UserProvider } from "@/components/auth/user-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "POS System",
  description: "A modern point of sale system",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Initialize user as null
  let user = null

  try {
    // Get the cookie store
    const cookieStore = cookies()

    // Create the Supabase client
    const supabase = createServerComponentClient({
      cookies: () => cookieStore,
    })

    // Use getUser instead of getSession for better security
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Error in root layout:", error)
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <UserProvider initialUser={user}>{children}</UserProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

