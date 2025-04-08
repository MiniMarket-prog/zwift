import { createClient } from "./supabase-client3"
import { fetchNetProfitData } from "./net-profit-service"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"

export interface InitialInvestment {
  id: string
  amount: number
  description: string | null
  investment_date: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export interface ROIData {
  // Summary data
  totalInvestment: number
  netProfit: number
  roi: number // ROI percentage
  annualizedRoi: number // Annualized ROI percentage

  // Investment data
  investments: InitialInvestment[]
  investmentsByCategory: Record<string, number>

  // Time series data
  monthlyData: Array<{
    month: string
    netProfit: number
    investment: number
    roi: number
    formattedMonth: string
  }>

  // Performance metrics
  paybackPeriod: number | null // in months
  breakEvenPoint: number | null
  profitabilityIndex: number | null
}

export async function fetchROIData(from: Date, to: Date): Promise<ROIData> {
  const supabase = createClient()

  try {
    // Fetch net profit data for the period
    const netProfitData = await fetchNetProfitData(from, to)

    // Fetch all investments (we need all of them regardless of date to calculate total investment)
    const { data: investmentsData, error: investmentsError } = await supabase
      .from("initial_investments")
      .select("*")
      .order("investment_date", { ascending: true })

    if (investmentsError) {
      console.error("Error fetching investments:", investmentsError)
      throw investmentsError
    }

    // Initialize ROI data
    const roiData: ROIData = {
      totalInvestment: 0,
      netProfit: netProfitData.netProfit,
      roi: 0,
      annualizedRoi: 0,
      investments: investmentsData || [],
      investmentsByCategory: {},
      monthlyData: [],
      paybackPeriod: null,
      breakEvenPoint: null,
      profitabilityIndex: null,
    }

    // Calculate total investment
    roiData.totalInvestment = (investmentsData || []).reduce((sum, inv) => sum + inv.amount, 0)

    // Group investments by category (using description as category)
    const investmentsByCategory: Record<string, number> = {}
    for (const investment of investmentsData || []) {
      const category = investment.description || "Uncategorized"
      if (!investmentsByCategory[category]) {
        investmentsByCategory[category] = 0
      }
      investmentsByCategory[category] += investment.amount
    }
    roiData.investmentsByCategory = investmentsByCategory

    // Calculate ROI
    if (roiData.totalInvestment > 0) {
      roiData.roi = (netProfitData.netProfit / roiData.totalInvestment) * 100
    }

    // Calculate annualized ROI
    // Get the earliest investment date to determine the investment period
    let earliestInvestmentDate: Date | null = null
    for (const investment of investmentsData || []) {
      if (investment.investment_date) {
        const investmentDate = new Date(investment.investment_date)
        if (!earliestInvestmentDate || investmentDate < earliestInvestmentDate) {
          earliestInvestmentDate = investmentDate
        }
      }
    }

    if (earliestInvestmentDate) {
      // Calculate investment period in years
      const investmentPeriodInDays = (to.getTime() - earliestInvestmentDate.getTime()) / (1000 * 60 * 60 * 24)
      const investmentPeriodInYears = investmentPeriodInDays / 365

      if (investmentPeriodInYears > 0) {
        // Formula for annualized ROI: ((1 + ROI)^(1/n)) - 1, where n is the number of years
        roiData.annualizedRoi = (Math.pow(1 + roiData.roi / 100, 1 / investmentPeriodInYears) - 1) * 100
      }
    }

    // Generate monthly data for the chart
    // We'll go back 12 months from the end date
    const monthlyData = []
    let currentDate = subMonths(to, 11) // Start 12 months ago

    for (let i = 0; i < 12; i++) {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)

      // Fetch net profit for this month
      const monthNetProfitData = await fetchNetProfitData(monthStart, monthEnd)

      // Calculate total investment up to this month
      const investmentUpToMonth = (investmentsData || [])
        .filter((inv) => {
          if (!inv.investment_date) return false
          const invDate = new Date(inv.investment_date)
          return invDate <= monthEnd
        })
        .reduce((sum, inv) => sum + inv.amount, 0)

      // Calculate ROI for this month
      const monthRoi = investmentUpToMonth > 0 ? (monthNetProfitData.netProfit / investmentUpToMonth) * 100 : 0

      monthlyData.push({
        month: format(monthStart, "yyyy-MM"),
        netProfit: monthNetProfitData.netProfit,
        investment: investmentUpToMonth,
        roi: monthRoi,
        formattedMonth: format(monthStart, "MMM yyyy"),
      })

      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1))
    }

    roiData.monthlyData = monthlyData

    // Calculate payback period (in months)
    if (roiData.totalInvestment > 0 && netProfitData.netProfit > 0) {
      // Simple payback period calculation: Investment / Monthly Net Profit
      // We'll use the average monthly net profit from our data
      const averageMonthlyProfit = netProfitData.netProfit / monthlyData.length
      if (averageMonthlyProfit > 0) {
        roiData.paybackPeriod = roiData.totalInvestment / averageMonthlyProfit
      }
    }

    // Calculate break-even point
    // This is the sales volume needed to cover all costs
    // Break-even point = Fixed Costs / Contribution Margin
    // For simplicity, we'll use total investment as fixed costs and assume a contribution margin
    // from our net profit data
    if (netProfitData.totalRevenue > 0 && netProfitData.netProfit > 0) {
      const contributionMarginRatio = netProfitData.netProfit / netProfitData.totalRevenue
      if (contributionMarginRatio > 0) {
        roiData.breakEvenPoint = roiData.totalInvestment / contributionMarginRatio
      }
    }

    // Calculate profitability index
    // PI = Present Value of Future Cash Flows / Initial Investment
    // For simplicity, we'll use net profit as the present value of future cash flows
    if (roiData.totalInvestment > 0) {
      roiData.profitabilityIndex = netProfitData.netProfit / roiData.totalInvestment
    }

    return roiData
  } catch (error) {
    console.error("Error in fetchROIData:", error)
    throw error
  }
}
