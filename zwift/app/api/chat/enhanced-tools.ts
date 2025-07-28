// Here are the 5 most valuable new tools we should add:

import { tool } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabaseAI"

export const enhancedTools = {
  // 1. SUPPLIER ANALYSIS - Very valuable for business decisions
  getSupplierAnalysis: tool({
    description: "Analyze supplier performance, delivery times, and cost effectiveness",
    parameters: z.object({
      analysis_type: z
        .enum(["performance", "cost_comparison", "delivery_analysis", "reliability_score"])
        .describe("Type of supplier analysis"),
      supplier_id: z.string().optional().describe("Specific supplier to analyze"),
      period_days: z.number().min(1).max(365).default(90).describe("Period to analyze (default: 90 days)"),
    }),
    execute: async ({ analysis_type, supplier_id, period_days }) => {
      try {
        const supabase = createClient()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - period_days)

        // Get purchase orders with supplier info
        let query = supabase
          .from("purchase_orders")
          .select(`
          id,
          supplier_id,
          total_amount,
          status,
          order_date,
          delivery_date,
          expected_delivery_date,
          suppliers (
            id,
            name,
            contact_info,
            address
          ),
          purchase_order_items (
            product_id,
            quantity,
            unit_cost,
            products (
              name,
              categories (name)
            )
          )
        `)
          .gte("order_date", startDate.toISOString())

        if (supplier_id) {
          query = query.eq("supplier_id", supplier_id)
        }

        const { data: orders, error } = await query

        if (error) throw error

        // Analyze supplier performance
        const supplierStats: Record<string, any> = {}

        orders?.forEach((order) => {
          const supplierId = order.supplier_id
          const supplierName = (order.suppliers as any)?.name || "Unknown Supplier"

          if (!supplierStats[supplierId]) {
            supplierStats[supplierId] = {
              supplier_id: supplierId,
              supplier_name: supplierName,
              total_orders: 0,
              total_amount: 0,
              on_time_deliveries: 0,
              late_deliveries: 0,
              avg_delivery_days: 0,
              total_delivery_days: 0,
              completed_orders: 0,
              product_categories: new Set(),
            }
          }

          const stats = supplierStats[supplierId]
          stats.total_orders += 1
          stats.total_amount += order.total_amount || 0

          // Calculate delivery performance
          if (order.delivery_date && order.expected_delivery_date) {
            const deliveryDate = new Date(order.delivery_date)
            const expectedDate = new Date(order.expected_delivery_date)
            const orderDate = new Date(order.order_date)

            const deliveryDays = Math.ceil((deliveryDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
            stats.total_delivery_days += deliveryDays
            stats.completed_orders += 1

            if (deliveryDate <= expectedDate) {
              stats.on_time_deliveries += 1
            } else {
              stats.late_deliveries += 1
            }
          }

          // Track product categories
          order.purchase_order_items?.forEach((item: any) => {
            const categoryName = item.products?.categories?.name
            if (categoryName) {
              stats.product_categories.add(categoryName)
            }
          })
        })

        // Calculate final metrics
        const supplierAnalysis = Object.values(supplierStats)
          .map((stats: any) => ({
            ...stats,
            avg_order_value:
              stats.total_orders > 0 ? Math.round((stats.total_amount / stats.total_orders) * 100) / 100 : 0,
            on_time_percentage:
              stats.completed_orders > 0 ? Math.round((stats.on_time_deliveries / stats.completed_orders) * 100) : 0,
            avg_delivery_days:
              stats.completed_orders > 0 ? Math.round(stats.total_delivery_days / stats.completed_orders) : 0,
            reliability_score:
              stats.completed_orders > 0 ? Math.round((stats.on_time_deliveries / stats.completed_orders) * 100) : 0,
            product_categories: Array.from(stats.product_categories),
            category_count: stats.product_categories.size,
          }))
          .sort((a, b) => b.reliability_score - a.reliability_score)

        return {
          success: true,
          analysis_type,
          data: supplierAnalysis,
          period_days,
          total_suppliers: supplierAnalysis.length,
          message: `Analyzed ${supplierAnalysis.length} suppliers over ${period_days} days`,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: "Failed to analyze supplier performance",
        }
      }
    },
  }),

  // 2. EXPENSE ANALYSIS - Critical for cost management
  getExpenseAnalysis: tool({
    description: "Analyze business expenses by category, trends, and optimization opportunities",
    parameters: z.object({
      analysis_type: z
        .enum(["by_category", "trends", "operating_vs_other", "optimization"])
        .describe("Type of expense analysis"),
      period_days: z.number().min(1).max(365).default(30).describe("Period to analyze (default: 30 days)"),
      category_id: z.string().optional().describe("Specific expense category to analyze"),
    }),
    execute: async ({ analysis_type, period_days, category_id }) => {
      try {
        const supabase = createClient()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - period_days)

        // Get expenses with category information
        let expenseQuery = supabase
          .from("expenses")
          .select(`
          id,
          amount,
          description,
          expense_date,
          category_id,
          expense_categories (
            id,
            name,
            description
          )
        `)
          .gte("expense_date", startDate.toISOString())

        // Get operating expenses
        let operatingQuery = supabase
          .from("operating_expenses")
          .select(`
          id,
          amount,
          description,
          expense_date,
          category_id,
          operating_expense_categories (
            id,
            name,
            description
          )
        `)
          .gte("expense_date", startDate.toISOString())

        if (category_id) {
          expenseQuery = expenseQuery.eq("category_id", category_id)
          operatingQuery = operatingQuery.eq("category_id", category_id)
        }

        const [expensesResult, operatingResult] = await Promise.all([expenseQuery, operatingQuery])

        if (expensesResult.error) throw expensesResult.error
        if (operatingResult.error) throw operatingResult.error

        const expenses = expensesResult.data || []
        const operatingExpenses = operatingResult.data || []

        // Combine and analyze expenses
        const categoryTotals: Record<string, any> = {}
        let totalExpenses = 0
        let totalOperatingExpenses = 0

        // Process regular expenses
        expenses.forEach((expense) => {
          const categoryName = (expense.expense_categories as any)?.name || "Uncategorized"
          const categoryId = expense.category_id || "uncategorized"

          if (!categoryTotals[categoryId]) {
            categoryTotals[categoryId] = {
              category_id: categoryId,
              category_name: categoryName,
              type: "regular",
              total_amount: 0,
              transaction_count: 0,
              avg_amount: 0,
              expenses: [],
            }
          }

          categoryTotals[categoryId].total_amount += expense.amount
          categoryTotals[categoryId].transaction_count += 1
          categoryTotals[categoryId].expenses.push({
            amount: expense.amount,
            description: expense.description,
            date: expense.expense_date,
          })
          totalExpenses += expense.amount
        })

        // Process operating expenses
        operatingExpenses.forEach((expense) => {
          const categoryName = (expense.operating_expense_categories as any)?.name || "Operating - Uncategorized"
          const categoryId = `operating_${expense.category_id || "uncategorized"}`

          if (!categoryTotals[categoryId]) {
            categoryTotals[categoryId] = {
              category_id: categoryId,
              category_name: categoryName,
              type: "operating",
              total_amount: 0,
              transaction_count: 0,
              avg_amount: 0,
              expenses: [],
            }
          }

          categoryTotals[categoryId].total_amount += expense.amount
          categoryTotals[categoryId].transaction_count += 1
          categoryTotals[categoryId].expenses.push({
            amount: expense.amount,
            description: expense.description,
            date: expense.expense_date,
          })
          totalOperatingExpenses += expense.amount
        })

        // Calculate averages and percentages
        const analysisData = Object.values(categoryTotals)
          .map((category: any) => ({
            ...category,
            avg_amount:
              category.transaction_count > 0
                ? Math.round((category.total_amount / category.transaction_count) * 100) / 100
                : 0,
            percentage_of_total:
              totalExpenses + totalOperatingExpenses > 0
                ? Math.round((category.total_amount / (totalExpenses + totalOperatingExpenses)) * 100 * 100) / 100
                : 0,
          }))
          .sort((a, b) => b.total_amount - a.total_amount)

        const summary = {
          total_regular_expenses: Math.round(totalExpenses * 100) / 100,
          total_operating_expenses: Math.round(totalOperatingExpenses * 100) / 100,
          total_all_expenses: Math.round((totalExpenses + totalOperatingExpenses) * 100) / 100,
          regular_vs_operating_ratio:
            totalOperatingExpenses > 0 ? Math.round((totalExpenses / totalOperatingExpenses) * 100) / 100 : "N/A",
          top_expense_category: analysisData[0]?.category_name || "None",
          category_count: analysisData.length,
          avg_daily_expenses: Math.round(((totalExpenses + totalOperatingExpenses) / period_days) * 100) / 100,
        }

        return {
          success: true,
          analysis_type,
          data: analysisData,
          summary,
          period_days,
          message: `Analyzed ${analysisData.length} expense categories totaling $${summary.total_all_expenses} over ${period_days} days`,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: "Failed to analyze expenses",
        }
      }
    },
  }),

  // 3. INVENTORY ACTIVITY TRACKING - Essential for stock management
  getInventoryActivity: tool({
    description: "Track all inventory movements, stock changes, and activity patterns",
    parameters: z.object({
      activity_type: z
        .enum(["all", "stock_in", "stock_out", "adjustments", "low_stock_alerts"])
        .describe("Type of inventory activity"),
      period_days: z.number().min(1).max(90).default(7).describe("Period to analyze (default: 7 days)"),
      product_id: z.string().optional().describe("Specific product to track"),
    }),
    execute: async ({ activity_type, period_days, product_id }) => {
      try {
        const supabase = createClient()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - period_days)

        // Get inventory activity
        let query = supabase
          .from("inventory_activity")
          .select(`
          id,
          product_id,
          activity_type,
          quantity_change,
          previous_quantity,
          new_quantity,
          reason,
          created_at,
          products (
            name,
            barcode,
            categories (name)
          )
        `)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: false })

        if (product_id) {
          query = query.eq("product_id", product_id)
        }

        if (activity_type !== "all") {
          query = query.eq("activity_type", activity_type)
        }

        const { data: activities, error } = await query.limit(100)

        if (error) throw error

        // Also get current stock levels for context
        const { data: currentStock, error: stockError } = await supabase
          .from("products")
          .select("id, name, stock, min_stock")

        if (stockError) throw stockError

        // Analyze activity patterns
        const activitySummary: Record<string, any> = {}
        const productActivity: Record<string, any> = {}

        activities?.forEach((activity) => {
          const actType = activity.activity_type
          const productName = (activity.products as any)?.name || "Unknown Product"
          const productId = activity.product_id

          // Summary by activity type
          if (!activitySummary[actType]) {
            activitySummary[actType] = {
              activity_type: actType,
              total_activities: 0,
              total_quantity_change: 0,
              products_affected: new Set(),
            }
          }
          activitySummary[actType].total_activities += 1
          activitySummary[actType].total_quantity_change += Math.abs(activity.quantity_change || 0)
          activitySummary[actType].products_affected.add(productId)

          // Summary by product
          if (!productActivity[productId]) {
            productActivity[productId] = {
              product_id: productId,
              product_name: productName,
              barcode: (activity.products as any)?.barcode || "N/A",
              category: (activity.products as any)?.categories?.name || "Uncategorized",
              total_activities: 0,
              stock_increases: 0,
              stock_decreases: 0,
              net_change: 0,
              recent_activities: [],
            }
          }

          const prodActivity = productActivity[productId]
          prodActivity.total_activities += 1
          prodActivity.net_change += activity.quantity_change || 0

          if ((activity.quantity_change || 0) > 0) {
            prodActivity.stock_increases += activity.quantity_change
          } else {
            prodActivity.stock_decreases += Math.abs(activity.quantity_change || 0)
          }

          prodActivity.recent_activities.push({
            type: activity.activity_type,
            quantity_change: activity.quantity_change,
            reason: activity.reason,
            date: activity.created_at,
            previous_qty: activity.previous_quantity,
            new_qty: activity.new_quantity,
          })
        })

        // Convert sets to counts and format data
        const formattedActivitySummary = Object.values(activitySummary).map((summary: any) => ({
          ...summary,
          products_affected_count: summary.products_affected.size,
          avg_quantity_per_activity:
            summary.total_activities > 0
              ? Math.round((summary.total_quantity_change / summary.total_activities) * 100) / 100
              : 0,
        }))

        const formattedProductActivity = Object.values(productActivity)
          .sort((a: any, b: any) => b.total_activities - a.total_activities)
          .slice(0, 20)
          .map((product: any) => ({
            ...product,
            recent_activities: product.recent_activities.slice(0, 5), // Show only 5 most recent
          }))

        // Get low stock alerts
        const lowStockProducts =
          currentStock
            ?.filter((product) => product.stock <= product.min_stock)
            .map((product) => ({
              product_id: product.id,
              product_name: product.name,
              current_stock: product.stock,
              min_stock: product.min_stock,
              deficit: product.min_stock - product.stock,
              urgency: product.stock === 0 ? "Critical" : "Low",
            })) || []

        return {
          success: true,
          activity_type,
          data: {
            activity_summary: formattedActivitySummary,
            product_activity: formattedProductActivity,
            low_stock_alerts: lowStockProducts,
            period_summary: {
              total_activities: activities?.length || 0,
              unique_products_affected: Object.keys(productActivity).length,
              most_active_product: formattedProductActivity[0]?.product_name || "None",
              low_stock_count: lowStockProducts.length,
            },
          },
          period_days,
          message: `Found ${activities?.length || 0} inventory activities affecting ${Object.keys(productActivity).length} products over ${period_days} days`,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: "Failed to analyze inventory activity",
        }
      }
    },
  }),

  // 4. PRICE HISTORY ANALYSIS - Valuable for pricing optimization
  getPriceHistoryAnalysis: tool({
    description: "Analyze price changes, trends, and optimization opportunities",
    parameters: z.object({
      analysis_type: z
        .enum(["price_trends", "frequent_changes", "price_optimization", "category_pricing"])
        .describe("Type of price analysis"),
      product_id: z.string().optional().describe("Specific product to analyze"),
      period_days: z.number().min(1).max(365).default(90).describe("Period to analyze (default: 90 days)"),
    }),
    execute: async ({ analysis_type, product_id, period_days }) => {
      try {
        const supabase = createClient()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - period_days)

        // Get price history
        let query = supabase
          .from("price_history")
          .select(`
          id,
          product_id,
          old_price,
          new_price,
          change_reason,
          changed_at,
          products (
            name,
            barcode,
            current_price: price,
            purchase_price,
            categories (name)
          )
        `)
          .gte("changed_at", startDate.toISOString())
          .order("changed_at", { ascending: false })

        if (product_id) {
          query = query.eq("product_id", product_id)
        }

        const { data: priceHistory, error } = await query

        if (error) throw error

        // Analyze price changes by product
        const productPriceAnalysis: Record<string, any> = {}

        priceHistory?.forEach((change) => {
          const productId = change.product_id
          const productName = (change.products as any)?.name || "Unknown Product"
          const currentPrice = (change.products as any)?.current_price || 0
          const purchasePrice = (change.products as any)?.purchase_price || 0

          if (!productPriceAnalysis[productId]) {
            productPriceAnalysis[productId] = {
              product_id: productId,
              product_name: productName,
              barcode: (change.products as any)?.barcode || "N/A",
              category: (change.products as any)?.categories?.name || "Uncategorized",
              current_price: currentPrice,
              purchase_price: purchasePrice,
              current_profit_margin:
                purchasePrice > 0 ? Math.round(((currentPrice - purchasePrice) / currentPrice) * 100 * 100) / 100 : 0,
              price_changes: [],
              total_changes: 0,
              price_increases: 0,
              price_decreases: 0,
              total_increase_amount: 0,
              total_decrease_amount: 0,
              price_volatility: 0,
            }
          }

          const analysis = productPriceAnalysis[productId]
          analysis.total_changes += 1

          const priceChange = (change.new_price || 0) - (change.old_price || 0)
          if (priceChange > 0) {
            analysis.price_increases += 1
            analysis.total_increase_amount += priceChange
          } else if (priceChange < 0) {
            analysis.price_decreases += 1
            analysis.total_decrease_amount += Math.abs(priceChange)
          }

          analysis.price_changes.push({
            old_price: change.old_price,
            new_price: change.new_price,
            change_amount: priceChange,
            change_percentage:
              change.old_price > 0 ? Math.round((priceChange / change.old_price) * 100 * 100) / 100 : 0,
            reason: change.change_reason,
            date: change.changed_at,
          })
        })

        // Calculate volatility and format results
        const formattedAnalysis = Object.values(productPriceAnalysis)
          .map((product: any) => {
            // Calculate price volatility (standard deviation of price changes)
            if (product.price_changes.length > 1) {
              const changes = product.price_changes.map((c: any) => c.change_percentage)
              const mean = changes.reduce((sum: number, change: number) => sum + change, 0) / changes.length
              const variance =
                changes.reduce((sum: number, change: number) => sum + Math.pow(change - mean, 2), 0) / changes.length
              product.price_volatility = Math.round(Math.sqrt(variance) * 100) / 100
            }

            return {
              ...product,
              avg_price_increase:
                product.price_increases > 0
                  ? Math.round((product.total_increase_amount / product.price_increases) * 100) / 100
                  : 0,
              avg_price_decrease:
                product.price_decreases > 0
                  ? Math.round((product.total_decrease_amount / product.price_decreases) * 100) / 100
                  : 0,
              net_price_change: Math.round((product.total_increase_amount - product.total_decrease_amount) * 100) / 100,
              price_changes: product.price_changes.slice(0, 10), // Limit to 10 most recent changes
            }
          })
          .sort((a, b) => b.total_changes - a.total_changes)

        // Generate insights based on analysis type
        let insights: any = {}
        switch (analysis_type) {
          case "price_trends":
            insights = {
              trending_up: formattedAnalysis.filter((p) => p.net_price_change > 0).slice(0, 5),
              trending_down: formattedAnalysis.filter((p) => p.net_price_change < 0).slice(0, 5),
              most_volatile: formattedAnalysis.sort((a, b) => b.price_volatility - a.price_volatility).slice(0, 5),
            }
            break
          case "frequent_changes":
            insights = {
              most_changed: formattedAnalysis.slice(0, 10),
              avg_changes_per_product:
                formattedAnalysis.length > 0
                  ? Math.round(
                      (formattedAnalysis.reduce((sum, p) => sum + p.total_changes, 0) / formattedAnalysis.length) * 100,
                    ) / 100
                  : 0,
            }
            break
          case "price_optimization":
            insights = {
              low_margin_products: formattedAnalysis.filter((p) => p.current_profit_margin < 20).slice(0, 10),
              high_margin_products: formattedAnalysis.filter((p) => p.current_profit_margin > 50).slice(0, 10),
              optimization_candidates: formattedAnalysis
                .filter((p) => p.price_volatility > 10 || p.current_profit_margin < 15)
                .slice(0, 10),
            }
            break
        }

        return {
          success: true,
          analysis_type,
          data: formattedAnalysis.slice(0, 20), // Limit to top 20 products
          insights,
          summary: {
            total_products_with_changes: formattedAnalysis.length,
            total_price_changes: priceHistory?.length || 0,
            avg_changes_per_product:
              formattedAnalysis.length > 0
                ? Math.round(((priceHistory?.length || 0) / formattedAnalysis.length) * 100) / 100
                : 0,
            period_days,
          },
          message: `Analyzed price history for ${formattedAnalysis.length} products with ${priceHistory?.length || 0} total changes over ${period_days} days`,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: "Failed to analyze price history",
        }
      }
    },
  }),

  // 5. BUSINESS INTELLIGENCE DASHBOARD - Comprehensive overview
  getBusinessIntelligence: tool({
    description: "Get comprehensive business intelligence including KPIs, trends, and actionable insights",
    parameters: z.object({
      dashboard_type: z
        .enum(["overview", "financial", "inventory", "operational", "growth"])
        .describe("Type of business intelligence dashboard"),
      period_days: z.number().min(1).max(365).default(30).describe("Period to analyze (default: 30 days)"),
      compare_previous: z.boolean().default(true).describe("Compare with previous period"),
    }),
    execute: async ({ dashboard_type, period_days, compare_previous }) => {
      try {
        const supabase = createClient()
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - period_days)

        // Previous period for comparison
        const prevEndDate = new Date(startDate)
        const prevStartDate = new Date()
        prevStartDate.setDate(prevEndDate.getDate() - period_days)

        // Fetch all necessary data in parallel
        const [
          salesResult,
          expensesResult,
          operatingExpensesResult,
          productsResult,
          inventoryResult,
          suppliersResult,
          prevSalesResult,
        ] = await Promise.all([
          // Current period sales
          supabase
            .from("sales")
            .select(`
            id, total, created_at,
            sale_items (quantity, price, products (purchase_price))
          `)
            .gte("created_at", startDate.toISOString())
            .lte("created_at", endDate.toISOString()),

          // Current period expenses
          supabase
            .from("expenses")
            .select("amount, expense_date")
            .gte("expense_date", startDate.toISOString())
            .lte("expense_date", endDate.toISOString()),

          // Current period operating expenses
          supabase
            .from("operating_expenses")
            .select("amount, expense_date")
            .gte("expense_date", startDate.toISOString())
            .lte("expense_date", endDate.toISOString()),

          // Products data
          supabase
            .from("products")
            .select("id, name, stock, min_stock, price, purchase_price"),

          // Inventory activity
          supabase
            .from("inventory_activity")
            .select("activity_type, quantity_change, created_at")
            .gte("created_at", startDate.toISOString()),

          // Suppliers
          supabase
            .from("suppliers")
            .select("id, name"),

          // Previous period sales for comparison
          compare_previous
            ? supabase
                .from("sales")
                .select("id, total, created_at")
                .gte("created_at", prevStartDate.toISOString())
                .lte("created_at", prevEndDate.toISOString())
            : Promise.resolve({ data: [], error: null }),
        ])

        if (salesResult.error) throw salesResult.error
        if (expensesResult.error) throw expensesResult.error
        if (operatingExpensesResult.error) throw operatingExpensesResult.error
        if (productsResult.error) throw productsResult.error

        const sales = salesResult.data || []
        const expenses = expensesResult.data || []
        const operatingExpenses = operatingExpensesResult.data || []
        const products = productsResult.data || []
        const inventoryActivity = inventoryResult.data || []
        const suppliers = suppliersResult.data || []
        const prevSales = prevSalesResult.data || []

        // Calculate key metrics
        const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0)
        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
        const totalOperatingExpenses = operatingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
        const totalCosts = totalExpenses + totalOperatingExpenses

        // Calculate COGS (Cost of Goods Sold)
        let totalCOGS = 0
        sales.forEach((sale) => {
          sale.sale_items?.forEach((item: any) => {
            const purchasePrice = item.products?.purchase_price || 0
            totalCOGS += purchasePrice * (item.quantity || 0)
          })
        })

        const grossProfit = totalRevenue - totalCOGS
        const netProfit = grossProfit - totalCosts
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

        // Inventory metrics
        const totalProducts = products.length
        const inStockProducts = products.filter((p) => p.stock > 0).length
        const lowStockProducts = products.filter((p) => p.stock <= p.min_stock).length
        const outOfStockProducts = products.filter((p) => p.stock === 0).length
        const totalInventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)

        // Sales metrics
        const totalTransactions = sales.length
        const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
        const totalItemsSold = sales.reduce((sum, sale) => {
          return sum + (sale.sale_items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0)
        }, 0)

        // Previous period comparison
        let comparison: any = null
        if (compare_previous && prevSales.length > 0) {
          const prevRevenue = prevSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
          const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
          const transactionGrowth =
            prevSales.length > 0 ? ((totalTransactions - prevSales.length) / prevSales.length) * 100 : 0

          comparison = {
            revenue_growth: Math.round(revenueGrowth * 100) / 100,
            transaction_growth: Math.round(transactionGrowth * 100) / 100,
            prev_period_revenue: Math.round(prevRevenue * 100) / 100,
            prev_period_transactions: prevSales.length,
          }
        }

        // Build dashboard based on type
        const dashboardData: any = {
          period: {
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
            days: period_days,
          },
          key_metrics: {
            total_revenue: Math.round(totalRevenue * 100) / 100,
            gross_profit: Math.round(grossProfit * 100) / 100,
            net_profit: Math.round(netProfit * 100) / 100,
            gross_margin: Math.round(grossMargin * 100) / 100,
            net_margin: Math.round(netMargin * 100) / 100,
            total_transactions: totalTransactions,
            avg_transaction_value: Math.round(avgTransactionValue * 100) / 100,
            total_items_sold: totalItemsSold,
          },
          inventory_health: {
            total_products: totalProducts,
            in_stock: inStockProducts,
            low_stock: lowStockProducts,
            out_of_stock: outOfStockProducts,
            inventory_value: Math.round(totalInventoryValue * 100) / 100,
            stock_turnover_rate:
              totalInventoryValue > 0 ? Math.round((totalCOGS / totalInventoryValue) * 100) / 100 : 0,
          },
          operational_metrics: {
            total_suppliers: suppliers.length,
            inventory_activities: inventoryActivity.length,
            avg_daily_revenue: Math.round((totalRevenue / period_days) * 100) / 100,
            avg_daily_transactions: Math.round((totalTransactions / period_days) * 100) / 100,
          },
        }

        if (comparison) {
          dashboardData.period_comparison = comparison
        }

        // Add specific insights based on dashboard type
        switch (dashboard_type) {
          case "financial":
            dashboardData.financial_breakdown = {
              revenue_sources: "Sales", // Could be expanded with multiple revenue streams
              cost_breakdown: {
                cogs: Math.round(totalCOGS * 100) / 100,
                operating_expenses: Math.round(totalOperatingExpenses * 100) / 100,
                other_expenses: Math.round(totalExpenses * 100) / 100,
              },
              profitability_ratios: {
                gross_margin: Math.round(grossMargin * 100) / 100,
                net_margin: Math.round(netMargin * 100) / 100,
                expense_ratio: totalRevenue > 0 ? Math.round((totalCosts / totalRevenue) * 100 * 100) / 100 : 0,
              },
            }
            break
          case "inventory":
            dashboardData.inventory_insights = {
              stock_health_score: Math.round((inStockProducts / totalProducts) * 100 * 100) / 100,
              restock_urgency: lowStockProducts,
              inventory_efficiency:
                totalInventoryValue > 0 ? Math.round((totalRevenue / totalInventoryValue) * 100) / 100 : 0,
              top_movers: "Requires sales item analysis", // Could be expanded
            }
            break
          case "growth":
            dashboardData.growth_indicators = {
              revenue_trend: comparison
                ? comparison.revenue_growth > 0
                  ? "Growing"
                  : "Declining"
                : "No comparison data",
              customer_acquisition: "Requires customer tracking", // Could be expanded
              market_expansion: "Requires market data", // Could be expanded
              efficiency_improvements: inventoryActivity.length > 0 ? "Active inventory management" : "Low activity",
            }
            break
        }

        // Generate actionable insights
        const insights = []
        if (netMargin < 10) insights.push("Net profit margin is below 10% - consider cost optimization")
        if (lowStockProducts > totalProducts * 0.2) insights.push(`${lowStockProducts} products need restocking`)
        if (avgTransactionValue < 20) insights.push("Average transaction value is low - consider upselling strategies")
        if (comparison && comparison.revenue_growth < 0) insights.push("Revenue declined compared to previous period")

        dashboardData.actionable_insights = insights

        return {
          success: true,
          dashboard_type,
          data: dashboardData,
          message: `Generated ${dashboard_type} business intelligence dashboard for ${period_days} days`,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: "Failed to generate business intelligence dashboard",
        }
      }
    },
  }),
}
