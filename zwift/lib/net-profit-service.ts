import { format, parseISO } from "date-fns"
import { fetchCOGSData } from "./cogs-service"
import { fetchOperatingExpenses, type OperatingExpense } from "./operating-expenses-service"

export interface NetProfitData {
  // Revenue and COGS data
  totalRevenue: number
  totalCOGS: number
  grossProfit: number
  grossMargin: number

  // Operating Expenses data
  totalOperatingExpenses: number
  operatingExpensesByCategory: Record<string, number>
  operatingExpensesByDay: Record<string, number>
  operatingExpenses: OperatingExpense[]

  // Net profit calculations
  netProfit: number
  netMargin: number

  // Time series data for charts
  dailyData: Array<{
    date: string
    revenue: number
    cogs: number
    grossProfit: number
    operatingExpenses: number
    netProfit: number
    formattedDate?: string
  }>
}

export async function fetchNetProfitData(from: Date, to: Date): Promise<NetProfitData> {
  try {
    // First, get the COGS data which includes revenue, COGS, and gross profit
    const cogsData = await fetchCOGSData(from, to)

    // Next, get the operating expenses data
    const operatingExpensesData = await fetchOperatingExpenses(from, to)

    // Initialize net profit data
    const netProfitData: NetProfitData = {
      // Copy revenue and COGS data from COGS calculation
      totalRevenue: cogsData.totalRevenue,
      totalCOGS: cogsData.totalCOGS,
      grossProfit: cogsData.grossProfit,
      grossMargin: cogsData.grossMargin,

      // Copy operating expenses data
      totalOperatingExpenses: operatingExpensesData.totalExpenses,
      operatingExpensesByCategory: operatingExpensesData.expensesByCategory,
      operatingExpensesByDay: operatingExpensesData.expensesByDay,
      operatingExpenses: operatingExpensesData.expenses,

      // Initialize net profit calculations
      netProfit: 0,
      netMargin: 0,

      // Initialize time series data
      dailyData: [],
    }

    // Calculate net profit and margin
    netProfitData.netProfit = netProfitData.grossProfit - netProfitData.totalOperatingExpenses
    netProfitData.netMargin =
      netProfitData.totalRevenue > 0 ? (netProfitData.netProfit / netProfitData.totalRevenue) * 100 : 0

    // Create daily data for charts by combining COGS daily data with operating expenses data
    const allDays = new Set([...Object.keys(cogsData.cogsByDay), ...Object.keys(operatingExpensesData.expensesByDay)])

    netProfitData.dailyData = Array.from(allDays)
      .map((date) => {
        const cogs = cogsData.cogsByDay[date] || 0
        const operatingExpenses = operatingExpensesData.expensesByDay[date] || 0

        // Find revenue for this day from COGS data
        const dayData = cogsData.dailyData.find((d) => d.date === date)
        const revenue = dayData ? dayData.revenue : 0

        // Calculate profits
        const grossProfit = revenue - cogs
        const netProfit = grossProfit - operatingExpenses

        return {
          date,
          revenue,
          cogs,
          grossProfit,
          operatingExpenses,
          netProfit,
          formattedDate: format(parseISO(date), "MMM dd"),
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    return netProfitData
  } catch (error) {
    console.error("Error in fetchNetProfitData:", error)
    throw error
  }
}
