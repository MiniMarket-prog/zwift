"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

interface AuthCheckProps {
  children: React.ReactNode
}

export function AuthCheck({ children }: AuthCheckProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Check if we're on the login page
  const isLoginPage = pathname.includes("/auth/login")

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error || !session) {
          if (!isLoginPage) {
            router.push("/auth/login")
          }
          return
        }

        setIsAuthenticated(true)
      } catch (error) {
        console.error("Error checking auth status:", error)
        if (!isLoginPage) {
          router.push("/auth/login")
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_OUT" || !session) {
        setIsAuthenticated(false)
        // Only redirect if not already on login page
        if (!isLoginPage) {
          router.push("/auth/login")
        }
      } else if (session) {
        setIsAuthenticated(true)
      }
    })

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase, isLoginPage])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Don't render children if not authenticated
  }

  return <>{children}</>
}

