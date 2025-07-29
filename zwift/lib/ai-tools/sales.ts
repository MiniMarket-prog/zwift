import { tool } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabaseAI"
import { registerTool } from "./index"

// Products Sold with Zero Stock Tool
const getProductsSoldWithZeroStock = tool({
  description: "Get products that were sold but had zero stock available at the time of sale",
  parameters: z.object({
    periodDays: z.number().min(1).max(90).default(7).describe("Number of days to analyze (default: 7)"),
  }),
  execute: async ({ periodDays }) => {
    try {
      console.log(`Executing getProductsSoldWithZeroStock tool with period: ${periodDays} days...`)
      const supabase = createClient()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - periodDays)

      // Get sales data with product information for the specified period
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          created_at,
          sale_items (
            product_id,
            quantity,
            price,
            products (
              id,
              name,
              barcode,
              stock,
              categories (
                name
              )
            )
          )
        `)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })

      if (salesError) {
        console.error("Error fetching sales data:", salesError)
        throw salesError
      }

      if (!salesData || salesData.length === 0) {
        return {
          success: true,
          data: [],
          message: `No sales found in the last ${periodDays} days`,
          period: `${startDate.toISOString().split("T")[0]} to ${new Date().toISOString().split("T")[0]}`,
        }
      }

      // Process sales to find products sold with zero stock
      const productsWithZeroStock: Record<string, any> = {}

      salesData.forEach((sale) => {
        if (sale.sale_items && sale.sale_items.length > 0) {
          sale.sale_items.forEach((item: any) => {
            const product = item.products
            if (product && product.stock === 0) {
              const productKey = product.id
              if (!productsWithZeroStock[productKey]) {
                productsWithZeroStock[productKey] = {
                  product_id: product.id,
                  product_name: product.name,
                  barcode: product.barcode || "Barcode not available",
                  category: (product.categories as any)?.name || "Uncategorized",
                  current_stock: product.stock,
                  total_quantity_sold: 0,
                  total_sales_count: 0,
                  total_revenue: 0,
                  last_sale_date: sale.created_at,
                  first_sale_date: sale.created_at,
                }
              }
              productsWithZeroStock[productKey].total_quantity_sold += item.quantity
              productsWithZeroStock[productKey].total_sales_count += 1
              productsWithZeroStock[productKey].total_revenue += item.price * item.quantity

              // Update date ranges
              if (new Date(sale.created_at) > new Date(productsWithZeroStock[productKey].last_sale_date)) {
                productsWithZeroStock[productKey].last_sale_date = sale.created_at
              }
              if (new Date(sale.created_at) < new Date(productsWithZeroStock[productKey].first_sale_date)) {
                productsWithZeroStock[productKey].first_sale_date = sale.created_at
              }
            }
          })
        }
      })

      const resultArray = Object.values(productsWithZeroStock)
        .map((product: any) => ({
          ...product,
          total_revenue: Math.round(product.total_revenue * 100) / 100,
          avg_sale_value:
            product.total_sales_count > 0
              ? Math.round((product.total_revenue / product.total_sales_count) * 100) / 100
              : 0,
        }))
        .sort((a: any, b: any) => b.total_quantity_sold - a.total_quantity_sold)

      console.log(`Found ${resultArray.length} products sold with zero stock`)

      return {
        success: true,
        data: resultArray,
        total_count: resultArray.length,
        period: `${startDate.toISOString().split("T")[0]} to ${new Date().toISOString().split("T")[0]}`,
        summary: {
          total_lost_sales: resultArray.reduce((sum: number, p: any) => sum + p.total_quantity_sold, 0),
          total_lost_revenue:
            Math.round(resultArray.reduce((sum: number, p: any) => sum + p.total_revenue, 0) * 100) / 100,
          affected_categories: [...new Set(resultArray.map((p: any) => p.category))],
        },
        message: `Found ${resultArray.length} products that were sold in the last ${periodDays} days but had zero stock available`,
      }
    } catch (error: any) {
      console.error("Error in getProductsSoldWithZeroStock tool:", error)
      return {
        success: false,
        error: error.message,
        message: `Failed to fetch products sold with zero stock for ${periodDays} days`,
      }
    }
  },
})

// Most Sold Products Tool
const getMostSoldProducts = tool({
  description: "Get the most sold products over a specified period",
  parameters: z.object({
    periodDays: z.number().min(1).max(365).default(30).describe("Number of days to analyze (default: 30)"),
    limit: z.number().min(1).max(50).default(20).describe("Maximum number of products to return"),
  }),
  execute: async ({ periodDays, limit }) => {
    try {
      console.log(`Executing getMostSoldProducts tool with period: ${periodDays} days...`)
      const supabase = createClient()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - periodDays)

      const { data: salesData, error } = await supabase
        .from("sale_items")
        .select(`
          quantity,
          price,
          products (
            id,
            name,
            barcode,
            stock,
            purchase_price,
            categories (
              name
            )
          ),
          sales!inner (
            created_at
          )
        `)
        .gte("sales.created_at", startDate.toISOString())

      if (error) {
        console.error("Error in getMostSoldProducts:", error)
        throw error
      }

      const productSales: Record<string, any> = {}

      salesData?.forEach((item: any) => {
        const productId = item.products?.id
        const productName = item.products?.name || "Unknown Product"
        const barcode = item.products?.barcode || "Barcode not available"
        const categoryName = (item.products?.categories as any)?.name || "Uncategorized"
        const currentStock = item.products?.stock || 0
        const purchasePrice = item.products?.purchase_price || 0

        if (!productSales[productId]) {
          productSales[productId] = {
            product_id: productId,
            product_name: productName,
            barcode: barcode,
            category_name: categoryName,
            current_stock: currentStock,
            total_quantity_sold: 0,
            total_revenue: 0,
            total_profit: 0,
            sales_count: 0,
            avg_sale_price: 0,
          }
        }

        const revenue = item.quantity * item.price
        const cost = item.quantity * purchasePrice
        const profit = revenue - cost

        productSales[productId].total_quantity_sold += item.quantity
        productSales[productId].total_revenue += revenue
        productSales[productId].total_profit += profit
        productSales[productId].sales_count += 1
      })

      const sortedProducts = Object.values(productSales)
        .map((product: any) => ({
          ...product,
          total_revenue: Math.round(product.total_revenue * 100) / 100,
          total_profit: Math.round(product.total_profit * 100) / 100,
          avg_sale_price:
            product.sales_count > 0 ? Math.round((product.total_revenue / product.total_quantity_sold) * 100) / 100 : 0,
          profit_margin:
            product.total_revenue > 0 ? Math.round((product.total_profit / product.total_revenue) * 100) : 0,
          stock_status:
            product.current_stock === 0 ? "Out of Stock" : product.current_stock < 10 ? "Low Stock" : "In Stock",
        }))
        .sort((a: any, b: any) => b.total_quantity_sold - a.total_quantity_sold)
        .slice(0, limit)

      console.log("getMostSoldProducts result:", sortedProducts.length, "products")

      const totalQuantitySold = sortedProducts.reduce((sum: number, p: any) => sum + p.total_quantity_sold, 0)
      const totalRevenue = sortedProducts.reduce((sum: number, p: any) => sum + p.total_revenue, 0)

      return {
        success: true,
        data: sortedProducts,
        total_count: sortedProducts.length,
        showing_count: sortedProducts.length,
        periodDays,
        summary: {
          total_quantity_sold: totalQuantitySold,
          total_revenue: Math.round(totalRevenue * 100) / 100,
          out_of_stock_bestsellers: sortedProducts.filter((p) => p.stock_status === "Out of Stock").length,
        },
        message: `Found ${sortedProducts.length} best-selling products over the last ${periodDays} days`,
      }
    } catch (error: any) {
      console.error("Error in getMostSoldProducts tool:", error)
      return {
        success: false,
        error: error.message,
        message: `Failed to fetch most sold products for ${periodDays} days`,
      }
    }
  },
})

// Slow Moving Products Tool
const getSlowMovingProducts = tool({
  description: "Get products that are selling slowly or not moving",
  parameters: z.object({
    periodDays: z.number().min(1).max(365).default(30).describe("Number of days to analyze (default: 30)"),
    limit: z.number().min(1).max(50).default(20).describe("Maximum number of products to return"),
  }),
  execute: async ({ periodDays, limit }) => {
    try {
      console.log(`Executing getSlowMovingProducts tool with period: ${periodDays} days...`)
      const supabase = createClient()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - periodDays)

      const { data: products, error } = await supabase.from("products").select(`
          id,
          name,
          stock,
          min_stock,
          price,
          purchase_price,
          barcode,
          categories (
            name
          )
        `)

      if (error) throw error

      const { data: salesData, error: salesError } = await supabase
        .from("sale_items")
        .select(`
          product_id,
          quantity,
          sales!inner (
            created_at
          )
        `)
        .gte("sales.created_at", startDate.toISOString())

      if (salesError) throw salesError

      const productSales: Record<string, number> = {}
      salesData?.forEach((item: any) => {
        productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity
      })

      const slowMovingProducts = (products || [])
        .map((product: any) => {
          const quantitySold = productSales[product.id] || 0
          const avgDailyVelocity = quantitySold / periodDays
          const stockValue = (product.price || 0) * (product.stock || 0)
          const daysOfStock = avgDailyVelocity > 0 ? (product.stock || 0) / avgDailyVelocity : Number.POSITIVE_INFINITY

          return {
            id: product.id,
            name: product.name,
            barcode: product.barcode || "Barcode not available",
            category_name: (product.categories as any)?.name || "Uncategorized",
            current_stock: product.stock || 0,
            min_stock: product.min_stock || 0,
            price: product.price || 0,
            total_quantity_sold_in_period: quantitySold,
            avg_daily_velocity: Math.round(avgDailyVelocity * 100) / 100,
            stock_value: Math.round(stockValue * 100) / 100,
            days_of_stock_remaining: daysOfStock === Number.POSITIVE_INFINITY ? "Never" : Math.round(daysOfStock),
            movement_status:
              quantitySold === 0
                ? "No Movement"
                : avgDailyVelocity < 0.1
                  ? "Very Slow"
                  : avgDailyVelocity < 0.5
                    ? "Slow"
                    : "Moderate",
          }
        })
        .filter((product: any) => product.avg_daily_velocity < 1) // Less than 1 unit per day
        .sort((a: any, b: any) => a.avg_daily_velocity - b.avg_daily_velocity)
        .slice(0, limit)

      console.log("getSlowMovingProducts result:", slowMovingProducts.length, "products")

      const totalStockValue = slowMovingProducts.reduce((sum: number, p: any) => sum + p.stock_value, 0)
      const noMovementCount = slowMovingProducts.filter((p) => p.total_quantity_sold_in_period === 0).length

      return {
        success: true,
        data: slowMovingProducts,
        total_count: slowMovingProducts.length,
        showing_count: slowMovingProducts.length,
        periodDays,
        summary: {
          no_movement_count: noMovementCount,
          total_stock_value: Math.round(totalStockValue * 100) / 100,
          avg_daily_velocity:
            slowMovingProducts.length > 0
              ? Math.round(
                  (slowMovingProducts.reduce((sum: number, p: any) => sum + p.avg_daily_velocity, 0) /
                    slowMovingProducts.length) *
                    100,
                ) / 100
              : 0,
        },
        message: `Found ${slowMovingProducts.length} slow-moving products over the last ${periodDays} days (${noMovementCount} with no movement)`,
      }
    } catch (error: any) {
      console.error("Error in getSlowMovingProducts tool:", error)
      return {
        success: false,
        error: error.message,
        message: `Failed to fetch slow-moving products for ${periodDays} days`,
      }
    }
  },
})

// Register sales tools
registerTool("getProductsSoldWithZeroStock", getProductsSoldWithZeroStock)
registerTool("getMostSoldProducts", getMostSoldProducts)
registerTool("getSlowMovingProducts", getSlowMovingProducts)
