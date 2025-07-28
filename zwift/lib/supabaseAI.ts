import { createClient as supabaseCreateClient } from "@supabase/supabase-js"

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
  )
}

export function createClient() {
  return supabaseCreateClient(supabaseUrl!, supabaseKey!, {
    auth: {
      persistSession: false, // Disable session persistence for server-side usage
    },
  })
}
