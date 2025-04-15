import { createClient } from "./supabase-client3"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns"
import type { DateRange } from "./types"

// Define types for our profit analysis data
export interface ProfitAnalysisData {
  // Summary metrics
  totalRevenue: number
  totalCogs: number
  totalProfit: number
  profitMargin: number
  profitGrowth: number
  averageOrderValue: number
  totalOrders: number

  // Time-based data
  dailyData: {
    date: string
    formattedDate: string
    revenue: number
    cogs: number
    profit: number
    profitMargin: number
    orders: number
  }[]

  weeklyData: {
    week: string
    formattedWeek: string
    revenue: number
    cogs: number
    profit: number
    profitMargin: number
    orders: number
  }[]

  monthlyData: {
    month: string
    formattedMonth: string
    revenue: number
    cogs: number
    profit: number
    profitMargin: number
    orders: number
  }[]

  // Category analysis
  categoryData: {
    id: string
    name: string
    revenue: number
    cogs: number
    profit: number
    profitMargin: number
    itemsSold: number
  }[]

  // Product analysis
  topProducts: {
    id: string
    name: string
    revenue: number
    cogs: number
    profit: number
    profitMargin: number
    quantitySold: number
  }[]

  lowMarginProducts: {
    id: string
    name: string
    revenue: number
    cogs: number
    profit: number
    profitMargin: number
    quantitySold: number
  }[]

  highMarginProducts: {
    id: string
    name: string
    revenue: number
    cogs: number
    profit: number
    profitMargin: number
    quantitySold: number
  }[]

  // Previous period data for comparison
  previousPeriod: {
    totalRevenue: number
    totalCogs: number
    totalProfit: number
    profitMargin: number
    totalOrders: number
  }
}

// Define period options
export type PeriodOption = "last7days" | "last30days" | "thisMonth" | "lastMonth" | "thisYear" | "lastYear" | "custom"

// Function to get date range based on period
export function getDateRange(period: PeriodOption, customRange?: DateRange): DateRange {
  const now = new Date()
  let from: Date
  let to: Date = now

  switch (period) {
    case "last7days":
      from = subDays(now, 7)
      break
    case "last30days":
      from = subDays(now, 30)
      break
    case "thisMonth":
      from = startOfMonth(now)
      break
    case "lastMonth": {
      const lastMonthDate = subMonths(now, 1)
      from = startOfMonth(lastMonthDate)
      to = endOfMonth(lastMonthDate)
      break
    }
    case "thisYear":
      from = startOfYear(now)
      break
    case "lastYear": {
      const lastYearDate = new Date(now.getFullYear() - 1, 0)
      from = startOfYear(lastYearDate)
      to = endOfYear(lastYearDate)
      break
    }
    case "custom":
      if (customRange?.from && customRange?.to) {
        from = customRange.from
        to = customRange.to
      } else if (customRange?.from) {
        from = customRange.from
        to = now
      } else if (customRange?.to) {
        from = subDays(customRange.to, 30)
        to = customRange.to
      } else {
        from = subDays(now, 30) // Default to last 30 days if custom range is invalid
      }
      break
    default:
      from = subDays(now, 30)
  }

  return { from, to }
}

// Function to get previous period date range for comparison
export function getPreviousPeriodRange(currentRange: DateRange): DateRange {
  // Ensure dates are valid
  if (!currentRange.from || !currentRange.to) {
    const now = new Date()
    return {
      from: subDays(now, 60),
      to: subDays(now, 30),
    }
  }

  // Calculate the duration of the current period in milliseconds
  const currentDuration = currentRange.to.getTime() - currentRange.from.getTime()

  // Create dates for the previous period of the same duration
  const prevTo = new Date(currentRange.from.getTime())
  const prevFrom = new Date(prevTo.getTime() - currentDuration)

  return {
    from: prevFrom,
    to: prevTo,
  }
}

// Helper function to format currency
export const formatPrice = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

// Helper function to format percentage
export const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`
}

// Function to fetch sales data with pagination
async function fetchAllSalesData(supabase: any, fromDate: string, toDate: string) {
  let allSalesData: any[] = []
  let hasMore = true
  let page = 0
  const PAGE_SIZE = 1000 // Supabase's maximum limit

  console.log("Fetching sales data with pagination...")

  while (hasMore) {
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select(`
        id,
        total,
        tax,
        payment_method,
        created_at,
        sale_items (
          id, 
          sale_id, 
          product_id, 
          quantity, 
          price, 
          discount,
          products:product_id (
            id, 
            name, 
            price, 
            purchase_price, 
            category_id
          )
        )
      `)
      .gte("created_at", fromDate)
      .lte("created_at", toDate)
      .order("created_at", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (salesError) {
      console.error(`Error fetching sales page ${page}:`, salesError)
      throw salesError
    }

    if (salesData && salesData.length > 0) {
      allSalesData = [...allSalesData, ...salesData]
      console.log(`Fetched ${salesData.length} sales records (page ${page + 1})`)
      page++
      hasMore = salesData.length === PAGE_SIZE
    } else {
      hasMore = false
    }
  }

  console.log(`Total sales records fetched: ${allSalesData.length}`)
  return allSalesData
}

// Function to fetch previous period sales data with pagination
async function fetchAllPrevSalesData(supabase: any, prevFromDate: string, prevToDate: string) {
  let allPrevSalesData: any[] = []
  let hasMore = true
  let page = 0
  const PAGE_SIZE = 1000 // Supabase's maximum limit

  console.log("Fetching previous period sales data with pagination...")

  while (hasMore) {
    const { data: prevSalesData, error: prevSalesError } = await supabase
      .from("sales")
      .select(`
        id,
        total,
        tax,
        created_at,
        sale_items (
          id, 
          quantity, 
          price, 
          discount,
          products:product_id (
            purchase_price
          )
        )
      `)
      .gte("created_at", prevFromDate)
      .lte("created_at", prevToDate)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (prevSalesError) {
      console.error(`Error fetching previous sales page ${page}:`, prevSalesError)
      throw prevSalesError
    }

    if (prevSalesData && prevSalesData.length > 0) {
      allPrevSalesData = [...allPrevSalesData, ...prevSalesData]
      console.log(`Fetched ${prevSalesData.length} previous period sales records (page ${page + 1})`)
      page++
      hasMore = prevSalesData.length === PAGE_SIZE
    } else {
      hasMore = false
    }
  }

  console.log(`Total previous period sales records fetched: ${allPrevSalesData.length}`)
  return allPrevSalesData
}

// Function to fetch profit analysis data
export async function fetchProfitAnalysisData(
  period: PeriodOption,
  customDateRange?: DateRange,
): Promise<ProfitAnalysisData> {
  try {
    const supabase = createClient()
    const range = getDateRange(period, customDateRange)
    const previousRange = getPreviousPeriodRange(range)

    // Format dates for Supabase query
    const fromDate = range.from.toISOString()
    const toDate = range.to.toISOString()
    const prevFromDate = previousRange.from.toISOString()
    const prevToDate = previousRange.to.toISOString()

    // Fetch sales data for current period with pagination
    const salesData = await fetchAllSalesData(supabase, fromDate, toDate)

    // Fetch sales data for previous period with pagination
    const prevSalesData = await fetchAllPrevSalesData(supabase, prevFromDate, prevToDate)

    // Fetch categories
    const { data: categoriesData, error: categoriesError } = await supabase.from("categories").select("id, name")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      throw categoriesError
    }

    // Create a map of category IDs to names
    const categoryMap = new Map()
    categoriesData?.forEach((category: any) => {
      categoryMap.set(category.id, category.name)
    })

    // Process current period data
    const totalRevenue = salesData?.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0) || 0
    const totalOrders = salesData?.length || 0
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Process product and category data
    const productMap = new Map()
    const categoryDataMap = new Map()
    let totalCogs = 0

    salesData?.forEach((sale: any) => {
      ;(sale.sale_items || []).forEach((item: any) => {
        const product = item.products
        if (product) {
          const itemCogs = (product.purchase_price || 0) * (item.quantity || 0)
          const itemRevenue = (item.price || 0) * (item.quantity || 0) - (item.discount || 0)
          const itemProfit = itemRevenue - itemCogs
          const itemProfitMargin = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0

          totalCogs += itemCogs

          // Update product data
          const productId = product.id
          if (!productMap.has(productId)) {
            productMap.set(productId, {
              id: productId,
              name: product.name || `Product ${productId}`,
              revenue: 0,
              cogs: 0,
              profit: 0,
              profitMargin: 0,
              quantitySold: 0,
            })
          }

          const productData = productMap.get(productId)
          productData.revenue += itemRevenue
          productData.cogs += itemCogs
          productData.profit += itemProfit
          productData.quantitySold += item.quantity || 0
          productData.profitMargin = productData.revenue > 0 ? (productData.profit / productData.revenue) * 100 : 0

          // Update category data
          const categoryId = product.category_id
          if (categoryId) {
            if (!categoryDataMap.has(categoryId)) {
              categoryDataMap.set(categoryId, {
                id: categoryId,
                name: categoryMap.get(categoryId) || `Category ${categoryId}`,
                revenue: 0,
                cogs: 0,
                profit: 0,
                profitMargin: 0,
                itemsSold: 0,
              })
            }

            const categoryData = categoryDataMap.get(categoryId)
            categoryData.revenue += itemRevenue
            categoryData.cogs += itemCogs
            categoryData.profit += itemProfit
            categoryData.itemsSold += item.quantity || 0
            categoryData.profitMargin =
              categoryData.revenue > 0 ? (categoryData.profit / categoryData.revenue) * 100 : 0
          }
        }
      })
    })

    // Calculate total profit and margin
    const totalProfit = totalRevenue - totalCogs
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    // Process previous period data
    const prevTotalRevenue = prevSalesData?.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0) || 0
    const prevTotalOrders = prevSalesData?.length || 0

    let prevTotalCogs = 0
    prevSalesData?.forEach((sale: any) => {
      ;(sale.sale_items || []).forEach((item: any) => {
        const product = item.products
        if (product) {
          prevTotalCogs += (product.purchase_price || 0) * (item.quantity || 0)
        }
      })
    })

    const prevTotalProfit = prevTotalRevenue - prevTotalCogs
    const prevProfitMargin = prevTotalRevenue > 0 ? (prevTotalProfit / prevTotalRevenue) * 100 : 0

    // Calculate profit growth
    const profitGrowth = prevTotalProfit !== 0 ? ((totalProfit - prevTotalProfit) / Math.abs(prevTotalProfit)) * 100 : 0

    // Process time-based data
    const dailyDataMap = new Map()
    const weeklyDataMap = new Map()
    const monthlyDataMap = new Map()

    salesData?.forEach((sale: any) => {
      const saleDate = new Date(sale.created_at)
      const dateStr = format(saleDate, "yyyy-MM-dd")
      const weekStr = format(saleDate, "yyyy-'W'ww")
      const monthStr = format(saleDate, "yyyy-MM")

      // Calculate sale COGS
      let saleCogs = 0
      ;(sale.sale_items || []).forEach((item: any) => {
        const product = item.products
        if (product) {
          saleCogs += (product.purchase_price || 0) * (item.quantity || 0)
        }
      })

      const saleRevenue = sale.total || 0
      const saleProfit = saleRevenue - saleCogs
      const saleProfitMargin = saleRevenue > 0 ? (saleProfit / saleRevenue) * 100 : 0

      // Update daily data
      if (!dailyDataMap.has(dateStr)) {
        dailyDataMap.set(dateStr, {
          date: dateStr,
          formattedDate: format(saleDate, "MMM dd"),
          revenue: 0,
          cogs: 0,
          profit: 0,
          profitMargin: 0,
          orders: 0,
        })
      }

      const dailyData = dailyDataMap.get(dateStr)
      dailyData.revenue += saleRevenue
      dailyData.cogs += saleCogs
      dailyData.profit += saleProfit
      dailyData.orders += 1
      dailyData.profitMargin = dailyData.revenue > 0 ? (dailyData.profit / dailyData.revenue) * 100 : 0

      // Update weekly data
      if (!weeklyDataMap.has(weekStr)) {
        weeklyDataMap.set(weekStr, {
          week: weekStr,
          formattedWeek: `Week ${format(saleDate, "w")}`,
          revenue: 0,
          cogs: 0,
          profit: 0,
          profitMargin: 0,
          orders: 0,
        })
      }

      const weeklyData = weeklyDataMap.get(weekStr)
      weeklyData.revenue += saleRevenue
      weeklyData.cogs += saleCogs
      weeklyData.profit += saleProfit
      weeklyData.orders += 1
      weeklyData.profitMargin = weeklyData.revenue > 0 ? (weeklyData.profit / weeklyData.revenue) * 100 : 0

      // Update monthly data
      if (!monthlyDataMap.has(monthStr)) {
        monthlyDataMap.set(monthStr, {
          month: monthStr,
          formattedMonth: format(saleDate, "MMM yyyy"),
          revenue: 0,
          cogs: 0,
          profit: 0,
          profitMargin: 0,
          orders: 0,
        })
      }

      const monthlyData = monthlyDataMap.get(monthStr)
      monthlyData.revenue += saleRevenue
      monthlyData.cogs += saleCogs
      monthlyData.profit += saleProfit
      monthlyData.orders += 1
      monthlyData.profitMargin = monthlyData.revenue > 0 ? (monthlyData.profit / monthlyData.revenue) * 100 : 0
    })

    // Convert maps to arrays and sort
    const dailyData = Array.from(dailyDataMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    const weeklyData = Array.from(weeklyDataMap.values()).sort((a, b) => a.week.localeCompare(b.week))
    const monthlyData = Array.from(monthlyDataMap.values()).sort((a, b) => a.month.localeCompare(b.month))

    // Convert product and category maps to arrays and sort
    const productList = Array.from(productMap.values())
    const topProducts = [...productList].sort((a, b) => b.profit - a.profit).slice(0, 10)
    const lowMarginProducts = [...productList]
      .filter((p) => p.quantitySold > 0)
      .sort((a, b) => a.profitMargin - b.profitMargin)
      .slice(0, 10)
    const highMarginProducts = [...productList]
      .filter((p) => p.quantitySold > 0)
      .sort((a, b) => b.profitMargin - a.profitMargin)
      .slice(0, 10)

    const categoryData = Array.from(categoryDataMap.values()).sort((a, b) => b.profit - a.profit)

    // Log summary of data used for insights
    console.log(`=== PROFIT ANALYSIS SUMMARY ===`)
    console.log(`Total sales records processed: ${salesData?.length || 0}`)
    console.log(`Total previous period sales records processed: ${prevSalesData?.length || 0}`)
    console.log(`Total products analyzed: ${productList.length}`)
    console.log(`Total categories analyzed: ${categoryData.length}`)
    console.log(`Daily data points: ${dailyData.length}`)
    console.log(`=== END SUMMARY ===`)

    // Return the data
    return {
      totalRevenue,
      totalCogs,
      totalProfit,
      profitMargin,
      profitGrowth,
      averageOrderValue,
      totalOrders,
      dailyData,
      weeklyData,
      monthlyData,
      categoryData,
      topProducts,
      lowMarginProducts,
      highMarginProducts,
      previousPeriod: {
        totalRevenue: prevTotalRevenue,
        totalCogs: prevTotalCogs,
        totalProfit: prevTotalProfit,
        profitMargin: prevProfitMargin,
        totalOrders: prevTotalOrders,
      },
    }
  } catch (error) {
    console.error("Error in fetchProfitAnalysisData:", error)

    // Return fallback data for development/testing
    return {
      totalRevenue: 0,
      totalCogs: 0,
      totalProfit: 0,
      profitMargin: 0,
      profitGrowth: 0,
      averageOrderValue: 0,
      totalOrders: 0,
      dailyData: [],
      weeklyData: [],
      monthlyData: [],
      categoryData: [],
      topProducts: [],
      lowMarginProducts: [],
      highMarginProducts: [],
      previousPeriod: {
        totalRevenue: 0,
        totalCogs: 0,
        totalProfit: 0,
        profitMargin: 0,
        totalOrders: 0,
      },
    }
  }
}
