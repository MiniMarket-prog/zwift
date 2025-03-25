import { createClient } from "@supabase/supabase-js"

// Create a Supabase client
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

// Function to get all products without any limitations
export async function getAllProducts(searchQuery = "") {
  const supabase = createSupabaseClient()

  try {
    console.log("Fetching all products from database...")

    // Build the query for products
    let query = supabase.from("products").select("*")

    // If there's a search query, filter on the server side
    if (searchQuery.trim() !== "") {
      // Use ilike for case-insensitive search on both name and barcode
      query = query.or(`name.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`)
    }

    // Always order by name
    query = query.order("name", { ascending: true })

    // Execute the query
    const { data, error } = await query

    if (error) {
      console.error("Error fetching products:", error)
      throw error
    }

    console.log(`Successfully fetched ${data?.length || 0} products from database`)
    return data || []
  } catch (error) {
    console.error("Error in getAllProducts:", error)
    return []
  }
}

// Function to refresh products (for the refresh button)
export async function refreshProducts(searchQuery = "") {
  return getAllProducts(searchQuery)
}

