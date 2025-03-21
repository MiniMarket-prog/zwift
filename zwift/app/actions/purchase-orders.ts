"use server"

import { createClient } from "@/utils/supabase/server"
import { cache } from "react"

export type PurchaseOrder = {
  id: string
  order_number: string
  supplier_id?: string | null
  supplier_name?: string | null
  order_date: string
  expected_delivery_date?: string | null
  status: "pending" | "approved" | "shipped" | "received" | "cancelled"
  total_amount: number
  notes?: string | null
  created_at: string
  updated_at?: string | null
}

export type PurchaseOrderItem = {
  id: string
  purchase_order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

// Function to get all purchase orders
export const getPurchaseOrders = cache(async () => {
  const supabase = createClient()

  try {
    console.log("Fetching purchase orders from server action...")

    // Direct query without any error handling first to see raw error
    console.log("Attempting direct query to purchase_orders table...")
    const rawResult = await supabase.from("purchase_orders").select("*").limit(1)
    console.log("Raw query result:", rawResult)

    // Now do the actual query with proper error handling
    const { data, error } = await supabase.from("purchase_orders").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching purchase orders in server action:", error)
      return { data: [], error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error("Exception in getPurchaseOrders server action:", error)
    return { data: [], error }
  }
})

// Function to get a single purchase order with its items
export const getPurchaseOrderWithItems = cache(async (orderId: string) => {
  const supabase = createClient()

  try {
    // Get the purchase order
    const { data: order, error: orderError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", orderId)
      .single()

    if (orderError) throw orderError

    // Get the purchase order items
    const { data: items, error: itemsError } = await supabase
      .from("purchase_order_items")
      .select(`
        *,
        products (
          id,
          name,
          barcode
        )
      `)
      .eq("purchase_order_id", orderId)

    if (itemsError) throw itemsError

    return {
      order,
      items: items || [],
    }
  } catch (error) {
    console.error(`Error fetching purchase order ${orderId}:`, error)
    throw error
  }
})

// Function to update purchase order status
export async function updatePurchaseOrderStatus(orderId: string, status: PurchaseOrder["status"]) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from("purchase_orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error(`Error updating purchase order ${orderId} status:`, error)
    throw error
  }
}

// Function to receive purchase order (update status and increase stock)
export async function receivePurchaseOrder(orderId: string) {
  const supabase = createClient()

  try {
    // Start a transaction by getting the items first
    const { data: items, error: itemsError } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", orderId)

    if (itemsError) throw itemsError

    // Update each product's stock
    for (const item of items || []) {
      // Get current product stock
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single()

      if (productError) throw productError

      // Update product stock
      const newStock = (product?.stock || 0) + item.quantity

      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.product_id)

      if (updateError) throw updateError
    }

    // Update purchase order status
    const { data, error } = await supabase
      .from("purchase_orders")
      .update({
        status: "received",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error(`Error receiving purchase order ${orderId}:`, error)
    throw error
  }
}

// Function to generate a purchase order
export async function generatePurchaseOrder(productData: {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  supplier_id?: string
  supplier_name?: string
  expected_delivery_date?: string
  notes?: string
}) {
  const supabase = createClient()

  try {
    // First, verify that the product exists
    const { data: productExists, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", productData.product_id)
      .single()

    if (productError) {
      console.error("Product verification error:", productError)
      return {
        success: false,
        error: `Product with ID ${productData.product_id} not found. Please select a valid product.`,
      }
    }

    // Generate a unique order number (PO-YYYYMMDD-XXXX)
    const today = new Date()
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, "")
    const randomPart = Math.floor(1000 + Math.random() * 9000)
    const orderNumber = `PO-${datePart}-${randomPart}`

    // Calculate total price
    const totalPrice = productData.quantity * productData.unit_price

    // Create the purchase order
    const { data: orderData, error: orderError } = await supabase
      .from("purchase_orders")
      .insert({
        order_number: orderNumber,
        supplier_id: productData.supplier_id || null,
        supplier_name: productData.supplier_name || "Default Supplier",
        order_date: today.toISOString(),
        expected_delivery_date: productData.expected_delivery_date || null,
        status: "pending",
        total_amount: totalPrice,
        notes: productData.notes || null,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Create the purchase order item
    const { error: itemError } = await supabase.from("purchase_order_items").insert({
      purchase_order_id: orderData.id,
      product_id: productData.product_id,
      product_name: productData.product_name,
      quantity: productData.quantity,
      unit_price: productData.unit_price,
      total_price: totalPrice,
    })

    if (itemError) throw itemError

    return { success: true, order: orderData }
  } catch (error) {
    console.error("Error generating purchase order:", error)

    // Check if it's a "relation does not exist" error
    if ((error as any)?.code === "42P01") {
      return {
        success: false,
        error: "Database tables not set up. Please run the migration script to create the purchase orders tables.",
      }
    }

    return { success: false, error: "Failed to generate purchase order" }
  }
}

