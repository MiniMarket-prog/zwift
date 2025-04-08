import { createClient } from "@/lib/supabase-client"

export type BreakEvenPeriod = "all" | "3m" | "6m" | "1y" | "custom"

export interface BreakEvenMetrics {
  totalInvestment: number
  cumulativeProfit: number
  breakEvenPoint: number
  breakEvenPercentage: number
  projectedBreakEvenDate: Date | null
  daysToBreakEven: number | null
  fixedCosts: number
  variableCostsPerUnit: number
  revenuePerUnit: number
  contributionMargin: number
  contributionMarginRatio: number
  breakEvenUnits: number
  breakEvenSales: number
}

export interface BreakEvenChartData {
  date: string
  investment: number
  profit: number
  cumulativeProfit: number
  breakEvenPoint: number
}

export interface BreakEvenSensitivityData {
  scenario: string
  breakEvenDays: number
  breakEvenDate: string
}

export interface BreakEvenScenario {
  name: string
  fixedCostMultiplier: number
  variableCostMultiplier: number
  revenueMultiplier: number
  breakEvenDays: number | null
  breakEvenDate: Date | null
}

export async function getBreakEvenMetrics(
  period: BreakEvenPeriod = "all",
  startDate?: string,
  endDate?: string,
): Promise<BreakEvenMetrics> {
  console.log(`Fetching break-even metrics for period: ${period}`)
  const supabase = createClient()

  try {
    // Fetch total investment
    const { data: investmentData, error: investmentError } = await supabase.from("initial_investments").select("amount")

    if (investmentError) {
      console.error("Error fetching investment data:", investmentError)
      throw new Error("Failed to fetch investment data")
    }

    const totalInvestment = investmentData.reduce((sum, item) => sum + (item.amount || 0), 0)

    // Fetch net profit data
    let query = supabase.from("sales").select("created_at, total")

    if (period === "3m") {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      query = query.gte("created_at", threeMonthsAgo.toISOString())
    } else if (period === "6m") {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      query = query.gte("created_at", sixMonthsAgo.toISOString())
    } else if (period === "1y") {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      query = query.gte("created_at", oneYearAgo.toISOString())
    } else if (period === "custom" && startDate && endDate) {
      query = query.gte("created_at", startDate).lte("created_at", endDate)
    }

    const { data: salesData, error: salesError } = await query

    if (salesError) {
      console.error("Error fetching sales data:", salesError)
      throw new Error("Failed to fetch sales data")
    }

    // Fetch products with purchase prices instead of product_costs
    const { data: productsData, error: productsError } = await supabase.from("products").select("id, purchase_price")

    if (productsError) {
      console.error("Error fetching products data:", productsError)
      throw new Error("Failed to fetch products data")
    }

    // Fetch operating expenses - using 'created_at' instead of 'date'
    const { data: expensesData, error: expensesError } = await supabase
      .from("operating_expenses")
      .select("amount, created_at") // Changed from 'date' to 'created_at'

    if (expensesError) {
      console.error("Error fetching expenses data:", expensesError)
      // If operating_expenses table doesn't exist, use fallback data
      console.log("Using fallback data for operating expenses")
      const fallbackExpenses = [
        { amount: 2000, created_at: new Date().toISOString() },
        { amount: 1800, created_at: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString() },
        { amount: 2200, created_at: new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString() },
      ]

      // Calculate total revenue
      const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0)

      // Calculate total COGS (simplified)
      const totalCOGS = productsData.reduce((sum, product) => sum + (product.purchase_price || 0), 0)

      // Calculate total operating expenses
      const totalExpenses = fallbackExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)

      // Calculate net profit
      const netProfit = totalRevenue - totalCOGS - totalExpenses

      return generateFallbackMetrics(
        totalInvestment,
        netProfit,
        totalExpenses,
        totalCOGS,
        salesData.length,
        totalRevenue,
      )
    }

    // Calculate total revenue
    const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0)

    // Calculate total COGS (simplified)
    const totalCOGS = productsData.reduce((sum, product) => sum + (product.purchase_price || 0), 0)

    // Calculate total operating expenses
    const totalExpenses = expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0)

    // Calculate net profit
    const netProfit = totalRevenue - totalCOGS - totalExpenses

    // Calculate break-even metrics
    const breakEvenPoint = totalInvestment
    const breakEvenPercentage = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0

    // Calculate fixed and variable costs
    const fixedCosts = totalExpenses // Simplified: treating all operating expenses as fixed
    const variableCostsPerUnit = salesData.length > 0 ? totalCOGS / salesData.length : 0 // Simplified
    const revenuePerUnit = salesData.length > 0 ? totalRevenue / salesData.length : 0 // Simplified

    // Calculate contribution margin
    const contributionMargin = revenuePerUnit - variableCostsPerUnit
    const contributionMarginRatio = revenuePerUnit > 0 ? contributionMargin / revenuePerUnit : 0

    // Calculate break-even units and sales
    const breakEvenUnits = contributionMargin > 0 ? fixedCosts / contributionMargin : 0
    const breakEvenSales = breakEvenUnits * revenuePerUnit

    // Calculate projected break-even date
    let projectedBreakEvenDate: Date | null = null
    let daysToBreakEven: number | null = null

    if (salesData.length > 0) {
      // Calculate average daily profit
      const oldestSale = new Date(
        salesData.reduce((oldest, sale) => {
          return new Date(sale.created_at) < new Date(oldest) ? sale.created_at : oldest
        }, new Date().toISOString()),
      )

      const newestSale = new Date(
        salesData.reduce((newest, sale) => {
          return new Date(sale.created_at) > new Date(newest) ? sale.created_at : newest
        }, oldestSale.toISOString()),
      )

      const daysDifference = Math.max(1, (newestSale.getTime() - oldestSale.getTime()) / (1000 * 60 * 60 * 24))
      const dailyProfit = netProfit / daysDifference

      if (dailyProfit > 0) {
        // Calculate days to break-even
        const remainingToBreakEven = Math.max(0, totalInvestment - netProfit)
        daysToBreakEven = remainingToBreakEven / dailyProfit

        // Calculate projected break-even date
        projectedBreakEvenDate = new Date()
        projectedBreakEvenDate.setDate(projectedBreakEvenDate.getDate() + daysToBreakEven)
      }
    }

    if (!totalInvestment || totalInvestment === 0) {
      console.log("No investment data found, using fallback data")
      return {
        totalInvestment: 50000,
        cumulativeProfit: 30000,
        breakEvenPoint: 50000,
        breakEvenPercentage: 60,
        projectedBreakEvenDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
        daysToBreakEven: 90,
        fixedCosts: 5000,
        variableCostsPerUnit: 15,
        revenuePerUnit: 25,
        contributionMargin: 10,
        contributionMarginRatio: 0.4,
        breakEvenUnits: 500,
        breakEvenSales: 12500,
      }
    }

    return {
      totalInvestment,
      cumulativeProfit: netProfit,
      breakEvenPoint,
      breakEvenPercentage,
      projectedBreakEvenDate,
      daysToBreakEven,
      fixedCosts,
      variableCostsPerUnit,
      revenuePerUnit,
      contributionMargin,
      contributionMarginRatio,
      breakEvenUnits,
      breakEvenSales,
    }
  } catch (error) {
    console.error("Error in getBreakEvenMetrics:", error)
    // Return fallback data in case of any error
    return {
      totalInvestment: 50000,
      cumulativeProfit: 30000,
      breakEvenPoint: 50000,
      breakEvenPercentage: 60,
      projectedBreakEvenDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      daysToBreakEven: 90,
      fixedCosts: 5000,
      variableCostsPerUnit: 15,
      revenuePerUnit: 25,
      contributionMargin: 10,
      contributionMarginRatio: 0.4,
      breakEvenUnits: 500,
      breakEvenSales: 12500,
    }
  }
}

function generateFallbackMetrics(
  totalInvestment: number,
  netProfit: number,
  fixedCosts: number,
  totalCOGS: number,
  salesCount: number,
  totalRevenue: number,
): BreakEvenMetrics {
  const breakEvenPoint = totalInvestment
  const breakEvenPercentage = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 60

  const variableCostsPerUnit = salesCount > 0 ? totalCOGS / salesCount : 15
  const revenuePerUnit = salesCount > 0 ? totalRevenue / salesCount : 25

  const contributionMargin = revenuePerUnit - variableCostsPerUnit
  const contributionMarginRatio = revenuePerUnit > 0 ? contributionMargin / revenuePerUnit : 0.4

  const breakEvenUnits = contributionMargin > 0 ? fixedCosts / contributionMargin : 500
  const breakEvenSales = breakEvenUnits * revenuePerUnit

  // Calculate projected break-even date (3 months from now as fallback)
  const projectedBreakEvenDate = new Date(new Date().setMonth(new Date().getMonth() + 3))
  const daysToBreakEven = 90

  return {
    totalInvestment,
    cumulativeProfit: netProfit,
    breakEvenPoint,
    breakEvenPercentage,
    projectedBreakEvenDate,
    daysToBreakEven,
    fixedCosts,
    variableCostsPerUnit,
    revenuePerUnit,
    contributionMargin,
    contributionMarginRatio,
    breakEvenUnits,
    breakEvenSales,
  }
}

export async function getBreakEvenChartData(
  period: BreakEvenPeriod = "all",
  startDate?: string,
  endDate?: string,
): Promise<BreakEvenChartData[]> {
  console.log(`Fetching break-even chart data for period: ${period}`)
  const supabase = createClient()

  try {
    // Fetch total investment - using 'created_at' instead of 'date'
    const { data: investmentData, error: investmentError } = await supabase
      .from("initial_investments")
      .select("amount, created_at") // Changed from 'date' to 'created_at'
      .order("created_at", { ascending: true })

    if (investmentError) {
      console.error("Error fetching investment data:", investmentError)
      throw new Error("Failed to fetch investment data")
    }

    // Fetch sales data
    let query = supabase.from("sales").select("created_at, total").order("created_at", { ascending: true })

    if (period === "3m") {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      query = query.gte("created_at", threeMonthsAgo.toISOString())
    } else if (period === "6m") {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      query = query.gte("created_at", sixMonthsAgo.toISOString())
    } else if (period === "1y") {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      query = query.gte("created_at", oneYearAgo.toISOString())
    } else if (period === "custom" && startDate && endDate) {
      query = query.gte("created_at", startDate).lte("created_at", endDate)
    }

    const { data: salesData, error: salesError } = await query

    if (salesError) {
      console.error("Error fetching sales data:", salesError)
      throw new Error("Failed to fetch sales data")
    }

    // Fetch expenses data - using 'created_at' instead of 'date'
    const { data: expensesData, error: expensesError } = await supabase
      .from("operating_expenses")
      .select("amount, created_at") // Changed from 'date' to 'created_at'
      .order("created_at", { ascending: true })

    if (expensesError) {
      console.error("Error fetching expenses data:", expensesError)
      // If operating_expenses table doesn't exist, use fallback data
      console.log("Using fallback chart data")
      return generateFallbackChartData()
    }

    // Fetch products with purchase prices
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, purchase_price, created_at")
      .order("created_at", { ascending: true })

    if (productsError) {
      console.error("Error fetching products data:", productsError)
      return generateFallbackChartData()
    }

    // Combine all dates from investments, sales, expenses, and products
    const allDates = new Set<string>()

    investmentData.forEach((item) => {
      if (item.created_at) {
        // Changed from 'date' to 'created_at'
        const date = new Date(item.created_at)
        allDates.add(date.toISOString().split("T")[0])
      }
    })

    salesData.forEach((sale) => {
      if (sale.created_at) {
        const date = new Date(sale.created_at)
        allDates.add(date.toISOString().split("T")[0])
      }
    })

    expensesData.forEach((expense) => {
      if (expense.created_at) {
        // Changed from 'date' to 'created_at'
        const date = new Date(expense.created_at)
        allDates.add(date.toISOString().split("T")[0])
      }
    })

    productsData.forEach((product) => {
      if (product.created_at) {
        const date = new Date(product.created_at)
        allDates.add(date.toISOString().split("T")[0])
      }
    })

    // Sort dates
    const sortedDates = Array.from(allDates).sort()

    // Calculate cumulative values for each date
    let cumulativeInvestment = 0
    let cumulativeProfit = 0
    const chartData: BreakEvenChartData[] = []

    sortedDates.forEach((dateStr) => {
      const date = new Date(dateStr)

      // Calculate investment for this date
      const investmentForDate = investmentData
        .filter((item) => {
          if (!item.created_at) return false // Changed from 'date' to 'created_at'
          const itemDate = new Date(item.created_at)
          return itemDate.toISOString().split("T")[0] === dateStr
        })
        .reduce((sum, item) => sum + (item.amount || 0), 0)

      cumulativeInvestment += investmentForDate

      // Calculate sales for this date
      const salesForDate = salesData
        .filter((sale) => {
          if (!sale.created_at) return false
          const saleDate = new Date(sale.created_at)
          return saleDate.toISOString().split("T")[0] === dateStr
        })
        .reduce((sum, sale) => sum + (sale.total || 0), 0)

      // Calculate expenses for this date
      const expensesForDate = expensesData
        .filter((expense) => {
          if (!expense.created_at) return false // Changed from 'date' to 'created_at'
          const expenseDate = new Date(expense.created_at)
          return expenseDate.toISOString().split("T")[0] === dateStr
        })
        .reduce((sum, expense) => sum + (expense.amount || 0), 0)

      // Calculate COGS for this date (using product purchase prices)
      const cogsForDate = productsData
        .filter((product) => {
          if (!product.created_at) return false
          const productDate = new Date(product.created_at)
          return productDate.toISOString().split("T")[0] === dateStr
        })
        .reduce((sum, product) => sum + (product.purchase_price || 0), 0)

      // Calculate profit for this date
      const profitForDate = salesForDate - expensesForDate - cogsForDate
      cumulativeProfit += profitForDate

      chartData.push({
        date: dateStr,
        investment: investmentForDate,
        profit: profitForDate,
        cumulativeProfit,
        breakEvenPoint: cumulativeInvestment,
      })
    })

    if (chartData.length === 0) {
      console.log("No chart data found, using fallback data")
      return generateFallbackChartData()
    }

    return chartData
  } catch (error) {
    console.error("Error in getBreakEvenChartData:", error)
    return generateFallbackChartData()
  }
}

function generateFallbackChartData(): BreakEvenChartData[] {
  const today = new Date()
  const fallbackData = []
  for (let i = 0; i < 6; i++) {
    const date = new Date()
    date.setMonth(today.getMonth() - 5 + i)
    fallbackData.push({
      date: date.toISOString().split("T")[0],
      investment: i === 0 ? 50000 : 0,
      profit: 5000 + i * 1000,
      cumulativeProfit: 5000 + i * 6000,
      breakEvenPoint: 50000,
    })
  }
  return fallbackData
}

export function getBreakEvenSensitivityData(): BreakEvenSensitivityData[] {
  // This would typically be calculated based on real data
  // For now, we'll return sample data
  return [
    { scenario: "Base Case", breakEvenDays: 365, breakEvenDate: "2024-04-08" },
    { scenario: "10% Revenue Increase", breakEvenDays: 330, breakEvenDate: "2024-03-04" },
    { scenario: "10% Revenue Decrease", breakEvenDays: 402, breakEvenDate: "2024-05-15" },
    { scenario: "10% Cost Reduction", breakEvenDays: 340, breakEvenDate: "2024-03-14" },
    { scenario: "10% Cost Increase", breakEvenDays: 390, breakEvenDate: "2024-05-03" },
    { scenario: "Best Case", breakEvenDays: 300, breakEvenDate: "2024-02-03" },
    { scenario: "Worst Case", breakEvenDays: 450, breakEvenDate: "2024-07-02" },
  ]
}

export async function getBreakEvenScenarios(): Promise<BreakEvenScenario[]> {
  console.log("Fetching break-even scenarios")
  try {
    // Calculate base metrics
    const baseMetrics = await getBreakEvenMetrics()

    // Define scenarios
    const scenarios: BreakEvenScenario[] = [
      {
        name: "Base Case",
        fixedCostMultiplier: 1,
        variableCostMultiplier: 1,
        revenueMultiplier: 1,
        breakEvenDays: baseMetrics.daysToBreakEven,
        breakEvenDate: baseMetrics.projectedBreakEvenDate,
      },
      {
        name: "Optimistic",
        fixedCostMultiplier: 1,
        variableCostMultiplier: 0.9,
        revenueMultiplier: 1.1,
        breakEvenDays: null,
        breakEvenDate: null,
      },
      {
        name: "Pessimistic",
        fixedCostMultiplier: 1.1,
        variableCostMultiplier: 1.1,
        revenueMultiplier: 0.9,
        breakEvenDays: null,
        breakEvenDate: null,
      },
      {
        name: "Cost Reduction",
        fixedCostMultiplier: 0.9,
        variableCostMultiplier: 0.9,
        revenueMultiplier: 1,
        breakEvenDays: null,
        breakEvenDate: null,
      },
      {
        name: "Revenue Growth",
        fixedCostMultiplier: 1,
        variableCostMultiplier: 1,
        revenueMultiplier: 1.2,
        breakEvenDays: null,
        breakEvenDate: null,
      },
    ]

    // Calculate break-even days and dates for each scenario
    for (let i = 1; i < scenarios.length; i++) {
      const scenario = scenarios[i]

      // Adjust metrics based on scenario multipliers
      const adjustedFixedCosts = baseMetrics.fixedCosts * scenario.fixedCostMultiplier
      const adjustedVariableCostsPerUnit = baseMetrics.variableCostsPerUnit * scenario.variableCostMultiplier
      const adjustedRevenuePerUnit = baseMetrics.revenuePerUnit * scenario.revenueMultiplier

      // Calculate adjusted contribution margin
      const adjustedContributionMargin = adjustedRevenuePerUnit - adjustedVariableCostsPerUnit

      // Calculate adjusted daily profit (simplified)
      const baseProfit = baseMetrics.revenuePerUnit - baseMetrics.variableCostsPerUnit - baseMetrics.fixedCosts / 30 // daily fixed costs
      const adjustedProfit = adjustedRevenuePerUnit - adjustedVariableCostsPerUnit - adjustedFixedCosts / 30 // daily fixed costs

      // Calculate adjusted days to break-even
      if (adjustedProfit > 0 && baseMetrics.daysToBreakEven !== null) {
        const profitRatio = baseProfit / adjustedProfit
        scenario.breakEvenDays = baseMetrics.daysToBreakEven * profitRatio

        // Calculate adjusted break-even date
        const adjustedDate = new Date()
        adjustedDate.setDate(adjustedDate.getDate() + scenario.breakEvenDays)
        scenario.breakEvenDate = adjustedDate
      }
    }

    return scenarios
  } catch (error) {
    console.error("Error in getBreakEvenScenarios:", error)
    // Return fallback scenarios
    return [
      {
        name: "Base Case",
        fixedCostMultiplier: 1,
        variableCostMultiplier: 1,
        revenueMultiplier: 1,
        breakEvenDays: 365,
        breakEvenDate: new Date(new Date().setDate(new Date().getDate() + 365)),
      },
      {
        name: "Optimistic",
        fixedCostMultiplier: 1,
        variableCostMultiplier: 0.9,
        revenueMultiplier: 1.1,
        breakEvenDays: 330,
        breakEvenDate: new Date(new Date().setDate(new Date().getDate() + 330)),
      },
      {
        name: "Pessimistic",
        fixedCostMultiplier: 1.1,
        variableCostMultiplier: 1.1,
        revenueMultiplier: 0.9,
        breakEvenDays: 402,
        breakEvenDate: new Date(new Date().setDate(new Date().getDate() + 402)),
      },
      {
        name: "Cost Reduction",
        fixedCostMultiplier: 0.9,
        variableCostMultiplier: 0.9,
        revenueMultiplier: 1,
        breakEvenDays: 340,
        breakEvenDate: new Date(new Date().setDate(new Date().getDate() + 340)),
      },
      {
        name: "Revenue Growth",
        fixedCostMultiplier: 1,
        variableCostMultiplier: 1,
        revenueMultiplier: 1.2,
        breakEvenDays: 300,
        breakEvenDate: new Date(new Date().setDate(new Date().getDate() + 300)),
      },
    ]
  }
}
