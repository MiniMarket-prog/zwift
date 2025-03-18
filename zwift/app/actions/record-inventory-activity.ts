"use server"

import { createClient } from "@/utils/supabase/server"

type RecordActivityParams = {
  productId: string
  quantityChange: number
  previousQuantity: number
  newQuantity: number
  actionType: string
  userId?: string | null
  notes?: string | null
}

export async function recordInventoryActivity({
  productId,
  quantityChange,
  previousQuantity,
  newQuantity,
  actionType,
  userId = null,
  notes = null,
}: RecordActivityParams) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("inventory_activity")
      .insert({
        product_id: productId,
        quantity_change: quantityChange,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        action_type: actionType,
        created_by: userId,
        notes: notes,
      })
      .select()

    if (error) {
      console.error("Error recording inventory activity:", error)
      return null
    }

    return data[0]
  } catch (err) {
    console.error("Exception in recordInventoryActivity:", err)
    return null
  }
}

