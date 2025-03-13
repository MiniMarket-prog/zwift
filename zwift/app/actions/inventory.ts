"use server"

import { createClient } from "@/utils/supabase/server"
import { cache } from "react"

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

    console.log(`Successfully fetched ${data.length} inventory items`)
    return data
  } catch (error) {
    console.error("Exception in getInventoryItems:", error)
    return []
  }
})

export const getLowStockItems = cache(async (limit = 5) => {
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
        // Check if the item has a threshold/min_stock property
        const threshold = item.min_stock || 5 // Default to 5 if not set
        return item.stock < threshold
      })
      .sort((a, b) => a.stock - b.stock) // Sort by stock (ascending)
      .slice(0, limit) // Limit to requested number

    console.log(`Successfully fetched ${lowStockItems.length} low stock items`)
    return lowStockItems
  } catch (error) {
    console.error("Exception in getLowStockItems:", error)
    return []
  }
})

