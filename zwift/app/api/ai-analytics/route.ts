import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-client"

export async function POST(request: NextRequest) {
  try {
    const { currentTime } = await request.json()
    const supabase = createClient()

    // Fetch real sales data from your database
    const { data: recentSales, error: salesError } = await supabase
      .from("sales")
      .select(`
        id,
        created_at,
        total,
        payment_method,
        items:sale_items(
          id,
          product_id,
          quantity,
          price,
          discount,
          product:products(
            id,
            name,
            category_id,
            purchase_price
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50)

    if (salesError) {
      console.error("Error fetching sales:", salesError)
      return NextResponse.json({ error: "Failed to fetch sales data" }, { status: 500 })
    }

    // Get real categories from database
    const { data: categories, error: categoriesError } = await supabase.from("categories").select("id, name")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
    }

    // Create category mapping
    const categoryMap = new Map(categories?.map((cat) => [cat.id, cat.name]) || [])

    // Calculate predicted daily revenue based on current sales pattern
    const currentHour = new Date(currentTime || new Date()).getHours()
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const todaySales = (recentSales || []).filter((sale: any) => {
      const saleDate = new Date(sale.created_at)
      return saleDate >= todayStart
    })

    const currentRevenue = todaySales.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0)
    const predictedDailyRevenue = currentHour > 0 ? currentRevenue * (24 / currentHour) : currentRevenue * 24

    // Determine peak hour from real sales data
    const hourlyData: { [key: number]: number } = {}
    ;(recentSales || []).forEach((sale: any) => {
      const hour = new Date(sale.created_at).getHours()
      hourlyData[hour] = (hourlyData[hour] || 0) + 1
    })

    const peakHourEntry = Object.entries(hourlyData).sort(([, a], [, b]) => (b as number) - (a as number))[0]
    const peakHour = peakHourEntry ? `${peakHourEntry[0]}:00` : "12:00"

    // Analyze top selling category using real data
    const categoryData: { [key: string]: number } = {}
    ;(recentSales || []).forEach((sale: any) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          if (item.product && item.product.category_id) {
            const categoryName = categoryMap.get(item.product.category_id) || "Uncategorized"
            categoryData[categoryName] = (categoryData[categoryName] || 0) + (item.quantity || 1)
          } else {
            // Handle items without category
            categoryData["Uncategorized"] = (categoryData["Uncategorized"] || 0) + (item.quantity || 1)
          }
        })
      }
    })

    // Get the top selling category
    const topCategoryEntry = Object.entries(categoryData).sort(([, a], [, b]) => (b as number) - (a as number))[0]
    const topSellingCategory = topCategoryEntry && topCategoryEntry[1] > 0 ? topCategoryEntry[0] : "No Sales Yet"

    // Calculate profit margin trend (simplified but more realistic)
    const recentProfits = (recentSales || []).slice(0, 5).map((sale: any) => {
      let saleProfit = 0
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          if (item.product && item.product.purchase_price && typeof item.product.purchase_price === "number") {
            const discount = item.discount || 0
            const priceAfterDiscount = item.price * (1 - discount / 100)
            const profit = (priceAfterDiscount - item.product.purchase_price) * item.quantity
            saleProfit += profit
          }
        })
      }
      return saleProfit
    })

    const olderProfits = (recentSales || []).slice(5, 10).map((sale: any) => {
      let saleProfit = 0
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          if (item.product && item.product.purchase_price && typeof item.product.purchase_price === "number") {
            const discount = item.discount || 0
            const priceAfterDiscount = item.price * (1 - discount / 100)
            const profit = (priceAfterDiscount - item.product.purchase_price) * item.quantity
            saleProfit += profit
          }
        })
      }
      return saleProfit
    })

    const avgRecentProfit =
      recentProfits.length > 0 ? recentProfits.reduce((a: number, b: number) => a + b, 0) / recentProfits.length : 0
    const avgOlderProfit =
      olderProfits.length > 0 ? olderProfits.reduce((a: number, b: number) => a + b, 0) / olderProfits.length : 0

    let profitMarginTrend: "up" | "down" | "stable" = "stable"
    if (avgRecentProfit > avgOlderProfit * 1.1) {
      profitMarginTrend = "up"
    } else if (avgRecentProfit < avgOlderProfit * 0.9) {
      profitMarginTrend = "down"
    }

    // Generate inventory alerts using real product data
    const { data: lowStockProducts, error: stockError } = await supabase
      .from("products")
      .select("id, name, stock, min_stock, category_id")
      .lt("stock", 10)
      .gt("stock", 0)
      .limit(5)

    if (stockError) {
      console.error("Error fetching low stock products:", stockError)
    }

    const inventoryAlerts = (lowStockProducts || []).map((product) => ({
      product: {
        ...product,
        category_name: categoryMap.get(product.category_id) || "Uncategorized",
      },
      daysUntilStockout: Math.ceil(product.stock / 2), // Simplified calculation
      recommendedReorder: Math.max(product.min_stock || 10, product.stock * 3),
    }))

    // Generate insights based on real data
    const totalSales = (recentSales || []).length
    const totalRevenue = (recentSales || []).reduce((sum: number, sale: any) => sum + (sale.total || 0), 0)

    const insights = [
      `Peak sales hour is ${peakHour} - consider staffing accordingly`,
      totalSales > 0 && topSellingCategory !== "No Sales Yet"
        ? `${topSellingCategory} category is your top performer`
        : "No sales data available yet - start making sales to see insights",
      `Predicted daily revenue: MAD ${predictedDailyRevenue.toFixed(2)}`,
      inventoryAlerts.length > 0
        ? `${inventoryAlerts.length} products need restocking soon`
        : "Inventory levels are healthy",
      totalSales > 0
        ? `You have ${totalSales} sales totaling MAD ${totalRevenue.toFixed(2)}`
        : "Start making sales to unlock AI insights",
    ]

    // Add category breakdown insight
    if (Object.keys(categoryData).length > 0) {
      const categoryBreakdown = Object.entries(categoryData)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([name, count]) => `${name}: ${count} items`)
        .join(", ")

      insights.push(`Top categories by volume: ${categoryBreakdown}`)
    }

    console.log("AI Analytics Debug:", {
      totalSales,
      totalRevenue,
      todaySales: todaySales.length,
      currentRevenue,
      predictedDailyRevenue,
      topSellingCategory,
      categoryData,
      recentSalesCount: (recentSales || []).length,
    })

    return NextResponse.json({
      predictedDailyRevenue,
      peakHour,
      topSellingCategory,
      profitMarginTrend,
      inventoryAlerts,
      insights,
      categoryBreakdown: categoryData, // Include for debugging
      totalCategories: Object.keys(categoryData).length,
      totalSales,
      totalRevenue,
      debug: {
        salesFetched: (recentSales || []).length,
        todaySalesCount: todaySales.length,
        currentRevenue,
      },
    })
  } catch (error) {
    console.error("AI analytics error:", error)
    return NextResponse.json({ error: "Analytics failed" }, { status: 500 })
  }
}
