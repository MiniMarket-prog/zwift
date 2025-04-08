// Client-side Supabase client
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import type { Sale, SaleItem, Product } from "./types"

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Fetch sales data for a specific date range
export async function fetchSalesData(from: Date, to: Date): Promise<Sale[]> {
  const supabase = createClient()

  console.log("Fetching sales data from:", from, "to:", to)

  // Format dates for Supabase query
  const fromDate = from.toISOString().split("T")[0]
  const toDate = to.toISOString().split("T")[0] + " 23:59:59"

  try {
    // Fetch sales with items and products for the current period
    const { data: rawSalesData, error: salesError } = await supabase
      .from("sales")
      .select(`
        id,
        total,
        tax,
        payment_method,
        user_id,
        created_at,
        updated_at,
        sale_items (
          id, 
          sale_id, 
          product_id, 
          quantity, 
          price, 
          discount,
          created_at,
          products:product_id (
            id, 
            name, 
            price, 
            purchase_price, 
            category_id
          )
        )
      `)
      .gte("created_at", fromDate)
      .lte("created_at", toDate)
      .order("created_at", { ascending: false })

    if (salesError) {
      console.error("Error fetching sales:", salesError)
      throw salesError
    }

    // Process sales data - transform from raw format to our expected format
    const processedSales: Sale[] = (rawSalesData || []).map((rawSale: any) => {
      // Transform sale_items to items with product property
      const items: SaleItem[] = (rawSale.sale_items || []).map((rawItem: any) => {
        // Handle both cases: when products is an array or a single object
        let product: Product | undefined = undefined

        if (rawItem.products) {
          if (Array.isArray(rawItem.products)) {
            // If it's an array, take the first product
            product = rawItem.products[0]
          } else {
            // If it's a single object, use it directly
            product = rawItem.products
          }
        }

        return {
          id: rawItem.id,
          sale_id: rawItem.sale_id,
          product_id: rawItem.product_id,
          quantity: rawItem.quantity,
          price: rawItem.price,
          discount: rawItem.discount,
          created_at: rawItem.created_at,
          product: product,
        }
      })

      // Return the transformed sale
      return {
        id: rawSale.id,
        created_at: rawSale.created_at,
        total: rawSale.total,
        tax: rawSale.tax,
        payment_method: rawSale.payment_method,
        user_id: rawSale.user_id,
        updated_at: rawSale.updated_at,
        items: items,
      }
    })

    console.log(`Processed ${processedSales.length} sales`)
    return processedSales
  } catch (error) {
    console.error("Error in fetchSalesData:", error)
    throw error
  }
}

export async function fetchCategories() {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error fetching categories:", error)
    throw error
  }
}
