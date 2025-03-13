"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

export function useAuthRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Don't redirect if already on the login page
  const isLoginPage = pathname.includes("/auth/login")

  useEffect(() => {
    // Skip auth check if already on login page
    if (isLoginPage) return

    // Function to check auth status
    const checkAuth = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        // Redirect to login if there's an error or no session
        router.push("/auth/login")
      }
    }

    // Check auth immediately
    checkAuth()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      // Only redirect if not already on login page
      if ((event === "SIGNED_OUT" || !session) && !isLoginPage) {
        // Redirect to login page when user signs out or session expires
        router.push("/auth/login")
      }
    })

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase, isLoginPage])
}

