"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CalendarIcon,
  DollarSign,
  TrendingUp,
  BarChartIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { format as formatDate } from "date-fns"

import type { DateRange } from "@/lib/types"
import {
  fetchProfitAnalysisData,
  type ProfitAnalysisData,
  type PeriodOption as ServicePeriodOption,
} from "@/lib/profit-analysis-service"
import { useCurrency } from "@/hooks/use-currency"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts"

export default function ProfitAnalysisPage() {
  // State variables
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  const [period, setPeriod] = useState<ServicePeriodOption>("last30days")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [profitData, setProfitData] = useState<ProfitAnalysisData | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const { currency, format, isLoading: currencyLoading } = useCurrency()

  // Hooks
  const { toast } = useToast()

  // Handle custom date range change
  const handleCustomDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from) {
      setDateRange({
        from: range.from,
        to: range.to || range.from,
      })
    }
  }

  // Fetch profit analysis data
  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use the period directly with the custom date range if needed
      const data = await fetchProfitAnalysisData(period, period === "custom" ? dateRange : undefined)
      setProfitData(data)
    } catch (err) {
      console.error("Error loading data:", err)
      setError("Failed to load profit analysis data. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load profit analysis data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    fetchData()
  }, [period])

  // When date range changes and period is custom, refetch data
  useEffect(() => {
    if (period === "custom") {
      fetchData()
    }
  }, [dateRange.from, dateRange.to])

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`
  }

  // Format growth indicator with proper sign and color
  const formatGrowth = (value: number) => {
    if (value > 0) {
      return (
        <div className="flex items-center text-green-500">
          <ArrowUpRight className="h-4 w-4 mr-1" />
          <span>+{value.toFixed(1)}%</span>
        </div>
      )
    } else if (value < 0) {
      return (
        <div className="flex items-center text-red-500">
          <ArrowDownRight className="h-4 w-4 mr-1" />
          <span>{value.toFixed(1)}%</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center text-muted-foreground">
          <span>0%</span>
        </div>
      )
    }
  }

  // Safe format function to handle null/undefined values
  const safeFormat = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return format(0)
    }
    return format(Number(value))
  }

  // Render loading state
  if (isLoading || currencyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg">Loading profit analysis data...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button className="mt-4" onClick={fetchData}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No data state
  if (!profitData) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-xl font-semibold mb-2">No profit data available</h2>
        <p className="text-muted-foreground mb-4">Try selecting a different date range or check your sales data.</p>
        <Button onClick={fetchData}>Refresh Data</Button>
      </div>
    )
  }

  // COLORS for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Profit Analysis</h1>
          <p className="text-muted-foreground">Comprehensive analysis of your business profitability</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
          {/* Period selector */}
          <Select value={period} onValueChange={(value: ServicePeriodOption) => setPeriod(value)}>
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
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom date range picker */}
          {period === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {formatDate(dateRange.from, "LLL dd, y")} - {formatDate(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      formatDate(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Pick date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range) => handleCustomDateRangeChange(range || {})}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Profit Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeFormat(profitData.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total sales revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">COGS</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeFormat(profitData.totalCogs)}</div>
                <p className="text-xs text-muted-foreground mt-1">Cost of goods sold</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <Badge variant={profitData?.totalProfit && profitData.totalProfit > 0 ? "outline" : "destructive"}>
                  {safeFormat(profitData.totalProfit)}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeFormat(profitData.totalProfit)}</div>
                <p className="text-xs text-muted-foreground mt-1">Revenue minus costs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                <BarChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(profitData.profitMargin || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Net profit as percentage of revenue</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue vs COGS Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs COGS</CardTitle>
              <CardDescription>Daily comparison of revenue and COGS</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={profitData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="formattedDate" />
                  <YAxis tickFormatter={(value) => safeFormat(value).split(".")[0]} />
                  <Tooltip
                    formatter={(value: number) => [safeFormat(value), ""]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                  <Bar dataKey="cogs" name="COGS" fill="#ef4444" />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Profitable Products</CardTitle>
              <CardDescription>Products with highest profit contribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profitData.topProducts &&
                  profitData.topProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-6 text-center font-medium text-muted-foreground">{index + 1}</div>
                      <div className="ml-2 flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {safeFormat(product.profit)} · {formatPercentage(product.profitMargin || 0)}
                        </div>
                      </div>
                      <div className="ml-auto">
                        <Progress
                          value={
                            profitData.topProducts && profitData.topProducts[0] && profitData.topProducts[0].profit > 0
                              ? (product.profit / profitData.topProducts[0].profit) * 100
                              : 0
                          }
                          className="h-2 w-24"
                          indicatorClassName={cn(product.profit >= 0 ? "bg-green-500" : "bg-red-500")}
                        />
                      </div>
                    </div>
                  ))}

                {(!profitData.topProducts || profitData.topProducts.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">No product data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit and Margin Trends</CardTitle>
              <CardDescription>Daily profit and margin analysis</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={profitData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="formattedDate" />
                  <YAxis yAxisId="left" tickFormatter={(value) => safeFormat(value).split(".")[0]} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "profitMargin") return [`${value.toFixed(2)}%`, "Margin %"]
                      return [safeFormat(value), name]
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="profit" name="Profit" fill="#10b981" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="profitMargin"
                    name="Margin %"
                    stroke="#8884d8"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue to Profit Ratio</CardTitle>
                <CardDescription>How much of your revenue becomes profit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-[200px]">
                  <div className="text-5xl font-bold">{formatPercentage(profitData.profitMargin || 0)}</div>
                  <p className="text-sm text-muted-foreground mt-2">of revenue becomes profit</p>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>COGS</span>
                    <span>{safeFormat(profitData.totalCogs)}</span>
                  </div>
                  <Progress
                    value={profitData.totalRevenue > 0 ? (profitData.totalCogs / profitData.totalRevenue) * 100 : 0}
                    className="h-2"
                    indicatorClassName="bg-red-500"
                  />
                  <div className="flex justify-between text-sm mt-1">
                    <span>Revenue</span>
                    <span>{safeFormat(profitData.totalRevenue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Comparison</CardTitle>
                <CardDescription>Compare profit data by month</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitData.monthlyData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="formattedMonth" />
                    <YAxis tickFormatter={(value) => safeFormat(value).split(".")[0]} />
                    <Tooltip formatter={(value: number) => [safeFormat(value), "Profit"]} />
                    <Legend />
                    <Bar dataKey="profit" name="Profit" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profit Data Table</CardTitle>
              <CardDescription>Detailed profit data for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 text-left font-medium">Date</th>
                      <th className="h-10 px-4 text-right font-medium">Revenue</th>
                      <th className="h-10 px-4 text-right font-medium">COGS</th>
                      <th className="h-10 px-4 text-right font-medium">Profit</th>
                      <th className="h-10 px-4 text-right font-medium">Margin</th>
                      <th className="h-10 px-4 text-right font-medium">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitData.dailyData.map((day, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-muted/50"}>
                        <td className="p-2 px-4 align-middle">{day.formattedDate}</td>
                        <td className="p-2 px-4 align-middle text-right">{safeFormat(day.revenue)}</td>
                        <td className="p-2 px-4 align-middle text-right">{safeFormat(day.cogs)}</td>
                        <td className="p-2 px-4 align-middle text-right font-medium">{safeFormat(day.profit)}</td>
                        <td className="p-2 px-4 align-middle text-right">{formatPercentage(day.profitMargin || 0)}</td>
                        <td className="p-2 px-4 align-middle text-right">{day.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/50">
                      <td className="p-2 px-4 align-middle font-medium">Total</td>
                      <td className="p-2 px-4 align-middle text-right font-medium">
                        {safeFormat(profitData.totalRevenue)}
                      </td>
                      <td className="p-2 px-4 align-middle text-right font-medium">
                        {safeFormat(profitData.totalCogs)}
                      </td>
                      <td className="p-2 px-4 align-middle text-right font-medium">
                        {safeFormat(profitData.totalProfit)}
                      </td>
                      <td className="p-2 px-4 align-middle text-right font-medium">
                        {formatPercentage(profitData.profitMargin || 0)}
                      </td>
                      <td className="p-2 px-4 align-middle text-right font-medium">{profitData.totalOrders}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
