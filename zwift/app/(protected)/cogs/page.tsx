"use client"

import { useState, useEffect, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CalendarIcon,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"

import type { PeriodOption, DateRange } from "@/lib/types"
import { fetchCOGSData, type COGSData } from "@/lib/cogs-service"
import { formatCurrency, getCurrentCurrency, type SupportedCurrency } from "@/lib/format-currency"
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
// Add the missing import for createClient
import { createClient } from "@/lib/supabase-client3"

export default function COGSPage() {
  // State variables
  const [period, setPeriod] = useState<PeriodOption>("last30days")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [cogsData, setCOGSData] = useState<COGSData | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<"name" | "cost" | "revenue" | "profit" | "margin" | "quantity">("cost")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currency, setCurrency] = useState<SupportedCurrency>("USD")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Hooks
  const { toast } = useToast()

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
        from = new Date(now.setHours(0, 0, 0, 0))
        to = new Date()
        break
      case "yesterday":
        from = new Date(subDays(now, 1).setHours(0, 0, 0, 0))
        to = new Date(subDays(now, 1).setHours(23, 59, 59, 999))
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

  // Fetch COGS data
  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch currency setting
      const supabase = createClient()
      const currencyValue = await getCurrentCurrency(supabase)
      setCurrency(currencyValue as SupportedCurrency)

      const data = await fetchCOGSData(dateRange.from, dateRange.to)
      setCOGSData(data)
    } catch (err) {
      console.error("Error loading data:", err)
      setError("Failed to load COGS data. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load COGS data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    fetchData()
  }, [dateRange])

  // Remove this function:
  // const formatCurrency = (value: number): string => {
  //   return `${currency}${value.toFixed(2)}`
  // }

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

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!cogsData) return []

    // Convert object to array
    const productsArray = Object.entries(cogsData.cogsByProduct).map(([id, product]) => ({
      id,
      ...product,
    }))

    // Apply search filter
    let filtered = productsArray
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((product) => product.name.toLowerCase().includes(term))
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortField === "name") {
        // Use string comparison for the name field
        return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      } else {
        // Use numeric comparison for other fields
        if (sortDirection === "asc") {
          return a[sortField] - b[sortField]
        } else {
          return b[sortField] - a[sortField]
        }
      }
    })

    return filtered
  }, [cogsData, searchTerm, sortField, sortDirection])

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize)
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle sort change
  const handleSortChange = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    if (!cogsData) return

    // Create CSV content
    const headers = ["Date", "COGS", "Revenue", "Profit"]
    const csvRows = [headers]

    // Add daily data
    cogsData.dailyData.forEach((day) => {
      csvRows.push([day.date, String(day.cogs || 0), String(day.revenue || 0), String(day.profit || 0)])
    })

    // Convert to CSV string
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((row) => row.join(",")).join("\n")

    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `cogs_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Successful",
      description: "COGS data has been exported to CSV",
    })
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-lg">Loading COGS data...</p>
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

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cost of Goods Sold</h1>
          <p className="text-muted-foreground">Coût d'achat des marchandises vendues</p>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total COGS</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(cogsData?.totalCOGS || 0, currency, "en")}</div>
                <p className="text-xs text-muted-foreground mt-1">Cost of all products sold</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(cogsData?.grossProfit || 0, currency, "en")}</div>
                <p className="text-xs text-muted-foreground mt-1">Revenue minus COGS</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
                <Badge variant={cogsData?.grossMargin && cogsData.grossMargin > 0 ? "outline" : "destructive"}>
                  {formatPercentage(cogsData?.grossMargin || 0)}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(cogsData?.grossMargin || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Gross profit as percentage of revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cogsData?.itemsSold || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Across {cogsData?.salesCount || 0} sales</p>
              </CardContent>
            </Card>
          </div>

          {/* COGS vs Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>COGS vs Revenue</CardTitle>
              <CardDescription>Daily comparison of cost vs revenue</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cogsData?.dailyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="formattedDate" />
                  <YAxis tickFormatter={(value) => formatCurrency(value, currency, "en").split(".")[0]} />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value, currency, "en")}`, ""]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="cogs" name="COGS" fill="#ef4444" />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Products by COGS */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products by COGS</CardTitle>
              <CardDescription>Products with highest cost of goods sold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center">
                    <div className="w-6 text-center font-medium text-muted-foreground">
                      {filteredProducts.indexOf(product) + 1}
                    </div>
                    <div className="ml-2 flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.quantity} units · {formatCurrency(product.cost, currency, "en")}
                      </div>
                    </div>
                    <div className="ml-auto">
                      <Progress
                        value={filteredProducts[0].cost > 0 ? (product.cost / filteredProducts[0].cost) * 100 : 0}
                        className="h-2 w-24"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex gap-2">
              <Select value={sortField} onValueChange={(value: any) => handleSortChange(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cost">Sort by Cost</SelectItem>
                  <SelectItem value="revenue">Sort by Revenue</SelectItem>
                  <SelectItem value="profit">Sort by Profit</SelectItem>
                  <SelectItem value="margin">Sort by Margin</SelectItem>
                  <SelectItem value="quantity">Sort by Quantity</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}>
                {sortDirection === "asc" ? "Ascending" : "Descending"}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">Product</th>
                      <th className="text-right py-3 px-4 font-medium">Quantity</th>
                      <th className="text-right py-3 px-4 font-medium">Cost (COGS)</th>
                      <th className="text-right py-3 px-4 font-medium">Revenue</th>
                      <th className="text-right py-3 px-4 font-medium">Profit</th>
                      <th className="text-right py-3 px-4 font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{product.name}</td>
                        <td className="py-3 px-4 text-right">{product.quantity}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(product.cost, currency, "en")}
                        </td>
                        <td className="py-3 px-4 text-right">{formatCurrency(product.revenue, currency, "en")}</td>
                        <td
                          className={`py-3 px-4 text-right font-medium ${product.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(product.profit, currency, "en")}
                        </td>
                        <td
                          className={`py-3 px-4 text-right ${product.margin >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatPercentage(product.margin)}
                        </td>
                      </tr>
                    ))}

                    {paginatedProducts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground">
                          No products found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between py-4">
              <div className="text-sm text-muted-foreground">
                Showing {paginatedProducts.length} of {filteredProducts.length} products
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>COGS by Category</CardTitle>
              <CardDescription>Cost breakdown by product category</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(cogsData?.cogsByCategory || {}).map(([category, cost]) => ({
                    category,
                    cost,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis tickFormatter={(value) => formatCurrency(value, currency, "en").split(".")[0]} />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value, currency, "en")}`, "COGS"]}
                    labelFormatter={(label) => `Category: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="cost" name="COGS" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">Category</th>
                      <th className="text-right py-3 px-4 font-medium">COGS</th>
                      <th className="text-right py-3 px-4 font-medium">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(cogsData?.cogsByCategory || {})
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, cost]) => (
                        <tr key={category} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">{category}</td>
                          <td className="py-3 px-4 text-right font-medium">{formatCurrency(cost, currency, "en")}</td>
                          <td className="py-3 px-4 text-right">
                            {formatPercentage((cost / (cogsData?.totalCOGS || 1)) * 100)}
                          </td>
                        </tr>
                      ))}

                    {Object.keys(cogsData?.cogsByCategory || {}).length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-muted-foreground">
                          No category data found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/50">
                      <td className="py-3 px-4 font-medium">Total</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(cogsData?.totalCOGS || 0, currency, "en")}
                      </td>
                      <td className="py-3 px-4 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>COGS and Profit Trends</CardTitle>
              <CardDescription>Daily cost and profit analysis</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cogsData?.dailyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="formattedDate" />
                  <YAxis tickFormatter={(value) => formatCurrency(value, currency, "en").split(".")[0]} />
                  <Tooltip
                    formatter={(value: number) => [`${formatCurrency(value, currency, "en")}`, ""]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="cogs" name="COGS" fill="#ef4444" />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>COGS to Revenue Ratio</CardTitle>
                <CardDescription>How much of your revenue goes to product costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-[200px]">
                  <div className="text-5xl font-bold">
                    {formatPercentage(cogsData?.totalRevenue ? (cogsData.totalCOGS / cogsData.totalRevenue) * 100 : 0)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">of revenue spent on product costs</p>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>COGS</span>
                    <span>{formatCurrency(cogsData?.totalCOGS || 0, currency, "en")}</span>
                  </div>
                  <Progress
                    value={cogsData?.totalRevenue ? (cogsData.totalCOGS / cogsData.totalRevenue) * 100 : 0}
                    className="h-2"
                  />
                  <div className="flex justify-between text-sm mt-1">
                    <span>Revenue</span>
                    <span>{formatCurrency(cogsData?.totalRevenue || 0, currency, "en")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit Margin Analysis</CardTitle>
                <CardDescription>Breakdown of your gross profit margin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-[200px]">
                  <div className="text-5xl font-bold">{formatPercentage(cogsData?.grossMargin || 0)}</div>
                  <p className="text-sm text-muted-foreground mt-2">gross profit margin</p>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>COGS</span>
                    <span>
                      {formatPercentage(
                        cogsData?.totalRevenue ? (cogsData.totalCOGS / cogsData.totalRevenue) * 100 : 0,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Profit</span>
                    <span>
                      {formatPercentage(
                        cogsData?.totalRevenue ? (cogsData.grossProfit / cogsData.totalRevenue) * 100 : 0,
                      )}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-red-500"
                      style={{
                        width: `${cogsData?.totalRevenue ? (cogsData.totalCOGS / cogsData.totalRevenue) * 100 : 0}%`,
                        float: "left",
                      }}
                    ></div>
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${cogsData?.totalRevenue ? (cogsData.grossProfit / cogsData.totalRevenue) * 100 : 0}%`,
                        float: "left",
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
