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
  const PAGE_SIZE = 1000 // Supabase's maximum limit
  let allProducts: any[] = []
  let hasMore = true
  let page = 0

  try {
    console.log("Fetching all products from database...")

    // Keep fetching pages until there are no more results
    while (hasMore) {
      // Build the query for products with pagination
      let query = supabase
        .from("products")
        .select("*")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

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
        console.error(`Error fetching products page ${page}:`, error)
        throw error
      }

      if (data && data.length > 0) {
        console.log(`Fetched ${data.length} products on page ${page}`)
        allProducts = [...allProducts, ...data]

        // If we got fewer results than the page size, we've reached the end
        if (data.length < PAGE_SIZE) {
          hasMore = false
        }
      } else {
        // No more data
        hasMore = false
      }

      page++
    }

    console.log(`Successfully fetched ${allProducts.length} products in total`)
    return allProducts
  } catch (error) {
    console.error("Error in getAllProducts:", error)
    return []
  }
}

// Function to refresh products (for the refresh button)
export async function refreshProducts(searchQuery = "") {
  return getAllProducts(searchQuery)
}
