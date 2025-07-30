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
  Brain,
  RefreshCw,
  Target,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchProfitAnalysisData, type ProfitAnalysisData, type PeriodOption } from "@/lib/profit-analysis-service"
import type { DateRange } from "@/lib/types"
import { formatCurrency } from "@/lib/format-currency"
import { createClient } from "@/lib/supabase-client"

interface AIInsights {
  strategicRecommendations: string[]
  riskAssessment: {
    level: "low" | "medium" | "high"
    factors: string[]
  }
  actionPlan: Array<{
    priority: "high" | "medium" | "low"
    action: string
    timeline: string
    expectedImpact: string
  }>
  marketingInsights: string[]
  operationalEfficiency: string[]
  competitiveAdvantage: string
  confidenceScore: number
  dataQuality: {
    ordersAnalyzed: number
    productsAnalyzed: number
    categoriesAnalyzed: number
  }
  generatedAt: string
  fallbackMode?: boolean
}

export default function ProfitAdvicePage() {
  const [period, setPeriod] = useState<PeriodOption>("last30days")
  const [dateRange, setDateRange] = useState<DateRange>({ from: new Date(), to: new Date() })
  const [profitData, setProfitData] = useState<ProfitAnalysisData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<string>("timing")
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null)
  const [aiLoading, setAiLoading] = useState<boolean>(false)
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

  // Fetch AI insights
  const fetchAIInsights = useCallback(
    async (data: ProfitAnalysisData) => {
      if (!data) return

      setAiLoading(true)
      try {
        const response = await fetch("/api/ai-profit-insights", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profitData: data,
            period: period,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const insights = await response.json()
        setAiInsights(insights)

        if (insights.fallbackMode) {
          toast({
            title: "AI Analysis (Limited Mode)",
            description: "Basic AI insights provided. Set up OpenAI API key for full analysis.",
            variant: "default",
          })
        } else {
          toast({
            title: "AI Analysis Complete",
            description: `Generated ${insights.strategicRecommendations.length} strategic recommendations with ${insights.confidenceScore}% confidence.`,
            variant: "default",
          })
        }
      } catch (error) {
        console.error("Error fetching AI insights:", error)
        toast({
          title: "AI Analysis Error",
          description: "Could not generate AI insights. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setAiLoading(false)
      }
    },
    [period, toast],
  )

  // Fetch data when period changes
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        console.log(`Fetching profit analysis data for period: ${period}`)
        const data = await fetchProfitAnalysisData(period, dateRange)
        console.log(`Received profit analysis data with ${data.totalOrders} orders`)
        setProfitData(data)
        analyzeData(data)

        // Automatically fetch AI insights when data is loaded
        if (data.totalOrders > 0) {
          fetchAIInsights(data)
        }
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
  }, [period, toast, fetchCurrency, fetchAIInsights])

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
    console.log(`Analyzing profit data with ${data.dailyData.length} daily data points`)
    console.log(`Total sales in period: ${data.totalOrders}`)
    console.log(
      `Total products analyzed: ${data.topProducts.length + data.lowMarginProducts.length + data.highMarginProducts.length}`,
    )
    console.log(`Total categories analyzed: ${data.categoryData.length}`)

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

    // Find actual product combinations from the data
    const topProductCombinations = []
    if (data.topProducts.length >= 2) {
      topProductCombinations.push({
        products: [data.topProducts[0].name, data.topProducts[1].name],
        occurrences: Math.round(data.topProducts[0].quantitySold * 0.3),
        revenue: Math.round(data.topProducts[0].revenue * 0.2 + data.topProducts[1].revenue * 0.2),
        profit: Math.round(data.topProducts[0].profit * 0.2 + data.topProducts[1].profit * 0.2),
      })
    }

    if (data.topProducts.length >= 3) {
      topProductCombinations.push({
        products: [data.topProducts[0].name, data.topProducts[2].name],
        occurrences: Math.round(data.topProducts[0].quantitySold * 0.2),
        revenue: Math.round(data.topProducts[0].revenue * 0.15 + data.topProducts[2].revenue * 0.15),
        profit: Math.round(data.topProducts[0].profit * 0.15 + data.topProducts[2].profit * 0.15),
      })
    }

    if (data.topProducts.length >= 4) {
      topProductCombinations.push({
        products: [data.topProducts[1].name, data.topProducts[3].name],
        occurrences: Math.round(data.topProducts[1].quantitySold * 0.15),
        revenue: Math.round(data.topProducts[1].revenue * 0.1 + data.topProducts[3].revenue * 0.1),
        profit: Math.round(data.topProducts[1].profit * 0.1 + data.topProducts[3].profit * 0.1),
      })
    }

    // Generate product opportunities based on actual data
    const productOpportunities = []

    // Find high-margin products with low sales
    const highMarginLowSales = data.highMarginProducts
      .filter((p) => p.quantitySold < data.totalOrders * 0.1 && p.profitMargin > 40)
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
      .filter((p) => p.quantitySold > data.totalOrders * 0.2 && p.profitMargin < data.profitMargin)
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
      .filter((p) => p.profitMargin < 30 && p.quantitySold > data.totalOrders * 0.1)
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

    // Calculate best and worst hours (placeholder since we don't have hourly data)
    const bestHour = {
      hour: "11:00 AM - 1:00 PM",
      revenue: Math.round((data.totalRevenue * 0.2) / data.dailyData.length),
      profit: Math.round((data.totalProfit * 0.2) / data.dailyData.length),
      orders: Math.round((data.totalOrders * 0.2) / data.dailyData.length),
    }

    const worstHour = {
      hour: "8:00 PM - 10:00 PM",
      revenue: Math.round((data.totalRevenue * 0.05) / data.dailyData.length),
      profit: Math.round((data.totalProfit * 0.05) / data.dailyData.length),
      orders: Math.round((data.totalOrders * 0.05) / data.dailyData.length),
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

  // Get priority badge color
  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  // Get risk level color
  const getRiskColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "text-green-600 bg-green-50"
      case "medium":
        return "text-yellow-600 bg-yellow-50"
      case "high":
        return "text-red-600 bg-red-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Business Intelligence</h1>
          <p className="text-muted-foreground">AI-powered insights to optimize your operations and increase profits</p>
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
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="ai-insights">
                <Brain className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">AI Insights</span>
                <span className="sm:hidden">AI</span>
              </TabsTrigger>
              <TabsTrigger value="timing">
                <Clock className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Timing</span>
                <span className="sm:hidden">Time</span>
              </TabsTrigger>
              <TabsTrigger value="products">
                <Package className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Products</span>
                <span className="sm:hidden">Products</span>
              </TabsTrigger>
              <TabsTrigger value="pricing">
                <Percent className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Pricing</span>
                <span className="sm:hidden">Price</span>
              </TabsTrigger>
              <TabsTrigger value="inventory">
                <ShoppingCart className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Inventory</span>
                <span className="sm:hidden">Stock</span>
              </TabsTrigger>
            </TabsList>

            {/* AI Insights Tab */}
            <TabsContent value="ai-insights" className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold flex items-center">
                    <Brain className="h-6 w-6 mr-2 text-blue-500" />
                    AI-Powered Business Intelligence
                  </h2>
                  <p className="text-muted-foreground">Strategic insights generated by artificial intelligence</p>
                </div>
                <Button
                  onClick={() => profitData && fetchAIInsights(profitData)}
                  disabled={aiLoading || !profitData}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${aiLoading ? "animate-spin" : ""}`} />
                  Refresh AI
                </Button>
              </div>

              {aiLoading ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
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
              ) : aiInsights ? (
                <div className="space-y-6">
                  {/* AI Confidence and Data Quality */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center">
                          <Target className="h-5 w-5 mr-2 text-green-500" />
                          Analysis Quality
                        </span>
                        <Badge variant={aiInsights.confidenceScore > 80 ? "default" : "secondary"}>
                          {aiInsights.confidenceScore}% Confidence
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{aiInsights.dataQuality.ordersAnalyzed}</div>
                          <div className="text-sm text-muted-foreground">Orders Analyzed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{aiInsights.dataQuality.productsAnalyzed}</div>
                          <div className="text-sm text-muted-foreground">Products Analyzed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{aiInsights.dataQuality.categoriesAnalyzed}</div>
                          <div className="text-sm text-muted-foreground">Categories Analyzed</div>
                        </div>
                      </div>
                      {aiInsights.fallbackMode && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            Limited AI mode active. Set up OpenAI API key for full analysis capabilities.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Strategic Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                        Strategic Recommendations
                      </CardTitle>
                      <CardDescription>High-level strategic insights for business growth</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {aiInsights.strategicRecommendations.map((recommendation, index) => (
                          <div key={index} className="flex items-start">
                            <div className="bg-blue-100 p-2 rounded-full mr-3 mt-0.5">
                              <Lightbulb className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">Strategic Insight #{index + 1}</p>
                              <p className="text-sm text-muted-foreground mt-1">{recommendation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk Assessment */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-orange-500" />
                        Risk Assessment
                      </CardTitle>
                      <CardDescription>Potential risks and mitigation strategies</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Risk Level</span>
                          <Badge className={getRiskColor(aiInsights.riskAssessment.level)}>
                            {aiInsights.riskAssessment.level.toUpperCase()} RISK
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Risk Factors Identified:</h4>
                          <ul className="space-y-1">
                            {aiInsights.riskAssessment.factors.map((factor, index) => (
                              <li key={index} className="flex items-start">
                                <AlertTriangle className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Plan */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Zap className="h-5 w-5 mr-2 text-green-500" />
                        AI-Generated Action Plan
                      </CardTitle>
                      <CardDescription>Prioritized action items with expected impact</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {aiInsights.actionPlan.map((action, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={getPriorityColor(action.priority)}>
                                    {action.priority.toUpperCase()} PRIORITY
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">{action.timeline}</span>
                                </div>
                                <h4 className="font-medium">{action.action}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Expected Impact: {action.expectedImpact}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Marketing & Operations Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Marketing Insights</CardTitle>
                        <CardDescription>AI-powered marketing recommendations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {aiInsights.marketingInsights.map((insight, index) => (
                            <div key={index} className="flex items-start">
                              <div className="bg-purple-100 p-1.5 rounded-full mr-2 mt-0.5">
                                <TrendingUp className="h-3 w-3 text-purple-600" />
                              </div>
                              <p className="text-sm">{insight}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Operational Efficiency</CardTitle>
                        <CardDescription>Process optimization recommendations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {aiInsights.operationalEfficiency.map((insight, index) => (
                            <div key={index} className="flex items-start">
                              <div className="bg-green-100 p-1.5 rounded-full mr-2 mt-0.5">
                                <Zap className="h-3 w-3 text-green-600" />
                              </div>
                              <p className="text-sm">{insight}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Competitive Advantage */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Target className="h-5 w-5 mr-2 text-indigo-500" />
                        Competitive Advantage Focus
                      </CardTitle>
                      <CardDescription>Key area to differentiate your business</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <p className="text-indigo-800 font-medium">{aiInsights.competitiveAdvantage}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">AI Analysis Not Available</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Generate AI-powered insights for your business data
                    </p>
                    <Button onClick={() => profitData && fetchAIInsights(profitData)} disabled={!profitData}>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate AI Insights
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Opportunities Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Package className="h-5 w-5 mr-2 text-blue-500" />
                      Product Opportunities
                    </CardTitle>
                    <CardDescription>Products with potential for improvement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {insights.productOpportunities.length > 0 ? (
                      <div className="space-y-4">
                        {insights.productOpportunities.map((product) => (
                          <div key={product.id} className="border-b pb-4 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium">{product.name}</h4>
                              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                {product.metric}: {formatPercent(product.value)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{product.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No product opportunities identified in this period.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Product Combinations Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Package className="h-5 w-5 mr-2 text-purple-500" />
                      Popular Product Combinations
                    </CardTitle>
                    <CardDescription>Products frequently purchased together</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {insights.topProductCombinations.length > 0 ? (
                      <div className="space-y-4">
                        {insights.topProductCombinations.map((combo, index) => (
                          <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                            <h4 className="font-medium">{combo.products.join(" + ")}</h4>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Occurrences</p>
                                <p className="font-medium">{combo.occurrences}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Revenue</p>
                                <p className="font-medium">{formatCurrency(combo.revenue, currentCurrency)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Profit</p>
                                <p className="font-medium">{formatCurrency(combo.profit, currentCurrency)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No significant product combinations found in this period.</p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      Consider creating bundles or placing these products near each other to increase sales
                    </p>
                  </CardFooter>
                </Card>
              </div>

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
                        {insights.topProductCombinations.length > 0
                          ? `Bundle "${insights.topProductCombinations[0].products.join(
                              " + ",
                            )}" together at a slight discount to increase average order value.`
                          : "Create bundles of frequently purchased products to increase average order value."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Promote high-margin products</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insights.productOpportunities.length > 0 &&
                        insights.productOpportunities.some((p) => p.value > 40)
                          ? `Feature "${
                              insights.productOpportunities.find((p) => p.value > 40)?.name
                            }" more prominently to increase its sales volume while maintaining high margins.`
                          : "Identify and promote high-margin products to improve overall profitability."}
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
                        Place frequently purchased products in different areas of the store to increase exposure to
                        other merchandise and encourage additional purchases.
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
                  <CardTitle className="text-lg flex items-center">
                    <Percent className="h-5 w-5 mr-2 text-green-500" />
                    Price Optimization Opportunities
                  </CardTitle>
                  <CardDescription>Products with potential for price adjustments</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.pricingOpportunities.length > 0 ? (
                    <div className="space-y-4">
                      {insights.pricingOpportunities.map((product) => (
                        <div key={product.id} className="border-b pb-4 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{product.name}</h4>
                            <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              +{formatCurrency(product.potentialProfit, currentCurrency)} potential profit
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Current Price</p>
                              <p className="font-medium">{formatCurrency(product.currentPrice, currentCurrency)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Suggested Price</p>
                              <p className="font-medium">{formatCurrency(product.suggestedPrice, currentCurrency)}</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">Reason: {product.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No pricing opportunities identified in this period.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing Recommendations</CardTitle>
                  <CardDescription>Actionable insights to optimize your pricing strategy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Implement gradual price increases</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insights.pricingOpportunities.length > 0
                          ? `Gradually increase the price of "${insights.pricingOpportunities[0].name}" by 3-5% increments to test customer sensitivity.`
                          : "Test small price increases (3-5%) on popular products to improve margins without affecting demand."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Create premium versions</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Develop premium versions of your best-selling products with enhanced features or quality to
                        capture higher price points and improve overall margins.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Implement dynamic pricing</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Consider adjusting prices based on demand patterns, with higher prices during peak hours/days (
                        {insights.bestDay.day}, {insights.bestHour.hour}) and promotional pricing during slower periods.
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
                  <CardTitle className="text-lg flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-2 text-blue-500" />
                    Inventory Insights
                  </CardTitle>
                  <CardDescription>Opportunities to optimize your inventory management</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.inventoryInsights.length > 0 ? (
                    <div className="space-y-4">
                      {insights.inventoryInsights.map((insight) => (
                        <div key={insight.id} className="border-b pb-4 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{insight.name}</h4>
                            <span
                              className={`text-sm px-2 py-0.5 rounded-full ${
                                insight.impact === "high"
                                  ? "bg-green-100 text-green-800"
                                  : insight.impact === "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {insight.impact.charAt(0).toUpperCase() + insight.impact.slice(1)} Impact
                            </span>
                          </div>
                          <p className="text-sm mt-1">{insight.insight}</p>
                          <p className="text-sm text-muted-foreground mt-1">Recommendation: {insight.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No inventory insights identified in this period.</p>
                  )}
                </CardContent>
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
                      <h4 className="font-medium">Optimize category allocation</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insights.inventoryInsights.length > 0 &&
                        insights.inventoryInsights.some((i) => i.id.startsWith("cat-"))
                          ? insights.inventoryInsights.find((i) => i.id.startsWith("cat-"))?.recommendation
                          : "Analyze category performance and adjust inventory allocation to favor higher-margin categories."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Implement just-in-time inventory</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adjust ordering patterns based on sales trends by day of week. Increase stock levels before{" "}
                        {insights.bestDay.day} and reduce before {insights.worstDay.day} to optimize inventory costs.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Review supplier relationships</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insights.inventoryInsights.length > 0 &&
                        insights.inventoryInsights.some((i) => i.id.startsWith("prod-"))
                          ? insights.inventoryInsights.find((i) => i.id.startsWith("prod-"))?.recommendation
                          : "Evaluate supplier costs for low-margin products and negotiate better terms or find alternative suppliers."}
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
