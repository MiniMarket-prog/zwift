// Import the client creation function from your original file
import { createClient } from "./supabase-client"
export { createClient }

// Types
export interface Product {
  id: string
  name: string
  price: number
  barcode?: string
  stock: number
  min_stock?: number
  image?: string | null
  category_id?: string | null
  purchase_price?: number | null
  expiry_date?: string | null
  expiry_notification_days?: number | null
  is_pack?: boolean
  parent_product_id?: string | null
  pack_quantity?: number | null
  pack_discount_percentage?: number | null
}

export interface CartItem {
  id: string
  product_id: string
  name: string
  price: number
  quantity: number
  discount: number // Added discount field
  subtotal: number
  product: {
    id: string
    name: string
    price: number
    image?: string | null
    purchase_price?: number | null
  }
}

export interface Sale {
  id?: string
  total: number
  tax: number
  payment_method: string
  user_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface SaleItem {
  id?: string
  sale_id?: string
  product_id: string
  quantity: number
  price: number
  discount?: number // Add discount field but make it optional for backward compatibility
}

// Function to get all products
export async function getProducts(): Promise<Product[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("products").select("*").order("name")

    if (error) {
      console.error("Error fetching products:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error in getProducts:", error)
    return []
  }
}

// Function to get a single product by ID
export async function getProductById(id: string): Promise<Product | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("products").select("*").eq("id", id).single()

    if (error) {
      console.error(`Error fetching product ${id}:`, error)
      throw error
    }

    return data
  } catch (error) {
    console.error(`Error in getProductById for ${id}:`, error)
    return null
  }
}

// Function to create a sale with discount support
export async function createSale(saleData: Sale, saleItems: SaleItem[]) {
  const supabase = createClient()

  try {
    // Insert the sale - only include fields that exist in the table
    const { data: saleResult, error: saleError } = await supabase
      .from("sales")
      .insert({
        total: saleData.total,
        tax: saleData.tax,
        payment_method: saleData.payment_method,
        user_id: saleData.user_id,
      })
      .select()
      .single()

    if (saleError) {
      console.error("Error creating sale:", saleError)
      throw saleError
    }

    // Add the sale_id to each sale item
    const itemsWithSaleId = saleItems.map((item) => ({
      ...item,
      sale_id: saleResult.id,
      // Make sure discount is included for each item
      discount: item.discount || 0, // Default to 0 if not provided
    }))

    // Insert the sale items
    const { error: itemsError } = await supabase.from("sale_items").insert(itemsWithSaleId)

    if (itemsError) {
      console.error("Error creating sale items:", itemsError)
      throw itemsError
    }

    // Update product stock levels
    for (const item of saleItems) {
      // First get the current product to get its stock and check if it's a pack
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock, is_pack, parent_product_id, pack_quantity")
        .eq("id", item.product_id)
        .single()

      if (productError) {
        console.error(`Error fetching product ${item.product_id}:`, productError)
        continue
      }

      // Calculate new stock level for this product
      const previousStock = product?.stock || 0
      const newStock = Math.max(0, previousStock - item.quantity)

      // Update the product with the new stock level
      const { error: stockError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.product_id)

      if (stockError) {
        console.error(`Error updating stock for product ${item.product_id}:`, stockError)
        continue
      }

      console.log(`Updated product ${item.product_id} stock: ${previousStock} → ${newStock}`)

      // If this is a pack product, also update the unit product's stock
      if (product?.is_pack && product?.parent_product_id && product?.pack_quantity) {
        // Get the unit product
        const { data: unitProduct, error: unitError } = await supabase
          .from("products")
          .select("stock")
          .eq("id", product.parent_product_id)
          .single()

        if (!unitError && unitProduct) {
          // Calculate units to remove (pack quantity × number of packs sold)
          const unitsToRemove = product.pack_quantity * item.quantity
          const newUnitStock = Math.max(0, unitProduct.stock - unitsToRemove)

          // Update the unit product stock
          await supabase.from("products").update({ stock: newUnitStock }).eq("id", product.parent_product_id)

          console.log(
            `Updated unit product ${product.parent_product_id} stock: ${unitProduct.stock} → ${newUnitStock} (pack sale)`,
          )
        }
      }
    }

    return { data: saleResult, error: null }
  } catch (error) {
    console.error("Error creating sale:", error)
    return { data: null, error }
  }
}

// Function to get the last 10 products sold
export async function getRecentSales(limit = 10) {
  const supabase = createClient()

  try {
    // Get the most recent sales
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("id, created_at, total, payment_method")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (salesError) {
      console.error("Error fetching recent sales:", salesError)
      throw salesError
    }

    // For each sale, get the items
    const salesWithItems = await Promise.all(
      sales.map(async (sale) => {
        // Make sure to select discount field from sale_items
        const { data: items, error: itemsError } = await supabase
          .from("sale_items")
          .select("id, product_id, sale_id, quantity, price, discount, product:product_id(*)")
          .eq("sale_id", sale.id)

        if (itemsError) {
          console.error(`Error fetching items for sale ${sale.id}:`, itemsError)
          return { ...sale, items: [] }
        }

        // Process items to ensure they have discount information
        const processedItems = items.map((item) => ({
          ...item,
          discount: item.discount || 0, // Ensure discount exists, default to 0
        }))

        return { ...sale, items: processedItems }
      }),
    )

    return salesWithItems
  } catch (error) {
    console.error("Error in getRecentSales:", error)
    return []
  }
}

// Function to search products by name or barcode
export async function searchProducts(query: string): Promise<Product[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
      .order("name")

    if (error) {
      console.error("Error searching products:", error)
      throw error
    }

    console.log("Products from database:", data) // Log to check if stock is present
    return data || []
  } catch (error) {
    console.error("Error in searchProducts:", error)
    return []
  }
}

// Function to get products by category
export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("products").select("*").eq("category_id", categoryId).order("name")

    if (error) {
      console.error(`Error fetching products for category ${categoryId}:`, error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error(`Error in getProductsByCategory for ${categoryId}:`, error)
    return []
  }
}

// Function to get all categories
export async function getCategories() {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) {
      console.error("Error fetching categories:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error in getCategories:", error)
    return []
  }
}

// Function to get app settings
export async function getSettings() {
  const supabase = createClient()

  try {
    // First try to get global settings
    let { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .eq("type", "global")
      .single()

    // If no global settings, try system settings
    if (settingsError || !settingsData) {
      const { data: systemData, error: systemError } = await supabase
        .from("settings")
        .select("*")
        .eq("type", "system")
        .single()

      if (!systemError && systemData) {
        settingsData = systemData
        settingsError = null
      }
    }

    if (settingsError) {
      console.error("Error fetching settings:", settingsError)
      return {
        tax_rate: 0.08, // Default tax rate
        currency: "USD",
        store_name: "My Store",
      }
    }

    // Extract settings
    let currencyValue = "USD"
    let taxRateValue = 0.08 // Default 8%
    let storeName = "My Store"

    if (settingsData.settings && typeof settingsData.settings === "object" && settingsData.settings !== null) {
      // Check for currency in settings.settings
      if ("currency" in settingsData.settings && typeof settingsData.settings.currency === "string") {
        currencyValue = settingsData.settings.currency
      }

      // Check for taxRate in settings.settings
      if ("taxRate" in settingsData.settings && typeof settingsData.settings.taxRate === "number") {
        taxRateValue = settingsData.settings.taxRate
      }
    }

    // Fallback to top-level fields if they exist
    if (settingsData.currency && typeof settingsData.currency === "string") {
      currencyValue = settingsData.currency
    }

    if (typeof settingsData.tax_rate === "number") {
      taxRateValue = settingsData.tax_rate
    }

    if (settingsData.store_name && typeof settingsData.store_name === "string") {
      storeName = settingsData.store_name
    }

    return {
      tax_rate: taxRateValue,
      currency: currencyValue,
      store_name: storeName,
    }
  } catch (error) {
    console.error("Error in getSettings:", error)
    return {
      tax_rate: 0.08, // Default tax rate
      currency: "USD",
      store_name: "My Store",
    }
  }
}

// Function to get user favorite products
export async function getUserFavorites(userId: string): Promise<Product[]> {
  const supabase = createClient()

  try {
    // Get the user's favorite product IDs
    const { data: favorites, error: favoritesError } = await supabase
      .from("user_favorites")
      .select("product_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (favoritesError) {
      console.error("Error fetching user favorites:", favoritesError)
      throw favoritesError
    }

    if (!favorites || favorites.length === 0) {
      return []
    }

    // Extract product IDs from favorites
    const productIds = favorites.map((fav) => fav.product_id)

    // Fetch the actual products
    const { data: products, error: productsError } = await supabase.from("products").select("*").in("id", productIds)

    if (productsError) {
      console.error("Error fetching favorite products:", productsError)
      throw productsError
    }

    return products || []
  } catch (error) {
    console.error("Error in getUserFavorites:", error)
    return []
  }
}

// Function to add a product to user favorites
export async function addToFavorites(userId: string, productId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    // Check if already a favorite
    const { data: existing, error: checkError } = await supabase
      .from("user_favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is expected
      console.error("Error checking existing favorite:", checkError)
      throw checkError
    }

    // If already a favorite, don't add again
    if (existing) {
      return true
    }

    // Add to favorites
    const { error } = await supabase.from("user_favorites").insert({ user_id: userId, product_id: productId })

    if (error) {
      console.error("Error adding to favorites:", error)
      throw error
    }

    return true
  } catch (error) {
    console.error("Error in addToFavorites:", error)
    return false
  }
}

// Function to remove a product from user favorites
export async function removeFromFavorites(userId: string, productId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase.from("user_favorites").delete().eq("user_id", userId).eq("product_id", productId)

    if (error) {
      console.error("Error removing from favorites:", error)
      throw error
    }

    return true
  } catch (error) {
    console.error("Error in removeFromFavorites:", error)
    return false
  }
}

// Function to check if a product is in user favorites
export async function isProductFavorite(userId: string, productId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from("user_favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      console.error("Error checking favorite status:", error)
      throw error
    }

    return !!data
  } catch (error) {
    console.error("Error in isProductFavorite:", error)
    return false
  }
}

