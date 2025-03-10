// This file provides empty type declarations for the deprecated package
declare module "@supabase/auth-helpers-nextjs" {
    // Re-export User type from supabase-js
    import type { User as SupabaseUser } from "@supabase/supabase-js"
    export type User = SupabaseUser
  
    // Declare the createClientComponentClient function
    export function createClientComponentClient(): any
  
    // Add other types as needed
  }
  
  