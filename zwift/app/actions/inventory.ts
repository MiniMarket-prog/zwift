"use server"

import { createClient } from "@/utils/supabase/server"
import { cache } from "react"

// Define a type for inventory items based on your products table
type InventoryItem = {
  id: string
  name: string
  stock: number
  min_stock?: number
  // Add other fields as needed
  [key: string]: any
}

// Add caching to prevent repeated fetches
export const getInventoryItems = cache(async () => {
  try {
    const supabase = createClient()
    console.log("Fetching inventory items...")

    // Initialize an empty array with the correct type
    const allItems: InventoryItem[] = []
    let page = 0
    const pageSize = 1000 // Supabase's maximum limit
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name")
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) {
        console.error("Error fetching inventory items:", error)
        return allItems // Return what we've got so far
      }

      if (data && data.length > 0) {
        allItems.push(...data as InventoryItem[])
        page++
      }

      // If we got fewer items than the page size, we've reached the end
      hasMore = data && data.length === pageSize
    }

    console.log(`Successfully fetched ${allItems.length} inventory items`)
    return allItems
  } catch (error) {
    console.error("Exception in getInventoryItems:", error)
    return []
  }
})

export const getLowStockItems = cache(async (limit = 5) => {
  try {
    const supabase = createClient()
    console.log("Fetching low stock items...")

    // Initialize with the correct type
    const allItems: InventoryItem[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) {
        console.error("Error fetching products:", error)
        break
      }

      if (data && data.length > 0) {
        allItems.push(...data as InventoryItem[])
        page++
      }

      hasMore = data && data.length === pageSize
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