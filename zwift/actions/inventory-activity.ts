"use server"

import { createClient } from "@/utils/supabase/server"

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

export async function getRecentInventoryActivity(limit = 5) {
  try {
    const supabase = createClient()

    console.log("Fetching recent inventory activity...")

    // Query inventory_activity table with product details
    const { data, error } = await supabase
      .from("inventory_activity")
      .select(`
        *,
        products (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching inventory activity:", error)
      return []
    }

    // Format the data for display
    const formattedData = data.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.products?.name || "Unknown Product",
      quantity_change: item.quantity_change,
      previous_quantity: item.previous_quantity,
      new_quantity: item.new_quantity,
      action_type: item.action_type,
      created_at: item.created_at,
      user_id: item.user_id,
      notes: item.notes,
    }))

    console.log(`Successfully fetched ${formattedData.length} inventory activities`)
    return formattedData as InventoryActivity[]
  } catch (err) {
    console.error("Exception in getRecentInventoryActivity:", err)
    return []
  }
}

