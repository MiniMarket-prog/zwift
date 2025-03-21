"use server"

import { createClient } from "@/utils/supabase/server"
import { cache } from "react"

export type Supplier = {
  id: string
  name: string
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string | null
}

// Function to get all suppliers
export const getSuppliers = cache(async () => {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("suppliers").select("*").order("name", { ascending: true })

    if (error) {
      console.error("Error fetching suppliers:", error)
      return { data: [], error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error("Exception in getSuppliers:", error)
    return { data: [], error }
  }
})

// Function to get a single supplier
export const getSupplierById = cache(async (supplierId: string) => {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("suppliers").select("*").eq("id", supplierId).single()

    if (error) throw error

    return data
  } catch (error) {
    console.error(`Error fetching supplier ${supplierId}:`, error)
    throw error
  }
})

// Function to create a new supplier
export async function createSupplier(supplierData: Omit<Supplier, "id" | "created_at" | "updated_at">) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        ...supplierData,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, supplier: data }
  } catch (error) {
    console.error("Error creating supplier:", error)

    // Check if it's a "relation does not exist" error
    if ((error as any)?.code === "42P01") {
      return {
        success: false,
        error: "Database table not set up. Please run the migration script to create the suppliers table.",
      }
    }

    return { success: false, error: "Failed to create supplier" }
  }
}

// Function to update a supplier
export async function updateSupplier(
  supplierId: string,
  supplierData: Partial<Omit<Supplier, "id" | "created_at" | "updated_at">>,
) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from("suppliers")
      .update({
        ...supplierData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", supplierId)
      .select()
      .single()

    if (error) throw error

    return { success: true, supplier: data }
  } catch (error) {
    console.error(`Error updating supplier ${supplierId}:`, error)
    return { success: false, error: "Failed to update supplier" }
  }
}

// Function to delete a supplier
export async function deleteSupplier(supplierId: string) {
  const supabase = createClient()

  try {
    // Check if the supplier is used in any purchase orders
    const { data: usedInOrders, error: checkError } = await supabase
      .from("purchase_orders")
      .select("id")
      .eq("supplier_id", supplierId)
      .limit(1)

    if (checkError) throw checkError

    if (usedInOrders && usedInOrders.length > 0) {
      return {
        success: false,
        error: "This supplier cannot be deleted because it is used in one or more purchase orders.",
      }
    }

    // Delete the supplier
    const { error } = await supabase.from("suppliers").delete().eq("id", supplierId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error(`Error deleting supplier ${supplierId}:`, error)
    return { success: false, error: "Failed to delete supplier" }
  }
}

