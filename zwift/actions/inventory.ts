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

export async function getLowStockItems() {
  try {
    const supabase = createClient()

    console.log("Fetching low stock items...")

    // Get items where stock is below min_stock
    const { data, error } = await supabase.from("products").select("*").lt("stock", "min_stock").order("stock")

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

