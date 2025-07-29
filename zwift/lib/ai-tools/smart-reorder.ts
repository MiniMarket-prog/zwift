import { tool } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabaseAI"
import { registerTool } from "./index"

// Smart Reorder Suggestions Tool
const getSmartReorderSuggestions = tool({
  description:
    "Get intelligent reorder suggestions based on sales velocity, stock levels, profit margins, and seasonal trends",
  parameters: z.object({
    analysis_period_days: z
      .number()
      .min(7)
      .max(90)
      .default(30)
      .describe("Days to analyze for sales velocity (default: 30)"),
    budget_limit: z.number().optional().describe("Maximum budget for reordering (optional)"),
    priority_filter: z
      .enum(["all", "high_profit", "fast_moving", "critical_stock"])
      .default("all")
      .describe("Filter suggestions by priority"),
    include_seasonal_analysis: z.boolean().default(true).describe("Include seasonal trend analysis"),
    max_suggestions: z.number().min(5).max(50).default(20).describe("Maximum number of suggestions to return"),
  }),
  execute: async ({
    analysis_period_days,
    budget_limit,
    priority_filter,
    include_seasonal_analysis,
    max_suggestions,
  }) => {
    try {
      console.log(`Executing getSmartReorderSuggestions tool with ${analysis_period_days} days analysis...`)
      const supabase = createClient()

      // Get all products with their current stock and pricing info
      const { data: products, error: productsError } = await supabase.from("products").select(`
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

      if (productsError) throw productsError

      if (!products || products.length === 0) {
        return {
          success: false,
          message: "No products found in inventory",
        }
      }

      // Get sales data for the analysis period
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - analysis_period_days)

      const { data: salesData, error: salesError } = await supabase
        .from("sale_items")
        .select(`
          product_id,
          quantity,
          price,
          sales!inner (
            created_at
          )
        `)
        .gte("sales.created_at", startDate.toISOString())

      if (salesError) throw salesError

      // Calculate sales velocity for each product
      const productSalesMap: Record<string, { totalSold: number; totalRevenue: number; salesCount: number }> = {}

      salesData?.forEach((item: any) => {
        const productId = item.product_id
        if (!productSalesMap[productId]) {
          productSalesMap[productId] = { totalSold: 0, totalRevenue: 0, salesCount: 0 }
        }
        productSalesMap[productId].totalSold += item.quantity
        productSalesMap[productId].totalRevenue += item.quantity * item.price
        productSalesMap[productId].salesCount += 1
      })

      // Generate reorder suggestions
      const suggestions = products
        .map((product: any) => {
          const salesData = productSalesMap[product.id] || { totalSold: 0, totalRevenue: 0, salesCount: 0 }
          const dailyVelocity = salesData.totalSold / analysis_period_days
          const currentStock = product.stock || 0
          const minStock = product.min_stock || 0
          const purchasePrice = product.purchase_price || 0
          const sellingPrice = product.price || 0

          // Calculate key metrics
          const daysOfStockRemaining = dailyVelocity > 0 ? currentStock / dailyVelocity : Number.POSITIVE_INFINITY
          const stockDeficit = Math.max(0, minStock - currentStock)
          const profitMargin = sellingPrice > 0 ? ((sellingPrice - purchasePrice) / sellingPrice) * 100 : 0
          const profitPerUnit = sellingPrice - purchasePrice

          // Smart reorder quantity calculation
          let suggestedOrderQty = 0
          let urgencyScore = 0
          const reasonCodes: string[] = []

          // Base reorder quantity on sales velocity and minimum stock
          if (dailyVelocity > 0) {
            // Order enough for 2-4 weeks based on velocity, plus safety stock
            const weeksOfStock = dailyVelocity > 1 ? 2 : dailyVelocity > 0.5 ? 3 : 4
            const velocityBasedQty = Math.ceil(dailyVelocity * 7 * weeksOfStock)
            suggestedOrderQty = Math.max(velocityBasedQty, stockDeficit)
          } else {
            // For products with no recent sales, just meet minimum stock
            suggestedOrderQty = stockDeficit
          }

          // Adjust based on current situation
          if (currentStock === 0) {
            urgencyScore += 100
            reasonCodes.push("OUT_OF_STOCK")
            suggestedOrderQty = Math.max(suggestedOrderQty, minStock * 2) // Double min stock for out of stock
          } else if (currentStock < minStock) {
            urgencyScore += 50
            reasonCodes.push("BELOW_MIN_STOCK")
          }

          if (daysOfStockRemaining < 7 && dailyVelocity > 0) {
            urgencyScore += 75
            reasonCodes.push("FAST_MOVING")
          } else if (daysOfStockRemaining < 14 && dailyVelocity > 0) {
            urgencyScore += 40
            reasonCodes.push("MODERATE_VELOCITY")
          }

          if (profitMargin > 30) {
            urgencyScore += 20
            reasonCodes.push("HIGH_PROFIT")
          } else if (profitMargin > 15) {
            urgencyScore += 10
            reasonCodes.push("GOOD_PROFIT")
          }

          // Only suggest if there's a real need
          if (suggestedOrderQty === 0 || (currentStock >= minStock && daysOfStockRemaining > 30)) {
            return null
          }

          const orderValue = suggestedOrderQty * purchasePrice
          const expectedProfit = suggestedOrderQty * profitPerUnit

          return {
            product_id: product.id,
            product_name: product.name,
            barcode: product.barcode || "No barcode",
            category: (product.categories as any)?.name || "Uncategorized",
            current_stock: currentStock,
            min_stock: minStock,
            suggested_order_qty: suggestedOrderQty,
            purchase_price: purchasePrice,
            selling_price: sellingPrice,
            order_value: Math.round(orderValue * 100) / 100,
            expected_profit: Math.round(expectedProfit * 100) / 100,
            profit_margin: Math.round(profitMargin * 100) / 100,
            daily_velocity: Math.round(dailyVelocity * 100) / 100,
            days_of_stock_remaining:
              daysOfStockRemaining === Number.POSITIVE_INFINITY ? "No recent sales" : Math.round(daysOfStockRemaining),
            urgency_score: urgencyScore,
            reason_codes: reasonCodes,
            priority_level:
              urgencyScore > 80 ? "Critical" : urgencyScore > 50 ? "High" : urgencyScore > 25 ? "Medium" : "Low",
            total_sold_in_period: salesData.totalSold,
            revenue_in_period: Math.round(salesData.totalRevenue * 100) / 100,
          }
        })
        .filter(Boolean) // Remove null entries
        .sort((a: any, b: any) => b.urgency_score - a.urgency_score) // Sort by urgency

      // Apply priority filter
      let filteredSuggestions = suggestions as any[]
      if (priority_filter !== "all") {
        switch (priority_filter) {
          case "high_profit":
            filteredSuggestions = suggestions.filter((s: any) => s.profit_margin > 20)
            break
          case "fast_moving":
            filteredSuggestions = suggestions.filter((s: any) => s.daily_velocity > 0.5)
            break
          case "critical_stock":
            filteredSuggestions = suggestions.filter(
              (s: any) => s.priority_level === "Critical" || s.priority_level === "High",
            )
            break
        }
      }

      // Apply budget limit if specified
      if (budget_limit) {
        let runningTotal = 0
        filteredSuggestions = filteredSuggestions.filter((suggestion: any) => {
          if (runningTotal + suggestion.order_value <= budget_limit) {
            runningTotal += suggestion.order_value
            return true
          }
          return false
        })
      }

      // Limit results
      const finalSuggestions = filteredSuggestions.slice(0, max_suggestions)

      // Calculate summary statistics
      const totalOrderValue = finalSuggestions.reduce((sum: number, s: any) => sum + s.order_value, 0)
      const totalExpectedProfit = finalSuggestions.reduce((sum: number, s: any) => sum + s.expected_profit, 0)
      const criticalCount = finalSuggestions.filter((s: any) => s.priority_level === "Critical").length
      const highCount = finalSuggestions.filter((s: any) => s.priority_level === "High").length

      // Generate seasonal insights if requested
      let seasonalInsights = null
      if (include_seasonal_analysis && salesData && salesData.length > 0) {
        const currentMonth = new Date().getMonth()
        const seasonalCategories: Record<string, number> = {}

        finalSuggestions.forEach((suggestion: any) => {
          const category = suggestion.category
          seasonalCategories[category] = (seasonalCategories[category] || 0) + 1
        })

        seasonalInsights = {
          current_month: currentMonth + 1,
          top_categories_to_restock: Object.entries(seasonalCategories)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([category, count]) => ({ category, suggested_products: count })),
          seasonal_note:
            currentMonth >= 10 || currentMonth <= 2
              ? "Winter season - consider stocking warm beverages, comfort foods, and seasonal items"
              : currentMonth >= 3 && currentMonth <= 5
                ? "Spring season - fresh products and cleaning supplies may see increased demand"
                : currentMonth >= 6 && currentMonth <= 8
                  ? "Summer season - cold beverages, ice cream, and fresh fruits typically perform well"
                  : "Fall season - back-to-school items and comfort foods may see increased demand",
        }
      }

      return {
        success: true,
        data: finalSuggestions,
        summary: {
          total_suggestions: finalSuggestions.length,
          total_order_value: Math.round(totalOrderValue * 100) / 100,
          total_expected_profit: Math.round(totalExpectedProfit * 100) / 100,
          expected_profit_margin: totalOrderValue > 0 ? Math.round((totalExpectedProfit / totalOrderValue) * 100) : 0,
          priority_breakdown: {
            critical: criticalCount,
            high: highCount,
            medium: finalSuggestions.filter((s: any) => s.priority_level === "Medium").length,
            low: finalSuggestions.filter((s: any) => s.priority_level === "Low").length,
          },
          budget_used: budget_limit ? Math.round(totalOrderValue * 100) / 100 : null,
          budget_remaining: budget_limit ? Math.round((budget_limit - totalOrderValue) * 100) / 100 : null,
        },
        seasonal_insights: seasonalInsights,
        analysis_period: {
          days: analysis_period_days,
          start_date: startDate.toISOString().split("T")[0],
          end_date: new Date().toISOString().split("T")[0],
        },
        filters_applied: {
          priority_filter,
          budget_limit,
          max_suggestions,
        },
        recommendations: [
          "Prioritize Critical and High priority items first",
          "Consider ordering fast-moving, high-profit items in larger quantities",
          "Review seasonal trends for category-specific insights",
          totalOrderValue > (budget_limit || 0)
            ? "Consider increasing budget or prioritizing higher-profit items"
            : null,
          criticalCount > 5 ? "You have many critical stock situations - consider emergency restocking" : null,
        ].filter(Boolean),
        message: `Generated ${finalSuggestions.length} smart reorder suggestions with total value of $${Math.round(totalOrderValue * 100) / 100} and expected profit of $${Math.round(totalExpectedProfit * 100) / 100}`,
      }
    } catch (error: any) {
      console.error("Error in getSmartReorderSuggestions tool:", error)
      return {
        success: false,
        error: error.message,
        message: "Failed to generate smart reorder suggestions",
      }
    }
  },
})

// Inventory Health Score Tool
const getInventoryHealthScore = tool({
  description: "Calculate an overall inventory health score with detailed breakdown and improvement suggestions",
  parameters: z.object({
    include_recommendations: z.boolean().default(true).describe("Include specific improvement recommendations"),
  }),
  execute: async ({ include_recommendations }) => {
    try {
      console.log("Executing getInventoryHealthScore tool...")
      const supabase = createClient()

      // Get all products
      const { data: products, error: productsError } = await supabase.from("products").select(`
          id,
          name,
          stock,
          min_stock,
          price,
          purchase_price,
          barcode,
          categories (name)
        `)

      if (productsError) throw productsError

      if (!products || products.length === 0) {
        return {
          success: false,
          message: "No products found for health score calculation",
        }
      }

      // Get recent sales data (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: recentSales, error: salesError } = await supabase
        .from("sale_items")
        .select(`
          product_id,
          quantity,
          sales!inner (created_at)
        `)
        .gte("sales.created_at", thirtyDaysAgo.toISOString())

      if (salesError) throw salesError

      // Calculate metrics
      const totalProducts = products.length
      const inStock = products.filter((p) => p.stock > 0).length
      const outOfStock = products.filter((p) => p.stock === 0).length
      const belowMinStock = products.filter((p) => p.stock < p.min_stock).length
      const withBarcodes = products.filter((p) => p.barcode && p.barcode.trim() !== "").length
      const withPurchasePrices = products.filter((p) => p.purchase_price && p.purchase_price > 0).length
      const withValidPrices = products.filter((p) => p.price && p.price > 0).length

      // Sales velocity analysis
      const productSalesMap: Record<string, number> = {}
      recentSales?.forEach((sale: any) => {
        productSalesMap[sale.product_id] = (productSalesMap[sale.product_id] || 0) + sale.quantity
      })

      const productsWithRecentSales = Object.keys(productSalesMap).length
      const deadStock = products.filter((p) => !productSalesMap[p.id] && p.stock > 0).length

      // Calculate individual scores (0-100)
      const stockAvailabilityScore = Math.round((inStock / totalProducts) * 100)
      const stockLevelScore = Math.round(((totalProducts - belowMinStock) / totalProducts) * 100)
      const dataQualityScore = Math.round(
        ((withBarcodes + withPurchasePrices + withValidPrices) / (totalProducts * 3)) * 100,
      )
      const salesVelocityScore = Math.round((productsWithRecentSales / totalProducts) * 100)
      const inventoryTurnoverScore = Math.round(((totalProducts - deadStock) / totalProducts) * 100)

      // Calculate weighted overall score
      const overallScore = Math.round(
        stockAvailabilityScore * 0.25 +
          stockLevelScore * 0.25 +
          dataQualityScore * 0.2 +
          salesVelocityScore * 0.15 +
          inventoryTurnoverScore * 0.15,
      )

      // Determine health grade
      let healthGrade = "F"
      let healthStatus = "Critical"
      if (overallScore >= 90) {
        healthGrade = "A+"
        healthStatus = "Excellent"
      } else if (overallScore >= 85) {
        healthGrade = "A"
        healthStatus = "Very Good"
      } else if (overallScore >= 80) {
        healthGrade = "B+"
        healthStatus = "Good"
      } else if (overallScore >= 75) {
        healthGrade = "B"
        healthStatus = "Above Average"
      } else if (overallScore >= 70) {
        healthGrade = "C+"
        healthStatus = "Average"
      } else if (overallScore >= 60) {
        healthGrade = "C"
        healthStatus = "Below Average"
      } else if (overallScore >= 50) {
        healthGrade = "D"
        healthStatus = "Poor"
      }

      const healthScore = {
        overall_score: overallScore,
        health_grade: healthGrade,
        health_status: healthStatus,
        detailed_scores: {
          stock_availability: {
            score: stockAvailabilityScore,
            description: "Percentage of products currently in stock",
            status: stockAvailabilityScore >= 85 ? "Good" : stockAvailabilityScore >= 70 ? "Fair" : "Poor",
          },
          stock_levels: {
            score: stockLevelScore,
            description: "Percentage of products at or above minimum stock",
            status: stockLevelScore >= 85 ? "Good" : stockLevelScore >= 70 ? "Fair" : "Poor",
          },
          data_quality: {
            score: dataQualityScore,
            description: "Completeness of product data (barcodes, prices)",
            status: dataQualityScore >= 85 ? "Good" : dataQualityScore >= 70 ? "Fair" : "Poor",
          },
          sales_velocity: {
            score: salesVelocityScore,
            description: "Percentage of products with recent sales activity",
            status: salesVelocityScore >= 70 ? "Good" : salesVelocityScore >= 50 ? "Fair" : "Poor",
          },
          inventory_turnover: {
            score: inventoryTurnoverScore,
            description: "Percentage of products moving (not dead stock)",
            status: inventoryTurnoverScore >= 80 ? "Good" : inventoryTurnoverScore >= 65 ? "Fair" : "Poor",
          },
        },
        key_metrics: {
          total_products: totalProducts,
          in_stock: inStock,
          out_of_stock: outOfStock,
          below_min_stock: belowMinStock,
          dead_stock_items: deadStock,
          data_completeness: Math.round(((withBarcodes + withPurchasePrices) / (totalProducts * 2)) * 100),
          products_with_recent_sales: productsWithRecentSales,
        },
      }

      // Generate recommendations if requested
      const recommendations: string[] = []
      if (include_recommendations) {
        if (outOfStock > totalProducts * 0.1) {
          recommendations.push(
            `🚨 ${outOfStock} products are out of stock (${Math.round((outOfStock / totalProducts) * 100)}%) - prioritize restocking`,
          )
        }
        if (belowMinStock > totalProducts * 0.15) {
          recommendations.push(`⚠️ ${belowMinStock} products below minimum stock - review reorder points`)
        }
        if (deadStock > totalProducts * 0.2) {
          recommendations.push(`📦 ${deadStock} products haven't sold recently - consider promotions or discontinuing`)
        }
        if (withBarcodes < totalProducts * 0.8) {
          recommendations.push(`🏷️ Add barcodes to ${totalProducts - withBarcodes} products for better tracking`)
        }
        if (withPurchasePrices < totalProducts * 0.7) {
          recommendations.push(
            `💰 Add purchase prices to ${totalProducts - withPurchasePrices} products for profit analysis`,
          )
        }
        if (salesVelocityScore < 60) {
          recommendations.push(`📈 Low sales activity - review pricing, promotions, and product mix`)
        }
        if (overallScore < 70) {
          recommendations.push(`🎯 Focus on top 3 lowest scoring areas for maximum improvement`)
        }
      }

      return {
        success: true,
        data: healthScore,
        recommendations: recommendations,
        improvement_priority: [
          { area: "Stock Availability", score: stockAvailabilityScore, impact: "High" },
          { area: "Stock Levels", score: stockLevelScore, impact: "High" },
          { area: "Data Quality", score: dataQualityScore, impact: "Medium" },
          { area: "Sales Velocity", score: salesVelocityScore, impact: "Medium" },
          { area: "Inventory Turnover", score: inventoryTurnoverScore, impact: "Medium" },
        ]
          .sort((a, b) => a.score - b.score)
          .slice(0, 3),
        message: `Inventory health score: ${overallScore}/100 (${healthGrade}) - ${healthStatus}`,
      }
    } catch (error: any) {
      console.error("Error in getInventoryHealthScore tool:", error)
      return {
        success: false,
        error: error.message,
        message: "Failed to calculate inventory health score",
      }
    }
  },
})

// Register smart reorder tools
registerTool("getSmartReorderSuggestions", getSmartReorderSuggestions)
registerTool("getInventoryHealthScore", getInventoryHealthScore)
