import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Create a Supabase client for authentication
const supabase = createClientComponentClient()

// Function to check if user is authenticated
export async function checkAuth() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error("Auth check error:", error)
      return false
    }

    return !!user
  } catch (error) {
    console.error("Error checking auth:", error)
    return false
  }
}

// Function to sign out
export async function signOut() {
  try {
    await supabase.auth.signOut()
    return true
  } catch (error) {
    console.error("Error signing out:", error)
    return false
  }
}

// Function to get current user
export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error("Get user error:", error)
      return null
    }

    return user
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

