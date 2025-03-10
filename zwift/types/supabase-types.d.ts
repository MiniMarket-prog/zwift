// This file provides type declarations to fix the Supabase auth helpers error
import type { User as SupabaseUser } from "@supabase/supabase-js"

// Re-export the User type
export type User = SupabaseUser

