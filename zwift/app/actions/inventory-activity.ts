"use server"

import { createClient } from "@/utils/supabase/server"
import { cache } from "react"

export type InventoryActivity = {
  id: string
  product_id: string
  product_name: string
  quantity_change: number
  previous_quantity: number
  new_quantity: number
  action_type: string
  created_at: string
  user_id?: string | null
  notes?: string | null
}

// Add caching to prevent repeated fetches
export const getRecentInventoryActivity = cache(async (limit = 5) => {
  try {
    const supabase = createClient()

    console.log("Fetching recent inventory activity...")

    // Try to query inventory_activity table with a simple select first
    const { data: activityData, error: activityError } = await supabase
      .from("inventory_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (activityError) {
      console.error("Error fetching inventory activity:", activityError)

      // Fallback to querying products directly
      console.log("Attempting fallback to products table...")

      // Get low stock items - fixed comparison
      const { data: lowStockItems, error: lowStockError } = await supabase
        .from("products")
        .select("*")
        .order("stock", { ascending: true })
        .limit(Math.ceil(limit / 2))

      if (lowStockError) {
        console.error("Error fetching products:", lowStockError)
        return []
      }

      // Filter low stock items in JavaScript
      const filteredLowStockItems = lowStockItems.filter((item) => item.stock < (item.min_stock || 5))

      // Format low stock items as activity
      const lowStockActivity = filteredLowStockItems.map((item) => ({
        id: `low-${item.id}`,
        product_id: item.id,
        product_name: item.name,
        quantity_change: 0,
        previous_quantity: item.stock,
        new_quantity: item.stock,
        action_type: "Low Stock",
        created_at: new Date().toISOString(),
        user_id: null,
        notes: "Inventory below threshold",
      }))

      // Get recent sales
      const { data: recentSales, error: salesError } = await supabase
        .from("sales")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(Math.ceil(limit / 2))

      if (salesError) {
        console.error("Error fetching recent sales:", salesError)
        return lowStockActivity
      }

      // Explicitly type salesActivity
      let salesActivity: InventoryActivity[] = []

      if (recentSales.length > 0) {
        // Get sale items
        const saleIds = recentSales.map((sale) => sale.id)

        const { data: saleItems, error: saleItemsError } = await supabase
          .from("sale_items")
          .select("sale_id, product_id, quantity, created_at")
          .in("sale_id", saleIds)

        if (saleItemsError) {
          console.error("Error fetching sale items:", saleItemsError)
          return lowStockActivity
        }

        if (saleItems.length > 0) {
          // Get product details
          const productIds = [...new Set(saleItems.map((item) => item.product_id))]

          const { data: products, error: productsError } = await supabase
            .from("products")
            .select("id, name, stock")
            .in("id", productIds)

          if (productsError) {
            console.error("Error fetching products:", productsError)
            return lowStockActivity
          }

          // Create activity entries for sales
          salesActivity = saleItems.map((item) => {
            const product = products.find((p) => p.id === item.product_id)
            const stock = product ? product.stock : 0

            return {
              id: `sale-${item.sale_id}-${item.product_id}`,
              product_id: item.product_id,
              product_name: product ? product.name : "Unknown Item",
              quantity_change: -item.quantity,
              previous_quantity: stock + item.quantity,
              new_quantity: stock,
              action_type: "Sale",
              created_at: item.created_at || new Date().toISOString(),
              user_id: null,
              notes: `Sale #${item.sale_id.substring(0, 8)}`,
            }
          })
        }
      }

      // Combine and sort activities
      return [...lowStockActivity, ...salesActivity]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)
    }

    // If we have activity data, we need to get the product names
    // Get all product IDs from the activity data
    const productIds = [...new Set(activityData.map((item) => item.inventory_id || item.product_id).filter(Boolean))]

    // Get product details
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds)

    if (productsError) {
      console.error("Error fetching products for activity:", productsError)
    }

    // Format the data for display
    const formattedData = activityData.map((item) => {
      const productId = item.inventory_id || item.product_id
      const product = products?.find((p) => p.id === productId)

      return {
        id: item.id,
        product_id: productId,
        product_name: product?.name || "Unknown Item",
        quantity_change: item.quantity_change,
        previous_quantity: item.previous_quantity || 0,
        new_quantity: item.new_quantity || (item.previous_quantity || 0) + item.quantity_change,
        action_type: item.activity_type || item.action_type,
        created_at: item.created_at,
        user_id: item.created_by,
        notes: item.notes,
      }
    })

    console.log(`Successfully fetched ${formattedData.length} inventory activities`)
    return formattedData as InventoryActivity[]
  } catch (err) {
    console.error("Exception in getRecentInventoryActivity:", err)
    return []
  }
})

