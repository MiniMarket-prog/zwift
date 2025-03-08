"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

// Define the profile type
type UserProfile = {
  id: string
  username?: string | null
  full_name?: string | null
  avatar_url?: string | null
  role?: string | null
  // Add other profile fields as needed
}

type UserContextType = {
  user: User | null
  profile: UserProfile | null
  isAdmin: boolean
  isLoading: boolean
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  isAdmin: false,
  isLoading: false,
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
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(!!initialUser) // Loading if we have an initial user but no profile yet
  const router = useRouter()
  const supabase = useMemo(() => createClientComponentClient(), [])

  // Fetch user profile when user changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setProfile(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      console.log("Fetching profile for user:", user.id)

      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (error) {
          console.error("Error fetching user profile:", error)
          setProfile(null)
        } else {
          setProfile(data as UserProfile)
        }
      } catch (error) {
        console.error("Error in profile fetch:", error)
        setProfile(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [user, supabase])

  useEffect(() => {
    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event)

      if (event === "SIGNED_OUT") {
        setUser(null)
        setProfile(null)
        window.location.href = "/auth/login"
        return
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.user) {
          console.log("User signed in, getting user data")
          setUser(session.user)

          // Only redirect if we're on the login page
          if (window.location.pathname === "/auth/login") {
            window.location.href = "/dashboard"
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, router])

  // Calculate isAdmin based on profile role
  const isAdmin = useMemo(() => {
    return profile?.role === "admin"
  }, [profile])

  // Provide the context value
  const value = {
    user,
    profile,
    isAdmin,
    isLoading,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

