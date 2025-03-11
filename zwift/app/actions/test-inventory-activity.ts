"use server"

import { createClient } from "@/utils/supabase/server"

export async function generateTestInventoryActivity() {
  try {
    const supabase = createClient()
    console.log("Generating test inventory activity...")

    // 1. Get a random inventory item
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from("inventory")
      .select("id, name, quantity")
      .limit(1)

    if (inventoryError || !inventoryItems || inventoryItems.length === 0) {
      console.error("Error fetching inventory item:", inventoryError)
      return { success: false, message: "Failed to fetch inventory item" }
    }

    const item = inventoryItems[0]
    const currentQuantity = item.quantity
    const newQuantity = currentQuantity + 5 // Add 5 units

    // 2. Update the inventory quantity
    const { error: updateError } = await supabase.from("inventory").update({ quantity: newQuantity }).eq("id", item.id)

    if (updateError) {
      console.error("Error updating inventory:", updateError)
      return { success: false, message: "Failed to update inventory" }
    }

    console.log(`Successfully updated inventory item ${item.name} from ${currentQuantity} to ${newQuantity}`)

    // 3. Check if the activity was recorded
    const { data: activities, error: activityError } = await supabase
      .from("inventory_activity")
      .select("*")
      .eq("inventory_id", item.id)
      .order("created_at", { ascending: false })
      .limit(1)

    if (activityError) {
      console.error("Error checking inventory activity:", activityError)
      return {
        success: true,
        message: `Updated inventory, but couldn't verify activity recording: ${activityError.message}`,
      }
    }

    return {
      success: true,
      message: `Successfully updated ${item.name} from ${currentQuantity} to ${newQuantity}`,
      activityRecorded: activities && activities.length > 0,
    }
  } catch (error: any) {
    // Add type assertion for error
    console.error("Exception in generateTestInventoryActivity:", error)
    return {
      success: false,
      message: `Exception: ${error?.message || "Unknown error"}`,
    }
  }
}

