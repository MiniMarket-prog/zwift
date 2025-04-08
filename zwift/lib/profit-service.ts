import { createClient } from "./supabase-client3"
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import type { DateRange } from "./types"

export interface ProfitData {
  totalRevenue: number
  totalExpenses: number
  totalProfit: number
  profitMargin: number
  profitGrowth: number

  // Breakdown by time periods
  dailyData: {
    date: string
    formattedDate: string
    revenue: number
    expenses: number
    profit: number
    profitMargin: number
  }[]

  weeklyData: {
    week: string
    formattedWeek: string
    revenue: number
    expenses: number
    profit: number
    profitMargin: number
  }[]

  monthlyData: {
    month: string
    formattedMonth: string
    revenue: number
    expenses: number
    profit: number
    profitMargin: number
  }[]

  // Breakdown by expense categories
  expensesByCategory: Record<string, number>

  // Breakdown by revenue sources
  revenueBySource: Record<string, number>

  // Profit by product category
  profitByCategory: Record<string, number>
}

export async function fetchProfitData(from: Date, to: Date): Promise<ProfitData> {
  try {
    const supabase = createClient()

    // Fetch sales data for revenue
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("id, created_at, total")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())

    if (salesError) {
      console.error("Error fetching sales data:", salesError)
      throw new Error("Failed to fetch sales data")
    }

    // Fetch sales items with product details for category analysis
    const { data: salesItemsWithProducts, error: itemsError } = await supabase
      .from("sale_items")
      .select(`
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
          category_id,
          categories:category_id (
            id,
            name
          )
        )
      `)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())

    if (itemsError) {
      console.error("Error fetching sales items:", itemsError)
      throw new Error("Failed to fetch sales items")
    }

    // Fetch operating expenses
    const { data: expensesData, error: expensesError } = await supabase
      .from("operating_expenses")
      .select("id, amount, date, category_id, categories:category_id(id, name)")
      .gte("date", from.toISOString())
      .lte("date", to.toISOString())

    if (expensesError) {
      console.error("Error fetching expenses data:", expensesError)
      throw new Error("Failed to fetch expenses data")
    }

    // Calculate total revenue
    const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0)

    // Calculate total expenses (COGS + operating expenses)
    const totalOperatingExpenses = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0)

    // Calculate COGS
    const totalCOGS = salesItemsWithProducts.reduce((sum, item) => {
      const purchasePrice = item.products && item.products[0] ? item.products[0].purchase_price || 0 : 0
      return sum + purchasePrice * item.quantity
    }, 0)

    const totalExpenses = totalOperatingExpenses + totalCOGS

    // Calculate total profit
    const totalProfit = totalRevenue - totalExpenses

    // Calculate profit margin
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    // Process daily data
    const dailyDataMap = new Map()

    // Process sales by day
    salesData.forEach((sale) => {
      const date = sale.created_at.split("T")[0]
      const existingDay = dailyDataMap.get(date) || {
        date,
        formattedDate: format(new Date(date), "MMM dd"),
        revenue: 0,
        expenses: 0,
        profit: 0,
        profitMargin: 0,
      }

      existingDay.revenue += sale.total || 0
      dailyDataMap.set(date, existingDay)
    })

    // Process expenses by day
    expensesData.forEach((expense) => {
      const date = expense.date.split("T")[0]
      const existingDay = dailyDataMap.get(date) || {
        date,
        formattedDate: format(new Date(date), "MMM dd"),
        revenue: 0,
        expenses: 0,
        profit: 0,
        profitMargin: 0,
      }

      existingDay.expenses += expense.amount || 0
      dailyDataMap.set(date, existingDay)
    })

    // Process COGS by day
    for (const item of salesItemsWithProducts) {
      // Get the sale date from the sales table using a join or separate query
      const { data: saleData } = await supabase.from("sales").select("created_at").eq("id", item.sale_id).single()

      const date = saleData?.created_at.split("T")[0] || new Date().toISOString().split("T")[0]
      const existingDay = dailyDataMap.get(date) || {
        date,
        formattedDate: format(new Date(date), "MMM dd"),
        revenue: 0,
        expenses: 0,
        profit: 0,
        profitMargin: 0,
      }

      const purchasePrice = item.products && item.products[0] ? item.products[0].purchase_price || 0 : 0
      existingDay.expenses += purchasePrice * item.quantity
      dailyDataMap.set(date, existingDay)
    }

    // Calculate profit and profit margin for each day
    const dailyData = Array.from(dailyDataMap.values())
      .map((day) => {
        day.profit = day.revenue - day.expenses
        day.profitMargin = day.revenue > 0 ? (day.profit / day.revenue) * 100 : 0
        return day
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    // Process weekly data
    const weeklyDataMap = new Map()
    dailyData.forEach((day) => {
      const date = new Date(day.date)
      const weekStart = format(date, "yyyy-ww")
      const existingWeek = weeklyDataMap.get(weekStart) || {
        week: weekStart,
        formattedWeek: `Week ${format(date, "w")}`,
        revenue: 0,
        expenses: 0,
        profit: 0,
        profitMargin: 0,
      }

      existingWeek.revenue += day.revenue
      existingWeek.expenses += day.expenses
      existingWeek.profit += day.profit
      weeklyDataMap.set(weekStart, existingWeek)
    })

    const weeklyData = Array.from(weeklyDataMap.values())
      .map((week) => {
        week.profitMargin = week.revenue > 0 ? (week.profit / week.revenue) * 100 : 0
        return week
      })
      .sort((a, b) => a.week.localeCompare(b.week))

    // Process monthly data
    const monthlyDataMap = new Map()
    dailyData.forEach((day) => {
      const month = day.date.substring(0, 7) // YYYY-MM
      const existingMonth = monthlyDataMap.get(month) || {
        month,
        formattedMonth: format(new Date(day.date), "MMM yyyy"),
        revenue: 0,
        expenses: 0,
        profit: 0,
        profitMargin: 0,
      }

      existingMonth.revenue += day.revenue
      existingMonth.expenses += day.expenses
      existingMonth.profit += day.profit
      monthlyDataMap.set(month, existingMonth)
    })

    const monthlyData = Array.from(monthlyDataMap.values())
      .map((month) => {
        month.profitMargin = month.revenue > 0 ? (month.profit / month.revenue) * 100 : 0
        return month
      })
      .sort((a, b) => a.month.localeCompare(b.month))

    // Calculate profit growth (comparing to previous period)
    let profitGrowth = 0
    if (dailyData.length >= 2) {
      const currentPeriodProfit = dailyData
        .slice(Math.floor(dailyData.length / 2))
        .reduce((sum, day) => sum + day.profit, 0)
      const previousPeriodProfit = dailyData
        .slice(0, Math.floor(dailyData.length / 2))
        .reduce((sum, day) => sum + day.profit, 0)

      if (previousPeriodProfit !== 0) {
        profitGrowth = ((currentPeriodProfit - previousPeriodProfit) / Math.abs(previousPeriodProfit)) * 100
      }
    }

    // Process expenses by category
    const expensesByCategory: Record<string, number> = {}
    expensesData.forEach((expense) => {
      const categoryName = expense.categories && expense.categories[0] ? expense.categories[0].name || "Uncategorized" : "Uncategorized"
      expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + (expense.amount || 0)
    })

    // Process revenue by source (payment method)
    const { data: salesByPaymentMethod, error: paymentMethodError } = await supabase
      .from("sales")
      .select("payment_method, total")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())

    if (paymentMethodError) {
      console.error("Error fetching sales by payment method:", paymentMethodError)
      throw new Error("Failed to fetch sales by payment method")
    }

    const revenueBySource: Record<string, number> = {}
    salesByPaymentMethod.forEach((sale) => {
      const paymentMethod = sale.payment_method || "Unknown"
      revenueBySource[paymentMethod] = (revenueBySource[paymentMethod] || 0) + (sale.total || 0)
    })

    // Process profit by product category
    const profitByCategory: Record<string, number> = {}
    salesItemsWithProducts.forEach((item) => {
      const categoryName = item.products && item.products[0] && item.products[0].categories && item.products[0].categories[0] ? item.products[0].categories[0].name || "Uncategorized" : "Uncategorized"
      const sellingPrice = item.price || 0
      const purchasePrice = item.products && item.products[0] ? item.products[0].purchase_price || 0 : 0
      const profit = (sellingPrice - purchasePrice) * item.quantity

      profitByCategory[categoryName] = (profitByCategory[categoryName] || 0) + profit
    })

    return {
      totalRevenue,
      totalExpenses,
      totalProfit,
      profitMargin,
      profitGrowth,
      dailyData,
      weeklyData,
      monthlyData,
      expensesByCategory,
      revenueBySource,
      profitByCategory,
    }
  } catch (error) {
    console.error("Error in fetchProfitData:", error)

    // Return fallback data for development/testing
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      totalProfit: 0,
      profitMargin: 0,
      profitGrowth: 0,
      dailyData: [],
      weeklyData: [],
      monthlyData: [],
      expensesByCategory: {},
      revenueBySource: {},
      profitByCategory: {},
    }
  }
}

export function getProfitDateRange(period: string): DateRange {
  const now = new Date()
  let from: Date
  let to: Date = now

  switch (period) {
    case "today":
      from = startOfDay(now)
      break
    case "yesterday":
      from = startOfDay(subDays(now, 1))
      to = endOfDay(subDays(now, 1))
      break
    case "last7days":
      from = subDays(now, 7)
      break
    case "last30days":
      from = subDays(now, 30)
      break
    case "thisMonth":
      from = startOfMonth(now)
      break
    case "lastMonth":
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1)
      from = startOfMonth(lastMonthDate)
      to = endOfMonth(lastMonthDate)
      break
    case "thisYear":
      from = startOfYear(now)
      break
    case "lastYear":
      const lastYearDate = new Date(now.getFullYear() - 1, 0)
      from = startOfYear(lastYearDate)
      to = endOfYear(lastYearDate)
      break
    default:
      from = subDays(now, 30)
  }

  return { from, to }
}