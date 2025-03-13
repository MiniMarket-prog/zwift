"use client"

import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

export function useHandleSupabaseError() {
  const { toast } = useToast()
  const router = useRouter()

  return (error: any, customMessage?: string) => {
    console.error("Supabase error:", error)

    // Check if the error is related to authentication
    const isAuthError =
      error?.message?.includes("JWT") ||
      error?.message?.includes("token") ||
      error?.message?.includes("session") ||
      error?.message?.includes("auth") ||
      error?.status === 401 ||
      error?.code === "PGRST301"

    if (isAuthError) {
      toast({
        title: "Authentication Error",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      })

      // Redirect to login
      router.push("/auth/login")
      return
    }

    // Handle other errors
    toast({
      title: "Error",
      description: customMessage || "An error occurred. Please try again.",
      variant: "destructive",
    })
  }
}

