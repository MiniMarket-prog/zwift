import { createClient } from "@supabase/supabase-js"

// Create a Supabase client
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

export interface Category {
  id: string
  name: string
  description?: string
  product_count?: number
}

export async function addCategory(category: { name: string; description?: string }) {
  const supabase = createSupabaseClient()

  try {
    console.log("Adding category:", category)

    // Remove description if it exists to avoid the schema error
    const { description, ...categoryData } = category

    const { data, error } = await supabase.from("categories").insert(categoryData).select().single()

    if (error) {
      console.error("Error adding category:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in addCategory:", error)
    throw error
  }
}

export async function updateCategory(id: string, category: { name: string; description?: string }) {
  const supabase = createSupabaseClient()

  try {
    console.log("Updating category with id:", id, "and data:", category)

    // Remove description if it exists to avoid the schema error
    const { description, ...categoryData } = category

    const { data, error } = await supabase.from("categories").update(categoryData).eq("id", id).select().single()

    if (error) {
      console.error("Error updating category:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in updateCategory:", error)
    throw error
  }
}

export async function deleteCategory(id: string) {
  const supabase = createSupabaseClient()

  try {
    console.log("Deleting category with id:", id)
    const { error } = await supabase.from("categories").delete().eq("id", id)

    if (error) {
      console.error("Error deleting category:", error)
      throw error
    }

    return id
  } catch (error) {
    console.error("Error in deleteCategory:", error)
    throw error
  }
}

export async function getCategories() {
  const supabase = createSupabaseClient()

  try {
    console.log("Fetching categories")

    // First, get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true })

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      throw categoriesError
    }

    // For now, we'll use a simpler approach to get product counts
    // This is a fallback that doesn't require complex SQL queries
    // In a production environment, you might want to use a more efficient approach

    // Option 1: Get all products and count them client-side
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("category_id")
      .not("category_id", "is", null)

    if (productsError) {
      console.error("Error fetching products for counting:", productsError)
      // Continue without counts rather than failing completely
    }

    // Count products per category
    const categoryCounts: Record<string, number> = {}
    products?.forEach((product: any) => {
      if (product.category_id) {
        categoryCounts[product.category_id] = (categoryCounts[product.category_id] || 0) + 1
      }
    })

    // Combine the data
    const categoriesWithCounts = categories.map((category: any) => ({
      ...category,
      product_count: categoryCounts[category.id] || 0,
    }))

    return categoriesWithCounts || []
  } catch (error) {
    console.error("Error in getCategories:", error)
    return []
  }
}

