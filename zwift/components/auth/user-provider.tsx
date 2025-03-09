"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useMemo } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import type { Database } from "@/types/supabase"

// Define the profile type to match what's actually returned from the database
type UserProfile = {
  id: string
  updated_at?: string | null
  username?: string | null
  full_name?: string | null
  avatar_url?: string | null
  website?: string | null
  role?: string | null // Make role optional since it might not be in the returned data
}

// Define the type for the raw profile data from the database
type DatabaseProfile = {
  id: string
  updated_at: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  website: string | null
  // Note: role is not included here as it doesn't exist in the database
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
  const supabase = createClientComponentClient<Database>()

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
        // First check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            // Profile doesn't exist, create it with only the fields that exist in the table
            const { data: newProfile, error: insertError } = await supabase
              .from("profiles")
              .insert([
                {
                  id: user.id,
                  full_name: user.user_metadata?.full_name || null,
                  // Only include fields that exist in the profiles table
                },
              ])
              .select()
              .single()

            if (insertError) {
              console.error("Error creating user profile:", insertError)
              setProfile(null)
            } else {
              // Add a default role property
              const profileWithRole: UserProfile = {
                ...(newProfile as DatabaseProfile),
                role: "cashier", // Add default role
              }
              setProfile(profileWithRole)
            }
          } else {
            console.error("Error fetching user profile:", fetchError)
            setProfile(null)
          }
        } else {
          // Add a default role property
          const profileWithRole: UserProfile = {
            ...(existingProfile as DatabaseProfile),
            role: "cashier", // Add default role
          }
          setProfile(profileWithRole)
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
        router.push("/auth/login")
        return
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.user) {
          console.log("User signed in, getting user data")
          setUser(session.user)

          // Only redirect if we're on the login page
          if (window.location.pathname === "/auth/login") {
            router.push("/dashboard")
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

