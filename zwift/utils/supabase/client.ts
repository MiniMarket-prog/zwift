import { createBrowserClient } from "@supabase/ssr"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

// Create a single instance of the Supabase client for browser usage
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // Enable auto refresh of tokens
          autoRefreshToken: true,
          // Persist the session in local storage for longer sessions
          persistSession: true,
          // Detect session changes across tabs/windows
          detectSessionInUrl: true,
        },
      },
    )

    // Set up auth state change listener
    supabaseClient.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_OUT" || !session) {
        // If we're in the browser, redirect to login
        // But only if we're not already on the login page
        if (typeof window !== "undefined" && !window.location.pathname.includes("/auth/login")) {
          window.location.href = "/auth/login"
        }
      }
    })
  }

  return supabaseClient
}

