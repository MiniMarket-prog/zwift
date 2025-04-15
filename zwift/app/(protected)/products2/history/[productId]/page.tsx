"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import {
  CalendarIcon,
  Download,
  ArrowLeft,
  Loader2,
  TrendingUp,
  Clock,
  CalendarPlus2Icon as CalendarIcon2,
} from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/format-currency"
import type { DateRange } from "@/lib/types"
import { useRouter } from "next/navigation"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

// Define types for our product history data
type ProductHistoryItem = {
  id: string
  product_id: string
  quantity: number
  price: number
  discount?: number
  created_at: string
  sale_id: string
}

// Fix the ProductData type definition to handle both array and object formats for category
type ProductData = {
  id: string
  name: string
  purchase_price: number | null
  price: number
  stock: number
  min_stock: number
  category_id: string | null
  category?:
    | {
        name: string
      }
    | Array<{ name: string }>
}

type PeriodOption = "last7days" | "last30days" | "thisMonth" | "lastMonth" | "thisYear" | "lastYear" | "custom"

type DailySalesData = {
  date: string
  formattedDate: string
  revenue: number
  quantity: number
  profit: number
}

type HourlySalesData = {
  hour: string
  formattedHour: string
  revenue: number
  quantity: number
}

export default function ProductDetailHistoryPage({ params }: { params: { productId: string } }) {
  const router = useRouter()
  const productId = params.productId

  // State for active tab
  const [activeTab, setActiveTab] = useState<string>("overview")

  // State for period selection
  const [period, setPeriod] = useState<PeriodOption>("last30days")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(false)

  // State for product data
  const [productHistory, setProductHistory] = useState<ProductHistoryItem[]>([])
  const [productData, setProductData] = useState<ProductData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [currency, setCurrency] = useState<string>("DH")

  // Add pagination state variables
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)

  // State for chart data
  const [dailySalesData, setDailySalesData] = useState<DailySalesData[]>([])
  const [hourlySalesData, setHourlySalesData] = useState<HourlySalesData[]>([])

  // Function to get date range based on period
  const getDateRange = (selectedPeriod: PeriodOption): DateRange => {
    const today = new Date()

    switch (selectedPeriod) {
      case "last7days":
        return { from: subDays(today, 7), to: today }
      case "last30days":
        return { from: subDays(today, 30), to: today }
      case "thisMonth":
        return { from: startOfMonth(today), to: today }
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(today), 1)
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
      case "thisYear":
        return { from: startOfYear(today), to: today }
      case "lastYear":
        const lastYear = new Date(today.getFullYear() - 1, 0, 1)
        return { from: startOfYear(lastYear), to: endOfYear(lastYear) }
      case "custom":
        return dateRange
      default:
        return { from: subDays(today, 30), to: today }
    }
  }

  // Handle period change
  const handlePeriodChange = (newPeriod: PeriodOption) => {
    setPeriod(newPeriod)
    setIsCustomPeriod(newPeriod === "custom")

    if (newPeriod !== "custom") {
      const newRange = getDateRange(newPeriod)
      setDateRange(newRange)
    }
  }

  // Fetch product data and history
  const fetchProductData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch product details
      const { data: product, error: productError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          purchase_price,
          price,
          stock,
          min_stock,
          category_id,
          category:category_id (
            name
          )
        `)
        .eq("id", productId)
        .single()

      if (productError) {
        console.error("Error fetching product:", productError)
        throw productError
      }

      // Process category data if needed
      const processedProduct = { ...product }
      if (product && product.category) {
        // Keep the category as is - it could be an object or an array
        // We'll handle the different formats when we need to access properties
        processedProduct.category = product.category
      }

      setProductData(processedProduct as ProductData)

      // Fetch product history
      const range = getDateRange(period)
      const fromDate = format(range.from, "yyyy-MM-dd")
      const toDate = format(range.to, "yyyy-MM-dd 23:59:59")

      // Implement pagination to fetch all data
      let allProductHistory: ProductHistoryItem[] = []
      let hasMore = true
      let page = 0
      const PAGE_SIZE = 1000 // Supabase's maximum limit

      while (hasMore) {
        const { data: historyData, error: historyError } = await supabase
          .from("sale_items")
          .select(`
            id,
            product_id,
            quantity,
            price,
            discount,
            created_at,
            sale_id
          `)
          .eq("product_id", productId)
          .gte("created_at", fromDate)
          .lte("created_at", toDate)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
          .order("created_at", { ascending: true })

        if (historyError) {
          console.error("Error fetching product history:", historyError)
          throw historyError
        }

        if (historyData && historyData.length > 0) {
          allProductHistory = [...allProductHistory, ...historyData]
          page++
          hasMore = historyData.length === PAGE_SIZE
        } else {
          hasMore = false
        }
      }

      setProductHistory(allProductHistory)

      // Process data for charts
      processChartData(allProductHistory, processedProduct as ProductData)

      // Fetch currency setting
      const { data: settingsData } = await supabase.from("settings").select("currency").eq("type", "global").single()

      if (settingsData?.currency) {
        setCurrency(settingsData.currency)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Process data for charts
  const processChartData = (history: ProductHistoryItem[], product: ProductData) => {
    // Process daily sales data
    const dailyMap = new Map<string, DailySalesData>()

    history.forEach((item) => {
      const date = format(new Date(item.created_at), "yyyy-MM-dd")
      const discount = item.discount || 0
      const sellingPrice = item.price * (1 - discount / 100)
      const revenue = sellingPrice * item.quantity
      const cost = (product?.purchase_price || 0) * item.quantity
      const profit = revenue - cost

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          formattedDate: format(new Date(item.created_at), "MMM d"),
          revenue: 0,
          quantity: 0,
          profit: 0,
        })
      }

      const dailyData = dailyMap.get(date)!
      dailyData.revenue += revenue
      dailyData.quantity += item.quantity
      dailyData.profit += profit
    })

    const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    setDailySalesData(dailyData)

    // Process hourly sales data
    const hourlyMap = new Map<string, HourlySalesData>()

    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, "0")
      hourlyMap.set(hour, {
        hour,
        formattedHour: `${i % 12 === 0 ? 12 : i % 12}${i < 12 ? "am" : "pm"}`,
        revenue: 0,
        quantity: 0,
      })
    }

    history.forEach((item) => {
      const hour = format(new Date(item.created_at), "HH")
      const discount = item.discount || 0
      const sellingPrice = item.price * (1 - discount / 100)
      const revenue = sellingPrice * item.quantity

      const hourlyData = hourlyMap.get(hour)!
      hourlyData.revenue += revenue
      hourlyData.quantity += item.quantity
    })

    const hourlyData = Array.from(hourlyMap.values())
      .filter((item) => item.quantity > 0) // Only include hours with sales
      .sort((a, b) => Number.parseInt(a.hour) - Number.parseInt(b.hour))

    setHourlySalesData(hourlyData)
  }

  // Calculate profit for a product history item
  const calculateProfit = (item: ProductHistoryItem): number => {
    if (productData?.purchase_price === null || productData?.purchase_price === undefined) {
      return 0
    }

    const discount = item.discount || 0
    const sellingPrice = item.price * (1 - discount / 100)
    const cost = productData.purchase_price

    return (sellingPrice - cost) * item.quantity
  }

  // Export data to CSV
  const exportToCSV = () => {
    if (productHistory.length === 0 || !productData) return

    // Create CSV headers
    const headers = ["Date", "Product", "Category", "Quantity", "Price", "Discount", "Revenue", "Cost", "Profit"]

    // Create CSV rows
    const rows = productHistory.map((item) => {
      const discount = item.discount || 0
      const sellingPrice = item.price * (1 - discount / 100)
      const revenue = sellingPrice * item.quantity
      const cost = (productData?.purchase_price || 0) * item.quantity
      const profit = calculateProfit(item)

      // Handle category properly
      let categoryName = "Uncategorized"
      if (productData?.category) {
        if (Array.isArray(productData.category)) {
          categoryName = productData.category[0]?.name || "Uncategorized"
        } else {
          categoryName = productData.category.name || "Uncategorized"
        }
      }

      return [
        format(new Date(item.created_at), "yyyy-MM-dd HH:mm:ss"),
        productData?.name || "",
        categoryName,
        item.quantity.toString(),
        item.price.toString(),
        discount ? `${discount}%` : "0%",
        revenue.toString(),
        cost.toString(),
        profit.toString(),
      ]
    })

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${productData?.name}-history-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Fetch data when period changes
  useEffect(() => {
    fetchProductData()
  }, [period, dateRange, productId])

  // Calculate summary statistics
  const summary = useMemo(() => {
    let totalQuantity = 0
    let totalRevenue = 0
    let totalCost = 0
    let totalProfit = 0

    productHistory.forEach((item) => {
      const discount = item.discount || 0
      const sellingPrice = item.price * (1 - discount / 100)
      const revenue = sellingPrice * item.quantity
      const cost = (productData?.purchase_price || 0) * item.quantity
      const profit = calculateProfit(item)

      totalQuantity += item.quantity
      totalRevenue += revenue
      totalCost += cost
      totalProfit += profit
    })

    // Find best selling day and hour
    let bestSellingDay = { date: "", quantity: 0 }
    let bestSellingHour = { hour: "", quantity: 0 }

    if (dailySalesData.length > 0) {
      bestSellingDay = dailySalesData.reduce(
        (max, day) => (day.quantity > max.quantity ? { date: day.formattedDate, quantity: day.quantity } : max),
        { date: "", quantity: 0 },
      )
    }

    if (hourlySalesData.length > 0) {
      bestSellingHour = hourlySalesData.reduce(
        (max, hour) => (hour.quantity > max.quantity ? { hour: hour.formattedHour, quantity: hour.quantity } : max),
        { hour: "", quantity: 0 },
      )
    }

    return {
      totalItems: productHistory.length,
      totalQuantity,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      averagePrice: totalQuantity > 0 ? totalRevenue / totalQuantity : 0,
      bestSellingDay,
      bestSellingHour,
    }
  }, [productHistory, productData, dailySalesData, hourlySalesData])

  // Add this computed value for paginated history
  const paginatedHistory = useMemo(() => {
    const start = currentPage * itemsPerPage
    const end = start + itemsPerPage
    return productHistory.slice(start, end)
  }, [productHistory, currentPage, itemsPerPage])

  // Find the date with the highest sales
  const bestDay = useMemo(() => {
    if (dailySalesData.length === 0) return null
    return dailySalesData.reduce((max, day) => (day.quantity > max.quantity ? day : max), dailySalesData[0])
  }, [dailySalesData])

  // Find the hour with the highest sales
  const bestHour = useMemo(() => {
    if (hourlySalesData.length === 0) return null
    return hourlySalesData.reduce((max, hour) => (hour.quantity > max.quantity ? hour : max), hourlySalesData[0])
  }, [hourlySalesData])

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Products
          </Button>
          <h1 className="text-3xl font-bold">{productData?.name || "Product"}</h1>
          <p className="text-muted-foreground">
            {(() => {
              if (!productData?.category) return "Uncategorized"
              if (Array.isArray(productData.category)) {
                return productData.category[0]?.name || "Uncategorized"
              }
              return productData.category.name || "Uncategorized"
            })()}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
          {/* Period selector */}
          <Select value={period} onValueChange={(value) => handlePeriodChange(value as PeriodOption)}>
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
          {isCustomPeriod && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[150px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "MMM dd, yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[150px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Button variant="outline" onClick={exportToCSV} disabled={productHistory.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Price</CardTitle>
            <CardDescription>Current selling price</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(productData?.price || 0, currency)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Stock</CardTitle>
            <CardDescription>Available inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-3xl font-bold">{productData?.stock || 0}</div>
              <div
                className={`ml-2 h-3 w-3 rounded-full ${
                  productData && productData.stock > productData.min_stock ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Minimum stock level: {productData?.min_stock || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
            <CardDescription>Revenue and profit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(summary.totalRevenue, currency)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              → Profit: {formatCurrency(summary.totalProfit, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="salesHistory">Sales History</TabsTrigger>
          <TabsTrigger value="stockHistory">Stock History</TabsTrigger>
          <TabsTrigger value="priceHistory">Price History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Sales by Day Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <CalendarIcon2 className="mr-2 h-5 w-5 text-muted-foreground" />
                    <CardTitle>Sales by Day</CardTitle>
                  </div>
                  <CardDescription>Daily sales pattern for {productData?.name || "this product"}</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {dailySalesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailySalesData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="formattedDate" />
                        <YAxis yAxisId="left" orientation="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value, currency), ""]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#8884d8" />
                        <Bar yAxisId="right" dataKey="quantity" name="Quantity" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-muted-foreground">No sales data available for this period</p>
                    </div>
                  )}
                </CardContent>
                {bestDay && (
                  <CardFooter className="text-sm text-muted-foreground">
                    Best selling day: {bestDay.formattedDate} with {bestDay.quantity} units sold
                  </CardFooter>
                )}
              </Card>

              {/* Sales by Hour Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-muted-foreground" />
                    <CardTitle>Sales by Hour</CardTitle>
                  </div>
                  <CardDescription>Hourly sales pattern for {productData?.name || "this product"}</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {hourlySalesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlySalesData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="formattedHour" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            name === "quantity" ? value : formatCurrency(value, currency),
                            name === "quantity" ? "Units Sold" : "Revenue",
                          ]}
                          labelFormatter={(label) => `Time: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="quantity" name="Units Sold" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-muted-foreground">No hourly sales data available for this period</p>
                    </div>
                  )}
                </CardContent>
                {bestHour && (
                  <CardFooter className="text-sm text-muted-foreground">
                    Best selling hour: {bestHour.formattedHour} with {bestHour.quantity} units sold
                  </CardFooter>
                )}
              </Card>

              {/* Profit Analysis Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-muted-foreground" />
                    <CardTitle>Profit Analysis</CardTitle>
                  </div>
                  <CardDescription>Revenue vs. Cost breakdown</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {dailySalesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailySalesData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="formattedDate" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value, currency), ""]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#8884d8" strokeWidth={2} />
                        <Line type="monotone" dataKey="profit" name="Profit" stroke="#82ca9d" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <p className="text-muted-foreground">No profit data available for this period</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Sales History Tab */}
        <TabsContent value="salesHistory">
          <Card>
            <CardHeader>
              <CardTitle>Sales History</CardTitle>
              <CardDescription>
                Showing {productHistory.length} sales for {productData?.name || "this product"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : productHistory.length > 0 ? (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Quantity</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Price</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Discount</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Revenue</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Cost</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Profit</th>
                          <th className="px-4 py-3 text-right text-sm font-medium">Sale ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {paginatedHistory.map((item) => {
                          const discount = item.discount || 0
                          const sellingPrice = item.price * (1 - discount / 100)
                          const revenue = sellingPrice * item.quantity
                          const cost = (productData?.purchase_price || 0) * item.quantity
                          const profit = calculateProfit(item)
                          const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0

                          return (
                            <tr key={item.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 text-sm">
                                {format(new Date(item.created_at), "MMM d, yyyy h:mm a")}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.price, currency)}</td>
                              <td className="px-4 py-3 text-sm text-right">{discount > 0 ? `${discount}%` : "-"}</td>
                              <td className="px-4 py-3 text-sm text-right">{formatCurrency(revenue, currency)}</td>
                              <td className="px-4 py-3 text-sm text-right">{formatCurrency(cost, currency)}</td>
                              <td
                                className={`px-4 py-3 text-sm text-right font-medium ${
                                  profit > 0 ? "text-green-500" : profit < 0 ? "text-red-500" : ""
                                }`}
                              >
                                {formatCurrency(profit, currency)}
                                <span className="text-xs text-muted-foreground ml-1">({profitMargin.toFixed(1)}%)</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0"
                                  onClick={() => (window.location.href = `/sales/${item.sale_id}`)}
                                >
                                  #{item.sale_id.substring(0, 8)}
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination controls */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {Math.min(currentPage * itemsPerPage + 1, productHistory.length)} to{" "}
                      {Math.min((currentPage + 1) * itemsPerPage, productHistory.length)} of {productHistory.length}{" "}
                      entries
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            (prev + 1) * itemsPerPage < productHistory.length ? prev + 1 : prev,
                          )
                        }
                        disabled={(currentPage + 1) * itemsPerPage >= productHistory.length}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No sales history found for this product in the selected period.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock History Tab - Placeholder for future implementation */}
        <TabsContent value="stockHistory">
          <Card>
            <CardHeader>
              <CardTitle>Stock History</CardTitle>
              <CardDescription>Stock level changes over time</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex justify-center items-center">
              <p className="text-muted-foreground">Stock history tracking will be available in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price History Tab - Placeholder for future implementation */}
        <TabsContent value="priceHistory">
          <Card>
            <CardHeader>
              <CardTitle>Price History</CardTitle>
              <CardDescription>Price changes over time</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex justify-center items-center">
              <p className="text-muted-foreground">Price history tracking will be available in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
