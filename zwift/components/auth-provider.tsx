"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

type UserContextType = {
  user: User | null
  isLoading: boolean
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
})

export const useUser = () => useContext(UserContext)

export function UserProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: User | null
}) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [isLoading, setIsLoading] = useState(!initialUser)
  const router = useRouter()

  // Create a memoized Supabase client
  const supabase = useMemo(() => createClientComponentClient(), [])

  useEffect(() => {
    // Only fetch user if we don't have an initial user
    if (!initialUser) {
      const getUser = async () => {
        try {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser()
          setUser(authUser)
        } catch (error) {
          console.error("Error getting user:", error)
          setUser(null)
        } finally {
          setIsLoading(false)
        }
      }

      getUser()
    }

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null)
        router.push("/auth/login")
      } else if (session?.user) {
        setUser(session.user)
        // Refresh the page data when auth state changes
        router.refresh()
      }
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, initialUser])

  return <UserContext.Provider value={{ user, isLoading }}>{children}</UserContext.Provider>
}

