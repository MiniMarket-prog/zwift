"use server"

import { createClient } from "@/utils/supabase/server"
import { cache } from "react"
import { format, subDays } from "date-fns"

// Update the ForecastProduct type to include the correct created_at type
export type ForecastProduct = {
  id: string
  name: string
  stock: number
  min_stock: number
  price: number
  purchase_price: number | null
  barcode: string
  category_id: string | null
  created_at?: string | null
  avg_daily_sales: number
  days_until_stockout: number
  reorder_recommendation: number
  forecast: Array<{ date: string; projected_stock: number }>
}

// Function to get inventory forecast data
export const getInventoryForecast = cache(async (days = 90, leadTime = 7, safetyStock = 5, forecastDays = 30) => {
  try {
    const supabase = createClient()

    // Fetch products
    const { data: productsData, error: productsError } = await supabase.from("products").select("*").order("name")

    if (productsError) throw productsError

    // Since we don't have actual sales data, we'll generate some mock data
    // In a real application, you would fetch this from your sales table
    const productsWithForecast =
      productsData?.map((product) => {
        // Generate a random average daily sales between 0 and 10% of current stock
        const maxSales = Math.max(1, Math.floor(product.stock * 0.1))
        const avg_daily_sales = Math.random() * maxSales

        // Calculate days until stockout
        const days_until_stockout = avg_daily_sales > 0 ? Math.floor(product.stock / avg_daily_sales) : 999 // If no sales, set a high number

        // Calculate reorder recommendation based on lead time and safety stock
        const reorder_recommendation = Math.ceil(
          avg_daily_sales * leadTime + avg_daily_sales * leadTime * (safetyStock / 100),
        )

        // Generate forecast data for the chart
        const forecast = []
        let projectedStock = product.stock

        for (let i = 0; i < forecastDays; i++) {
          const date = format(subDays(new Date(), -i), "MMM dd")
          projectedStock = Math.max(0, projectedStock - avg_daily_sales)
          forecast.push({
            date,
            projected_stock: Math.round(projectedStock * 100) / 100,
          })
        }

        return {
          ...product,
          avg_daily_sales,
          days_until_stockout,
          reorder_recommendation: days_until_stockout < leadTime * 2 ? reorder_recommendation : 0,
          forecast,
        } as ForecastProduct
      }) || []

    return productsWithForecast
  } catch (error) {
    console.error("Error in getInventoryForecast:", error)
    throw error
  }
})

// Function to generate a purchase order based on forecast
export async function generatePurchaseOrder(productIds: string[]) {
  try {
    const supabase = createClient()

    // Get the products to order
    const { data: products, error } = await supabase.from("products").select("*").in("id", productIds)

    if (error) throw error

    // Create a purchase order (this would connect to your actual purchase order system)
    // For now, we'll just return the products that would be ordered

    return {
      success: true,
      order_id: `PO-${Date.now()}`,
      products: products,
      total_items: products?.length || 0,
      estimated_cost: products?.reduce((sum, product) => sum + (product.purchase_price || product.price), 0) || 0,
    }
  } catch (error) {
    console.error("Error generating purchase order:", error)
    throw error
  }
}

