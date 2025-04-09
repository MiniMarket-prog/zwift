"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, ArrowUpRight, ArrowDownRight, CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  getYear,
  getWeek,
  parseISO,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from "date-fns"
import type { Category, PeriodOption, DateRange, RevenueSummary, Sale } from "@/lib/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { fetchSalesData, fetchCategories } from "@/lib/supabase-client3"

export default function RevenuePage() {
  // State variables
  const [categories, setCategories] = useState<Category[]>([])
  const [previousDateRange, setPreviousDateRange] = useState<DateRange>({
    from: subDays(new Date(), 60),
    to: subDays(new Date(), 31),
  })
  const [currency, setCurrency] = useState<string>("USD")

  // Pagination state for tables
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  // Revenue target state
  const [revenueTarget, setRevenueTarget] = useState(10000)
  const [targetPeriod, setTargetPeriod] = useState<"day" | "week" | "month" | "year">("month")

  // Search state for product table
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<"name" | "revenue" | "quantity">("revenue")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Refs for charts
  const revenueChartRef = useRef<HTMLCanvasElement>(null)
  const categoryChartRef = useRef<HTMLCanvasElement>(null)
  const paymentMethodChartRef = useRef<HTMLCanvasElement>(null)
  const hourlyChartRef = useRef<HTMLCanvasElement>(null)
  const weekdayChartRef = useRef<HTMLCanvasElement>(null)

  // Hooks
  const { toast } = useToast()

  // State for date range and period selection
  const [period, setPeriod] = useState<PeriodOption>("last30days")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [isCustomPeriod, setIsCustomPeriod] = useState(false)

  // State for sales data and loading state
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("daily")

  // Currency settings
  const [currencySymbol, setCurrencySymbol] = useState<string>("DH ")

  // Handle period change
  const handlePeriodChange = (newPeriod: PeriodOption) => {
    setPeriod(newPeriod)

    const now = new Date()

    // If it's a custom period, just update the period state and return
    if (newPeriod === "custom") {
      setIsCustomPeriod(true)
      return
    }

    setIsCustomPeriod(false)

    let from: Date
    let to: Date

    switch (newPeriod) {
      case "today":
        from = startOfDay(now)
        to = endOfDay(now)
        break
      case "yesterday":
        from = startOfDay(subDays(now, 1))
        to = endOfDay(subDays(now, 1))
        break
      case "last7days":
        from = subDays(now, 7)
        to = now
        break
      case "last30days":
        from = subDays(now, 30)
        to = now
        break
      case "thisMonth":
        from = startOfMonth(now)
        to = now
        break
      case "lastMonth":
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1)
        from = startOfMonth(lastMonthDate)
        to = endOfMonth(lastMonthDate)
        break
      case "thisYear":
        from = startOfYear(now)
        to = now
        break
      case "lastYear":
        const lastYearDate = new Date(now.getFullYear() - 1, 0)
        from = startOfYear(lastYearDate)
        to = endOfYear(lastYearDate)
        break
      default:
        from = subDays(now, 30)
        to = now
    }

    setDateRange({ from, to })
  }

  // Handle custom date range change
  const handleCustomDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from) {
      setDateRange({
        from: range.from,
        to: range.to || range.from,
      })
    }
  }

  // Fetch sales data
  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const salesData = await fetchSalesData(dateRange.from, dateRange.to)
      setSales(salesData)

      // Also fetch categories
      const categoriesData = await fetchCategories()
      setCategories(categoriesData)
    } catch (err) {
      console.error("Error loading data:", err)
      setError("Failed to load revenue data. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load revenue data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate revenue summary
  const revenueSummary = useMemo<RevenueSummary>(() => {
    const summary: RevenueSummary = {
      total: 0,
      dailyData: [],
      weeklyData: [],
      monthlyData: [],
      dailyRevenue: {},
    }

    // Calculate total revenue
    summary.total = sales.reduce((sum, sale) => sum + sale.total, 0)

    // Group by day
    const dailyMap = new Map<string, number>()
    const weeklyMap = new Map<string, number>()
    const monthlyMap = new Map<string, number>()

    // Initialize date ranges
    if (sales.length > 0) {
      // Create arrays of all days, weeks, and months in the range
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
      const weeks = eachWeekOfInterval({ start: dateRange.from, end: dateRange.to })
      const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to })

      // Initialize with zero values
      days.forEach((day) => {
        const dayStr = format(day, "yyyy-MM-dd")
        dailyMap.set(dayStr, 0)
        summary.dailyRevenue![dayStr] = 0
      })

      weeks.forEach((week) => {
        const weekStr = `${getYear(week)}-W${getWeek(week)}`
        weeklyMap.set(weekStr, 0)
      })

      months.forEach((month) => {
        const monthStr = format(month, "yyyy-MM")
        monthlyMap.set(monthStr, 0)
      })

      // Add sales data
      sales.forEach((sale) => {
        const saleDate = typeof sale.created_at === "string" ? parseISO(sale.created_at) : new Date(sale.created_at)

        const dayStr = format(saleDate, "yyyy-MM-dd")
        const weekStr = `${getYear(saleDate)}-W${getWeek(saleDate)}`
        const monthStr = format(saleDate, "yyyy-MM")

        dailyMap.set(dayStr, (dailyMap.get(dayStr) || 0) + sale.total)
        weeklyMap.set(weekStr, (weeklyMap.get(weekStr) || 0) + sale.total)
        monthlyMap.set(monthStr, (monthlyMap.get(monthStr) || 0) + sale.total)

        // Also update dailyRevenue for backward compatibility
        summary.dailyRevenue![dayStr] = (summary.dailyRevenue![dayStr] || 0) + sale.total
      })
    }

    // Convert maps to arrays for charts
    summary.dailyData = Array.from(dailyMap.entries())
      .map(([date, revenue]) => ({
        date,
        revenue,
        formattedDate: format(parseISO(date), "MMM dd"),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    summary.weeklyData = Array.from(weeklyMap.entries())
      .map(([week, revenue]) => ({
        week,
        revenue,
        formattedWeek: `Week ${week.split("-W")[1]}`,
      }))
      .sort((a, b) => a.week.localeCompare(b.week))

    summary.monthlyData = Array.from(monthlyMap.entries())
      .map(([month, revenue]) => {
        const [year, monthNum] = month.split("-")
        return {
          month,
          revenue,
          formattedMonth: format(new Date(Number.parseInt(year), Number.parseInt(monthNum) - 1, 1), "MMM yyyy"),
        }
      })
      .sort((a, b) => a.month.localeCompare(b.month))

    return summary
  }, [sales, dateRange])

  // Format currency
  const formatCurrency = (value: number): string => {
    return `${currencySymbol}${value.toFixed(2)}`
  }

  // Initial data load
  useEffect(() => {
    fetchData()
  }, [dateRange])

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg">Loading revenue data...</p>
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

  // Export to CSV
  const exportToCSV = () => {
    // Create CSV content
    const headers = ["Date", "Revenue"]
    const csvRows = [headers]

    // Add daily data
    revenueSummary.dailyData.forEach((day) => {
      csvRows.push([day.date, day.revenue.toString()])
    })

    // Convert to CSV string
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((row) => row.join(",")).join("\n")

    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `revenue_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Successful",
      description: "Revenue data has been exported to CSV",
    })
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Total Revenue</h1>
          <p className="text-muted-foreground">Chiffre d'affaires</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
          {/* Period selector */}
          <Select value={period} onValueChange={(value: PeriodOption) => handlePeriodChange(value)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
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
          {isCustomPeriod && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
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

          <Button variant="outline" onClick={exportToCSV}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Total Revenue Card */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-lg">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-white">{formatCurrency(revenueSummary.total)}</div>
          <p className="text-sm text-blue-100 mt-1">
            {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
          </p>
        </CardContent>
      </Card>

      {/* Revenue Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueSummary.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="formattedDate" />
                  <YAxis tickFormatter={(value) => `${currencySymbol}${value}`} />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value)}`, "Revenue"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="weekly" className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueSummary.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="formattedWeek" />
                  <YAxis tickFormatter={(value) => `${currencySymbol}${value}`} />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value)}`, "Revenue"]}
                    labelFormatter={(label) => `Week: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="monthly" className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueSummary.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="formattedMonth" />
                  <YAxis tickFormatter={(value) => `${currencySymbol}${value}`} />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value)}`, "Revenue"]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Date/Time</th>
                  <th className="text-left py-3 px-4 font-medium">ID</th>
                  <th className="text-left py-3 px-4 font-medium">Payment</th>
                  <th className="text-right py-3 px-4 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 10).map((sale) => (
                  <tr key={sale.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">{format(new Date(sale.created_at), "MMM dd, yyyy HH:mm")}</td>
                    <td className="py-3 px-4">{sale.id.substring(0, 8)}</td>
                    <td className="py-3 px-4 capitalize">{sale.payment_method}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(sale.total)}</td>
                  </tr>
                ))}

                {sales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No sales found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={3} className="py-3 px-4 font-medium text-right">
                    Total ({sales.length} transactions):
                  </td>
                  <td className="py-3 px-4 text-right font-bold">{formatCurrency(revenueSummary.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
