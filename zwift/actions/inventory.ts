"use server"

import { createClient } from "@/utils/supabase/server"
import { cache } from "react"

export type InventoryItem = {
  id: string
  name: string
  price: number
  stock: number
  min_stock: number
  image?: string | null
  category_id?: string | null
  purchase_price?: number | null
  barcode?: string
}

// Add caching to prevent repeated fetches
export const getInventoryItems = cache(async () => {
  try {
    const supabase = createClient()
    console.log("Fetching inventory items...")

    const { data, error } = await supabase.from("products").select("*").order("name")

    if (error) {
      console.error("Error fetching inventory items:", error)
      return []
    }

    // Ensure all products have min_stock values and proper data types
    const formattedItems = data.map((item) => ({
      ...item,
      // Ensure numeric values are properly typed
      stock: typeof item.stock === "number" ? item.stock : Number.parseInt(String(item.stock), 10) || 0,
      min_stock:
        typeof item.min_stock === "number"
          ? item.min_stock
          : item.min_stock === null || item.min_stock === undefined
            ? 5 // Default min_stock to 5 if not set
            : Number.parseInt(String(item.min_stock), 10) || 5,
    }))

    console.log(`Successfully fetched ${formattedItems.length} inventory items`)
    return formattedItems as InventoryItem[]
  } catch (error) {
    console.error("Exception in getInventoryItems:", error)
    return []
  }
})

export async function getLowStockItems() {
  try {
    const supabase = createClient()
    console.log("Fetching low stock items...")

    // First, let's get all products
    const { data: allItems, error: fetchError } = await supabase.from("products").select("*")

    if (fetchError) {
      console.error("Error fetching products:", fetchError)
      return []
    }

    // Then filter for low stock items in JavaScript
    const lowStockItems = allItems
      .filter((item) => {
        // Check if the item has a min_stock property
        const minStock = item.min_stock || 5 // Default to 5 if not set
        return item.stock < minStock
      })
      .sort((a, b) => a.stock - b.stock) // Sort by stock (ascending)

    console.log(`Successfully fetched ${lowStockItems.length} low stock items`)
    return lowStockItems as InventoryItem[]
  } catch (error) {
    console.error("Exception in getLowStockItems:", error)
    return []
  }
}

