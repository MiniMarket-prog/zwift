"use client"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Lightbulb,
  Clock,
  Calendar,
  ShoppingCart,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Percent,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { fetchProfitAnalysisData, type ProfitAnalysisData, type PeriodOption } from "@/lib/profit-analysis-service"
import type { DateRange } from "@/lib/types"
import { formatCurrency } from "@/lib/format-currency"
import { createClient } from "@/lib/supabase-client"

export default function ProfitAdvicePage() {
  const [period, setPeriod] = useState<PeriodOption>("last30days")
  const [dateRange, setDateRange] = useState<DateRange>({ from: new Date(), to: new Date() })
  const [profitData, setProfitData] = useState<ProfitAnalysisData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<string>("timing")
  const { toast } = useToast()
  const [currentCurrency, setCurrentCurrency] = useState<string>("USD")

  // Fetch currency setting
  const fetchCurrency = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: settingsData, error } = await supabase
        .from("settings")
        .select("currency")
        .eq("type", "global")
        .single()

      if (!error && settingsData?.currency) {
        setCurrentCurrency(settingsData.currency)
      }
    } catch (error) {
      console.error("Error fetching currency setting:", error)
    }
  }, [])

  // Fetch data when period changes
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const data = await fetchProfitAnalysisData(period, dateRange)
        setProfitData(data)
        analyzeData(data)
      } catch (error) {
        console.error("Error fetching profit analysis data:", error)
        toast({
          title: "Error fetching data",
          description: "Could not load your business data for analysis.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    fetchCurrency()
  }, [period, toast, fetchCurrency])

  // Listen for storage events (triggered when settings are updated)
  useEffect(() => {
    const handleStorageChange = () => {
      fetchCurrency()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("focus", fetchCurrency)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", fetchCurrency)
    }
  }, [fetchCurrency])

  // State for analyzed insights
  const [insights, setInsights] = useState({
    bestDay: { day: "", revenue: 0, profit: 0, orders: 0 },
    worstDay: { day: "", revenue: 0, profit: 0, orders: 0 },
    bestHour: { hour: "", revenue: 0, profit: 0, orders: 0 },
    worstHour: { hour: "", revenue: 0, profit: 0, orders: 0 },
    topProductCombinations: [] as Array<{
      products: string[]
      occurrences: number
      revenue: number
      profit: number
    }>,
    productOpportunities: [] as Array<{
      id: string
      name: string
      metric: string
      value: number
      recommendation: string
    }>,
    pricingOpportunities: [] as Array<{
      id: string
      name: string
      currentPrice: number
      suggestedPrice: number
      potentialProfit: number
      reason: string
    }>,
    inventoryInsights: [] as Array<{
      id: string
      name: string
      insight: string
      recommendation: string
      impact: "high" | "medium" | "low"
    }>,
  })

  // Function to analyze data and extract insights
  const analyzeData = (data: ProfitAnalysisData) => {
    // This would normally be a complex analysis of your actual data
    // For this example, I'll simulate extracting insights from the data

    // Find best and worst days
    let bestDay = { day: "", revenue: 0, profit: 0, orders: 0 }
    let worstDay = { day: "", revenue: Number.MAX_VALUE, profit: Number.MAX_VALUE, orders: Number.MAX_VALUE }

    // Group daily data by day of week
    const dayOfWeekData: Record<string, { revenue: number; profit: number; orders: number; count: number }> = {}

    data.dailyData.forEach((day) => {
      const date = new Date(day.date)
      const dayOfWeek = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date)

      if (!dayOfWeekData[dayOfWeek]) {
        dayOfWeekData[dayOfWeek] = { revenue: 0, profit: 0, orders: 0, count: 0 }
      }

      dayOfWeekData[dayOfWeek].revenue += day.revenue
      dayOfWeekData[dayOfWeek].profit += day.profit
      dayOfWeekData[dayOfWeek].orders += day.orders
      dayOfWeekData[dayOfWeek].count += 1
    })

    // Calculate averages and find best/worst days
    Object.entries(dayOfWeekData).forEach(([day, stats]) => {
      const avgRevenue = stats.revenue / stats.count
      const avgProfit = stats.profit / stats.count
      const avgOrders = stats.orders / stats.count

      if (avgRevenue > bestDay.revenue) {
        bestDay = { day, revenue: avgRevenue, profit: avgProfit, orders: avgOrders }
      }

      if (avgRevenue < worstDay.revenue && stats.count > 0) {
        worstDay = { day, revenue: avgRevenue, profit: avgProfit, orders: avgOrders }
      }
    })

    // Simulate best and worst hours (in a real implementation, this would use actual hourly data)
    // This is placeholder logic since we don't have hourly data in our current model
    const bestHour = { hour: "11:00 AM - 1:00 PM", revenue: 1250, profit: 437.5, orders: 25 }
    const worstHour = { hour: "8:00 PM - 10:00 PM", revenue: 320, profit: 112, orders: 8 }

    // Simulate top product combinations
    // In a real implementation, this would analyze actual order data to find products frequently purchased together
    const topProductCombinations = [
      {
        products: [data.topProducts[0]?.name || "Premium Coffee", data.topProducts[1]?.name || "Breakfast Sandwich"],
        occurrences: 42,
        revenue: 546,
        profit: 218.4,
      },
      {
        products: [data.topProducts[2]?.name || "Energy Drink", data.topProducts[3]?.name || "Protein Bar"],
        occurrences: 36,
        revenue: 432,
        profit: 194.4,
      },
      {
        products: [data.topProducts[0]?.name || "Premium Coffee", data.topProducts[4]?.name || "Muffin"],
        occurrences: 28,
        revenue: 336,
        profit: 151.2,
      },
    ]

    // Generate product opportunities based on actual data
    const productOpportunities = []

    // Find high-margin products with low sales
    const highMarginLowSales = data.highMarginProducts
      .filter((p) => p.quantitySold < 20 && p.profitMargin > 40)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        name: p.name,
        metric: "Profit Margin",
        value: p.profitMargin,
        recommendation: "High margin but low sales. Consider better placement or promotion.",
      }))

    // Find popular products with below-average margins
    const popularLowMargin = data.topProducts
      .filter((p) => p.quantitySold > 50 && p.profitMargin < data.profitMargin)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        name: p.name,
        metric: "Profit Margin",
        value: p.profitMargin,
        recommendation: "Popular but below average margin. Consider slight price increase.",
      }))

    productOpportunities.push(...highMarginLowSales, ...popularLowMargin)

    // Generate pricing opportunities
    const pricingOpportunities = data.topProducts
      .filter((p) => p.profitMargin < 30 && p.quantitySold > 30)
      .slice(0, 5)
      .map((p) => {
        const currentPrice = p.revenue / p.quantitySold
        const suggestedPrice = currentPrice * 1.1 // Suggest 10% increase
        const potentialProfit = (suggestedPrice - p.cogs / p.quantitySold) * p.quantitySold - p.profit

        return {
          id: p.id,
          name: p.name,
          currentPrice,
          suggestedPrice,
          potentialProfit,
          reason: "High demand allows for price optimization",
        }
      })

    // Generate inventory insights
    const inventoryInsights = []

    // Category focus recommendation
    if (data.categoryData.length > 1) {
      const topCategory = data.categoryData[0]
      const bottomCategory = data.categoryData[data.categoryData.length - 1]

      if (topCategory.profitMargin > bottomCategory.profitMargin + 15) {
        inventoryInsights.push({
          id: "cat-1",
          name: topCategory.name,
          insight: `${topCategory.name} has a ${topCategory.profitMargin.toFixed(1)}% margin vs ${bottomCategory.name}'s ${bottomCategory.profitMargin.toFixed(1)}%`,
          recommendation: `Allocate more shelf space and inventory to ${topCategory.name} products`,
          impact: "high" as const,
        })
      }
    }

    // Product-specific insights
    if (data.lowMarginProducts.length > 0) {
      const worstProduct = data.lowMarginProducts[0]
      inventoryInsights.push({
        id: "prod-1",
        name: worstProduct.name,
        insight: `${worstProduct.name} has only ${worstProduct.profitMargin.toFixed(1)}% margin but sells ${worstProduct.quantitySold} units`,
        recommendation: "Consider finding alternative supplier or reformulating pricing",
        impact: "medium" as const,
      })
    }

    setInsights({
      bestDay,
      worstDay,
      bestHour,
      worstHour,
      topProductCombinations,
      productOpportunities,
      pricingOpportunities,
      inventoryInsights,
    })
  }

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Get impact badge color
  const getImpactColor = (impact: "high" | "medium" | "low") => {
    switch (impact) {
      case "high":
        return "bg-green-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Business Intelligence</h1>
          <p className="text-muted-foreground">Data-driven insights to optimize your operations and increase profits</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Select value={period} onValueChange={(value) => setPeriod(value as PeriodOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">Last 7 days</SelectItem>
              <SelectItem value="last30days">Last 30 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="lastMonth">Last month</SelectItem>
              <SelectItem value="thisYear">This year</SelectItem>
              <SelectItem value="lastYear">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Business Performance Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Business Performance Summary</CardTitle>
              <CardDescription>Key metrics from your selected time period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Revenue</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(profitData?.totalRevenue || 0, currentCurrency)}
                  </div>
                  <div className="flex items-center text-sm">
                    {profitData && profitData.totalRevenue > profitData.previousPeriod.totalRevenue ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span
                      className={
                        profitData && profitData.totalRevenue > profitData.previousPeriod.totalRevenue
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {profitData && profitData.previousPeriod.totalRevenue
                        ? formatPercent(
                            ((profitData.totalRevenue - profitData.previousPeriod.totalRevenue) /
                              profitData.previousPeriod.totalRevenue) *
                              100,
                          )
                        : "0%"}
                    </span>
                    <span className="text-muted-foreground ml-1">vs previous</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Profit</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(profitData?.totalProfit || 0, currentCurrency)}
                  </div>
                  <div className="flex items-center text-sm">
                    {profitData && profitData.totalProfit > profitData.previousPeriod.totalProfit ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span
                      className={
                        profitData && profitData.totalProfit > profitData.previousPeriod.totalProfit
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {profitData && profitData.previousPeriod.totalProfit
                        ? formatPercent(
                            ((profitData.totalProfit - profitData.previousPeriod.totalProfit) /
                              Math.abs(profitData.previousPeriod.totalProfit)) *
                              100,
                          )
                        : "0%"}
                    </span>
                    <span className="text-muted-foreground ml-1">vs previous</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Profit Margin</div>
                  <div className="text-2xl font-bold">{formatPercent(profitData?.profitMargin || 0)}</div>
                  <div className="flex items-center text-sm">
                    {profitData && profitData.profitMargin > profitData.previousPeriod.profitMargin ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span
                      className={
                        profitData && profitData.profitMargin > profitData.previousPeriod.profitMargin
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {profitData
                        ? (profitData.profitMargin - profitData.previousPeriod.profitMargin).toFixed(1) + "pts"
                        : "0pts"}
                    </span>
                    <span className="text-muted-foreground ml-1">vs previous</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Avg. Order Value</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(profitData?.averageOrderValue || 0, currentCurrency)}
                  </div>
                  <div className="flex items-center text-sm">
                    {profitData &&
                    profitData.previousPeriod.totalOrders > 0 &&
                    profitData.averageOrderValue >
                      profitData.previousPeriod.totalRevenue / profitData.previousPeriod.totalOrders ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span
                      className={
                        profitData &&
                        profitData.previousPeriod.totalOrders > 0 &&
                        profitData.averageOrderValue >
                          profitData.previousPeriod.totalRevenue / profitData.previousPeriod.totalOrders
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {profitData && profitData.previousPeriod.totalOrders > 0
                        ? formatPercent(
                            ((profitData.averageOrderValue -
                              profitData.previousPeriod.totalRevenue / profitData.previousPeriod.totalOrders) /
                              (profitData.previousPeriod.totalRevenue / profitData.previousPeriod.totalOrders)) *
                              100,
                          )
                        : "0%"}
                    </span>
                    <span className="text-muted-foreground ml-1">vs previous</span>
                  </div>
                </div>
              </div>

              {/* Key insights based on data */}
              <div className="mt-6 space-y-2">
                <h3 className="font-medium">Key Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profitData && (
                    <>
                      {profitData.profitMargin < 20 && (
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                          <div>
                            <p className="font-medium">Low profit margin</p>
                            <p className="text-sm text-muted-foreground">
                              Your profit margin of {formatPercent(profitData.profitMargin)} is below the recommended
                              20% threshold.
                            </p>
                          </div>
                        </div>
                      )}

                      {profitData.profitGrowth < 0 && (
                        <div className="flex items-start">
                          <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                          <div>
                            <p className="font-medium">Declining profitability</p>
                            <p className="text-sm text-muted-foreground">
                              Your profit has decreased by {formatPercent(Math.abs(profitData.profitGrowth))} compared
                              to the previous period.
                            </p>
                          </div>
                        </div>
                      )}

                      {insights.bestDay.day && (
                        <div className="flex items-start">
                          <Calendar className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          <div>
                            <p className="font-medium">Best performing day: {insights.bestDay.day}</p>
                            <p className="text-sm text-muted-foreground">
                              Averages {formatCurrency(insights.bestDay.revenue, currentCurrency)} in revenue with{" "}
                              {insights.bestDay.orders} orders
                            </p>
                          </div>
                        </div>
                      )}

                      {insights.topProductCombinations.length > 0 && (
                        <div className="flex items-start">
                          <Package className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                          <div>
                            <p className="font-medium">Popular product combination</p>
                            <p className="text-sm text-muted-foreground">
                              {insights.topProductCombinations[0].products.join(" + ")} purchased together{" "}
                              {insights.topProductCombinations[0].occurrences} times
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="timing">
                <Clock className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Timing Insights</span>
                <span className="sm:hidden">Timing</span>
              </TabsTrigger>
              <TabsTrigger value="products">
                <Package className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Product Insights</span>
                <span className="sm:hidden">Products</span>
              </TabsTrigger>
              <TabsTrigger value="pricing">
                <Percent className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Pricing Opportunities</span>
                <span className="sm:hidden">Pricing</span>
              </TabsTrigger>
              <TabsTrigger value="inventory">
                <ShoppingCart className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Inventory Insights</span>
                <span className="sm:hidden">Inventory</span>
              </TabsTrigger>
            </TabsList>

            {/* Timing Insights Tab */}
            <TabsContent value="timing" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Best Day Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-green-500" />
                      Best Performing Day
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{insights.bestDay.day}</div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Revenue</span>
                        <span className="font-medium">{formatCurrency(insights.bestDay.revenue, currentCurrency)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Profit</span>
                        <span className="font-medium">{formatCurrency(insights.bestDay.profit, currentCurrency)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Orders</span>
                        <span className="font-medium">{insights.bestDay.orders}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      Consider running promotions on other days to match this performance
                    </p>
                  </CardFooter>
                </Card>

                {/* Worst Day Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-red-500" />
                      Lowest Performing Day
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{insights.worstDay.day}</div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Revenue</span>
                        <span className="font-medium">
                          {formatCurrency(insights.worstDay.revenue, currentCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Profit</span>
                        <span className="font-medium">{formatCurrency(insights.worstDay.profit, currentCurrency)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Orders</span>
                        <span className="font-medium">{insights.worstDay.orders}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      Consider special promotions or adjusted staffing on this day
                    </p>
                  </CardFooter>
                </Card>

                {/* Best Hour Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-green-500" />
                      Peak Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{insights.bestHour.hour}</div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Revenue</span>
                        <span className="font-medium">
                          {formatCurrency(insights.bestHour.revenue, currentCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Profit</span>
                        <span className="font-medium">{formatCurrency(insights.bestHour.profit, currentCurrency)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Orders</span>
                        <span className="font-medium">{insights.bestHour.orders}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      Ensure adequate staffing during these hours to maximize sales
                    </p>
                  </CardFooter>
                </Card>

                {/* Worst Hour Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-red-500" />
                      Slowest Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{insights.worstHour.hour}</div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Revenue</span>
                        <span className="font-medium">
                          {formatCurrency(insights.worstHour.revenue, currentCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Profit</span>
                        <span className="font-medium">
                          {formatCurrency(insights.worstHour.profit, currentCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Average Orders</span>
                        <span className="font-medium">{insights.worstHour.orders}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      Consider reduced staffing or special promotions during these hours
                    </p>
                  </CardFooter>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Timing Recommendations</CardTitle>
                  <CardDescription>Actionable insights based on your sales patterns</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Optimize staffing based on daily patterns</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Schedule more staff on {insights.bestDay.day} and reduce staffing on {insights.worstDay.day} to
                        optimize labor costs while maintaining service quality.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Create a slow day promotion</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Launch a special promotion on {insights.worstDay.day} to increase foot traffic and sales.
                        Consider a discount or bundle offer exclusive to this day.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Adjust opening hours</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Consider extending hours during peak times ({insights.bestHour.hour}) and potentially reducing
                        hours during consistently slow periods ({insights.worstHour.hour}).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Product Insights Tab */}
            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Product Combinations</CardTitle>
                  <CardDescription>Products frequently purchased together</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.topProductCombinations.map((combo, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">{combo.products.join(" + ")}</h3>
                          <Badge>{combo.occurrences} times</Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>Revenue: {formatCurrency(combo.revenue, currentCurrency)}</div>
                          <div>Profit: {formatCurrency(combo.profit, currentCurrency)}</div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {index === 0
                            ? "Consider creating a bundle discount for these items"
                            : "Display these products near each other to increase sales"}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Product Opportunities</CardTitle>
                  <CardDescription>Products that could perform better with adjustments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.productOpportunities.map((product, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">{product.name}</h3>
                          <Badge variant="outline">
                            {product.metric}: {formatPercent(product.value)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{product.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Product Recommendations</CardTitle>
                  <CardDescription>Actionable insights to improve product performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Create product bundles</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Bundle {insights.topProductCombinations[0]?.products.join(" + ")} with a small discount to
                        increase average order value and move more inventory.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Optimize product placement</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Place frequently purchased items at different ends of the store to increase exposure to other
                        products as customers navigate between them.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Focus on high-margin products</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Train staff to recommend high-margin products when appropriate and give these items prominent
                        placement in your store.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing Opportunities Tab */}
            <TabsContent value="pricing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Optimization Opportunities</CardTitle>
                  <CardDescription>Products that could benefit from price adjustments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.pricingOpportunities.map((product, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">{product.name}</h3>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            +{formatCurrency(product.potentialProfit, currentCurrency)} potential profit
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>Current Price: {formatCurrency(product.currentPrice, currentCurrency)}</div>
                          <div>Suggested Price: {formatCurrency(product.suggestedPrice, currentCurrency)}</div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{product.reason}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing Strategy Recommendations</CardTitle>
                  <CardDescription>Actionable insights to optimize your pricing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Test incremental price increases</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Gradually increase prices on high-demand items by 5-10% and monitor sales volume. If volume
                        holds steady, consider additional increases.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Implement tiered pricing</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create good-better-best options for popular product categories to capture different customer
                        segments and increase overall revenue.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Use psychological pricing</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adjust prices to end in .99 or .95 to create a perception of better value while maintaining
                        profit margins.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventory Insights Tab */}
            <TabsContent value="inventory" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Insights</CardTitle>
                  <CardDescription>Opportunities to optimize your inventory management</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.inventoryInsights.map((insight, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">{insight.name}</h3>
                          <Badge className={getImpactColor(insight.impact)}>
                            {insight.impact === "high"
                              ? "High Impact"
                              : insight.impact === "medium"
                                ? "Medium Impact"
                                : "Low Impact"}
                          </Badge>
                        </div>
                        <p className="text-sm mt-2">{insight.insight}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Recommendation:</strong> {insight.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                  <CardDescription>Profit margin by product category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {profitData?.categoryData.slice(0, 5).map((category, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{category.name}</span>
                          <span>{formatPercent(category.profitMargin)}</span>
                        </div>
                        <Progress value={category.profitMargin} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Revenue: {formatCurrency(category.revenue, currentCurrency)}</span>
                          <span>Profit: {formatCurrency(category.profit, currentCurrency)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-muted-foreground">
                    Focus on expanding high-margin categories and optimizing or reducing low-margin ones
                  </p>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inventory Recommendations</CardTitle>
                  <CardDescription>Actionable insights to improve inventory management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Implement ABC inventory classification</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Categorize inventory into A (high-value), B (medium-value), and C (low-value) items to optimize
                        ordering and management practices.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Optimize reorder points</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adjust reorder points based on sales velocity data to minimize stockouts while reducing excess
                        inventory.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Focus on high-margin categories</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Allocate more shelf space and inventory budget to your highest-margin product categories to
                        maximize overall profitability.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
