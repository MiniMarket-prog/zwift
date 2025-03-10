"use server"

import { createClient } from "@/utils/supabase/server"

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

export async function getInventoryItems() {
  try {
    const supabase = createClient()

    console.log("Fetching inventory items...")

    const { data, error } = await supabase
      .from("products") // Changed from 'inventory' to 'products' to match your schema
      .select("*")
      .order("name")

    if (error) {
      console.error("Error fetching inventory:", error)
      return []
    }

    console.log(`Successfully fetched ${data.length} inventory items`)
    return data as InventoryItem[]
  } catch (err) {
    console.error("Exception in getInventoryItems:", err)
    return []
  }
}

export async function getLowStockItems() {
  try {
    const supabase = createClient()

    console.log("Fetching low stock items...")

    // Get items where stock is below min_stock
    const { data, error } = await supabase
      .from("products") // Changed from 'inventory' to 'products'
      .select("*")
      .lt("stock", "min_stock") // Changed from 'quantity' and 'threshold' to 'stock' and 'min_stock'
      .order("stock") // Changed from 'quantity' to 'stock'

    if (error) {
      console.error("Error fetching low stock items:", error)
      return []
    }

    console.log(`Successfully fetched ${data.length} low stock items`)
    return data as InventoryItem[]
  } catch (err) {
    console.error("Exception in getLowStockItems:", err)
    return []
  }
}

