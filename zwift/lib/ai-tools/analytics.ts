import { tool } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabaseAI"
import { registerTool } from "./index"

// Dashboard Stats Tool
const getDashboardStats = tool({
  description: "Get overall dashboard statistics including sales, expenses, and inventory metrics",
  parameters: z.object({
    fromDate: z.string().optional().describe("Start date for analysis (YYYY-MM-DD format)"),
    toDate: z.string().optional().describe("End date for analysis (YYYY-MM-DD format)"),
  }),
  execute: async ({ fromDate, toDate }) => {
    try {
      console.log(`Executing getDashboardStats tool with dates: ${fromDate} to ${toDate}...`)
      const supabase = createClient()

      let salesQuery = supabase.from("sales").select("total, created_at")
      let expensesQuery = supabase.from("expenses").select("amount, created_at")

      if (fromDate && toDate) {
        salesQuery = salesQuery.gte("created_at", fromDate).lte("created_at", toDate)
        expensesQuery = expensesQuery.gte("created_at", fromDate).lte("created_at", toDate)
      }

      const [salesResult, expensesResult, productsResult] = await Promise.all([
        salesQuery,
        expensesQuery,
        supabase.from("products").select("id, stock, min_stock"),
      ])

      if (salesResult.error) throw salesResult.error
      if (expensesResult.error) throw expensesResult.error
      if (productsResult.error) throw productsResult.error

      const totalSales = salesResult.data?.reduce((sum, sale) => sum + sale.total, 0) || 0
      const totalExpenses = expensesResult.data?.reduce((sum, expense) => sum + expense.amount, 0) || 0
      const profit = totalSales - totalExpenses

      const salesCount = salesResult.data?.length || 0
      const expensesCount = expensesResult.data?.length || 0
      const totalProducts = productsResult.data?.length || 0
      const lowStockCount = productsResult.data?.filter((p) => p.stock < p.min_stock).length || 0
      const outOfStockCount = productsResult.data?.filter((p) => p.stock === 0).length || 0

      const stats = {
        totalSales: Math.round(totalSales * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        salesCount,
        expensesCount,
        totalProducts,
        lowStockCount,
        outOfStockCount,
      }

      console.log("getDashboardStats result:", stats)

      return {
        success: true,
        data: stats,
        dateRange: fromDate && toDate ? { fromDate, toDate } : "all time",
        message: `Retrieved dashboard statistics for ${fromDate && toDate ? `${fromDate} to ${toDate}` : "all time"}`,
      }
    } catch (error: any) {
      console.error("Error in getDashboardStats tool:", error)
      return {
        success: false,
        error: error.message,
        message: "Failed to fetch dashboard statistics",
      }
    }
  },
})

// Categories Tool
const getCategories = tool({
  description: "Get all product categories",
  parameters: z.object({}),
  execute: async () => {
    try {
      console.log("Executing getCategories tool...")
      const supabase = createClient()
      const { data: categories, error } = await supabase.from("categories").select("id, name").order("name")

      if (error) throw error

      console.log("getCategories result:", categories?.length || 0, "categories")

      const limitedCategories = (categories || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
      }))

      return {
        success: true,
        data: limitedCategories,
        count: categories?.length || 0,
        message: `Retrieved ${categories?.length || 0} product categories`,
      }
    } catch (error: any) {
      console.error("Error in getCategories tool:", error)
      return {
        success: false,
        error: error.message,
        message: "Failed to fetch categories",
      }
    }
  },
})

// Register analytics tools
registerTool("getDashboardStats", getDashboardStats)
registerTool("getCategories", getCategories)
