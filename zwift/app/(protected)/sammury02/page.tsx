"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Download,
  Calendar,
  RefreshCw,
  Loader2,
  DollarSign,
  CreditCard,
  TrendingUp,
  Search,
  CheckCircle,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/format-currency"
import { useLanguage } from "@/hooks/use-language"
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts"

// Define types to match actual Supabase response
type ProductInfo = {
  id: string
  name: string
  purchase_price: number | null
}

type SaleItemData = {
  id: string
  product_id: string
  quantity: number
  price: number
  discount?: number
  sale_id?: string
  products: ProductInfo
}

type SaleData = {
  id: string
  created_at: string
  total: number
  payment_method: string
  sale_items?: SaleItemData[]
}

type DateRange = {
  from: Date
  to: Date
}

type PeriodOption = "today" | "yesterday" | "last7days" | "last30days" | "thisMonth" | "lastMonth" | "thisYear"| "custom"

// Cache for storing fetched data
const dataCache = new Map<string, { data: SaleData[]; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export default function SalesReportsPage() {
  // State management
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [loadingStage, setLoadingStage] = useState<string>("")
  const [dataFetchComplete, setDataFetchComplete] = useState(false)
  const [period, setPeriod] = useState<PeriodOption>("today") // Set today as default
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(), // Today's date
    to: new Date(), // Today's date
  })
  const [isCustomPeriod, setIsCustomPeriod] = useState(false)
  const [salesData, setSalesData] = useState<SaleData[]>([])
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [currency, setCurrency] = useState<string>("USD")

  const { language, getAppTranslation } = useLanguage()
  const { toast } = useToast()
  const supabase = createClient()

  // Debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Generate cache key for current query
  const getCacheKey = useCallback((fromDate: string, toDate: string, paymentFilter: string) => {
    return `sales_${fromDate}_${toDate}_${paymentFilter}`
  }, [])

  // Check if cache is valid
  const isCacheValid = useCallback((timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION
  }, [])

  // Period change handler - match original logic exactly
  const handlePeriodChange = (newPeriod: PeriodOption) => {
    setPeriod(newPeriod)
    const today = new Date()

    switch (newPeriod) {
      case "today":
        setDateRange({ from: today, to: today })
        setIsCustomPeriod(false)
        break
      case "yesterday":
        const yesterday = subDays(today, 1)
        setDateRange({ from: yesterday, to: yesterday })
        setIsCustomPeriod(false)
        break
      case "last7days":
        setDateRange({ from: subDays(today, 7), to: today })
        setIsCustomPeriod(false)
        break
      case "last30days":
        setDateRange({ from: subDays(today, 30), to: today })
        setIsCustomPeriod(false)
        break
      case "thisMonth":
        setDateRange({ from: startOfMonth(today), to: today })
        setIsCustomPeriod(false)
        break
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(today), 1)
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) })
        setIsCustomPeriod(false)
        break
              case "thisYear":
        setDateRange({ from: startOfYear(today), to: today })
        setIsCustomPeriod(false)
        break
      case "custom":
        setIsCustomPeriod(true)
        break
    }
  }

  // Simplified data fetching to match original exactly
  const fetchSalesData = useCallback(
    async (forceRefresh = false) => {
      try {
        setIsLoading(true)
        setDataFetchComplete(false)
        setLoadingStage("Initializing...")

        if (!dateRange || !dateRange.from || !dateRange.to) {
          console.error("Date range is undefined or incomplete")
          return
        }

        // Use exact same date formatting as original
        const fromDate = format(dateRange.from, "yyyy-MM-dd")
        const toDate = format(dateRange.to, "yyyy-MM-dd 23:59:59")
        const cacheKey = getCacheKey(fromDate, toDate, paymentMethodFilter)

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
          const cached = dataCache.get(cacheKey)
          if (cached && isCacheValid(cached.timestamp)) {
            console.log("Using cached data")
            setLoadingStage("Loading from cache...")

            let filteredData = cached.data
            if (debouncedSearchTerm) {
              filteredData = filteredData.filter((sale) =>
                sale.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
              )
            }

            setSalesData(filteredData)
            setDataFetchComplete(true)
            setIsLoading(false)
            setIsInitialLoad(false)
            return
          }
        }

        setLoadingStage("Fetching sales data...")

        // Use the EXACT same query structure as your original working code
        const PAGE_SIZE = 500 // Back to original size
        let allSalesData: SaleData[] = []
        let hasMore = true
        let page = 0

        while (hasMore) {
          setLoadingStage(`Loading page ${page + 1}...`)

          // Match the original query exactly
          let query = supabase
            .from("sales")
            .select(`
              *,
              sale_items (
                id, 
                product_id, 
                quantity,
                price,
                discount,
                products (
                  id, 
                  name,
                  purchase_price
                )
              )
            `)
            .gte("created_at", fromDate)
            .lte("created_at", toDate)
            .order("created_at", { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

          if (paymentMethodFilter !== "all") {
            query = query.eq("payment_method", paymentMethodFilter)
          }

          const { data, error } = await query

          if (error) {
            console.error("Supabase query error:", error)
            throw error
          }

          if (data && data.length > 0) {
            allSalesData = [...allSalesData, ...data]
            page++
            hasMore = data.length === PAGE_SIZE
          } else {
            hasMore = false
          }
        }

        setLoadingStage("Processing data...")

        // Cache the data
        dataCache.set(cacheKey, {
          data: allSalesData,
          timestamp: Date.now(),
        })

        // Apply search filter
        let finalData = allSalesData
        if (debouncedSearchTerm) {
          finalData = finalData.filter((sale) => sale.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
        }

        setSalesData(finalData)
        setDataFetchComplete(true)

        setLoadingStage("Complete!")
        setTimeout(() => setLoadingStage(""), 1000)
      } catch (error) {
        console.error("Error fetching sales data:", error)
        setLoadingStage("Error occurred")
        toast({
          title: getAppTranslation("error", language),
          description: getAppTranslation("failed_fetch_sales", language),
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
        setIsInitialLoad(false)
      }
    },
    [
      dateRange,
      paymentMethodFilter,
      debouncedSearchTerm,
      toast,
      supabase,
      getAppTranslation,
      language,
      getCacheKey,
      isCacheValid,
    ],
  )

  // Settings fetch with caching
  const fetchSettings = useCallback(async () => {
    try {
      setLoadingStage("Loading settings...")

      // Check if settings are already cached in localStorage
      const cachedSettings = localStorage.getItem("app_settings")
      const cachedTimestamp = localStorage.getItem("app_settings_timestamp")

      if (cachedSettings && cachedTimestamp) {
        const isValid = Date.now() - Number.parseInt(cachedTimestamp) < CACHE_DURATION
        if (isValid) {
          const settings = JSON.parse(cachedSettings)
          setCurrency(settings.currency || "USD")
          return
        }
      }

      let { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("*")
        .eq("type", "global")
        .single()

      if (settingsError || !settingsData) {
        const { data: systemData, error: systemError } = await supabase
          .from("settings")
          .select("*")
          .eq("type", "system")
          .single()

        if (!systemError && systemData) {
          settingsData = systemData
          settingsError = null
        }
      }

      if (!settingsError && settingsData) {
        let currencyValue = "USD"

        if (settingsData.settings && typeof settingsData.settings === "object" && settingsData.settings !== null) {
          if ("currency" in settingsData.settings && typeof settingsData.settings.currency === "string") {
            currencyValue = settingsData.settings.currency
          }
        }

        if (settingsData.currency && typeof settingsData.currency === "string") {
          currencyValue = settingsData.currency
        }

        setCurrency(currencyValue)

        // Cache settings
        localStorage.setItem("app_settings", JSON.stringify({ currency: currencyValue }))
        localStorage.setItem("app_settings_timestamp", Date.now().toString())
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    }
  }, [supabase])

  // Use EXACT same calculation logic as original
  const salesSummary = useMemo(() => {
    const totalSales = salesData.reduce((sum, sale) => sum + sale.total, 0)
    const averageSale = salesData.length > 0 ? totalSales / salesData.length : 0

    const paymentMethods = salesData.reduce(
      (acc, sale) => {
        acc[sale.payment_method] = (acc[sale.payment_method] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    let totalCost = 0
    let totalProfit = 0
    let itemsWithProfitCount = 0

    const salesByDay: Record<string, { sales: number; profit: number }> = {}

    salesData.forEach((sale) => {
      const day = format(new Date(sale.created_at), "yyyy-MM-dd")

      if (!salesByDay[day]) {
        salesByDay[day] = { sales: 0, profit: 0 }
      }

      salesByDay[day].sales += sale.total

      if (sale.sale_items && sale.sale_items.length > 0) {
        sale.sale_items.forEach((item) => {
          const purchasePrice = item.products?.purchase_price || null

          if (purchasePrice !== null) {
            // Use EXACT same calculation as original
            const discount = item.discount || 0
            const priceAfterDiscount = item.price * (1 - discount / 100)
            const itemCost = purchasePrice * item.quantity
            const itemRevenue = priceAfterDiscount * item.quantity
            const itemProfit = itemRevenue - itemCost

            totalCost += itemCost
            totalProfit += itemProfit
            itemsWithProfitCount++

            salesByDay[day].profit += itemProfit
          }
        })
      }
    })

    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0
    const averageProfit = itemsWithProfitCount > 0 ? totalProfit / itemsWithProfitCount : 0

    return {
      totalSales,
      totalCost,
      totalProfit,
      profitMargin,
      averageSale,
      averageProfit,
      transactionCount: salesData.length,
      paymentMethods,
      salesByDay,
    }
  }, [salesData])

  // Optimized chart data transformation
  const chartData = useMemo(() => {
    const sortedDates = Object.keys(salesSummary.salesByDay).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    )

    return sortedDates.map((date) => ({
      date: format(new Date(date), "MMM dd"),
      sales: salesSummary.salesByDay[date].sales,
      profit: salesSummary.salesByDay[date].profit,
    }))
  }, [salesSummary.salesByDay])

  // Export function
  const exportToCSV = () => {
    const headers = ["ID", "Date", "Total", "Payment Method"]
    const csvRows = [headers]

    salesData.forEach((sale) => {
      csvRows.push([
        sale.id,
        format(new Date(sale.created_at), "yyyy-MM-dd HH:mm:ss"),
        sale.total.toString(),
        sale.payment_method,
      ])
    })

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((row) => row.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `sales_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: getAppTranslation("export_successful", language),
      description: `${getAppTranslation("report_exported", language)} sales_report_${format(new Date(), "yyyy-MM-dd")}.csv`,
    })
  }

  // Force refresh function
  const handleRefresh = () => {
    // Clear cache for current query
    const fromDate = format(dateRange.from, "yyyy-MM-dd")
    const toDate = format(dateRange.to, "yyyy-MM-dd 23:59:59")
    const cacheKey = getCacheKey(fromDate, toDate, paymentMethodFilter)
    dataCache.delete(cacheKey)

    fetchSalesData(true)
  }

  // Initial data fetch
  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    fetchSalesData()
  }, [fetchSalesData])

  // Helper function to get top products
  const getTopProducts = () => {
    const productStats: Record<
      string,
      {
        id: string
        name: string
        quantity: number
        revenue: number
        profit: number
      }
    > = {}

    salesData.forEach((sale) => {
      if (sale.sale_items && sale.sale_items.length > 0) {
        sale.sale_items.forEach((item) => {
          const product = item.products
          if (product) {
            if (!productStats[product.id]) {
              productStats[product.id] = {
                id: product.id,
                name: product.name,
                quantity: 0,
                revenue: 0,
                profit: 0,
              }
            }

            const discount = item.discount || 0
            const priceAfterDiscount = item.price * (1 - discount / 100)
            const itemRevenue = priceAfterDiscount * item.quantity
            const itemCost = (product.purchase_price || 0) * item.quantity
            const itemProfit = itemRevenue - itemCost

            productStats[product.id].quantity += item.quantity
            productStats[product.id].revenue += itemRevenue
            productStats[product.id].profit += itemProfit
          }
        })
      }
    })

    return Object.values(productStats).sort((a, b) => b.revenue - a.revenue)
  }

  // Helper function to get payment method statistics
  const getPaymentMethodStats = () => {
    const methodStats: Record<string, { count: number; revenue: number }> = {}

    salesData.forEach((sale) => {
      if (!methodStats[sale.payment_method]) {
        methodStats[sale.payment_method] = { count: 0, revenue: 0 }
      }
      methodStats[sale.payment_method].count += 1
      methodStats[sale.payment_method].revenue += sale.total
    })

    const totalRevenue = salesSummary.totalSales

    return Object.entries(methodStats)
      .map(([method, stats]) => ({
        method,
        count: stats.count,
        revenue: stats.revenue,
        percentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              {getAppTranslation("reports", language)}
            </h1>
            <p className="text-slate-600 mt-1">Sales analytics and insights</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Select value={period} onValueChange={(value: PeriodOption) => handlePeriodChange(value)}>
              <SelectTrigger className="w-full md:w-[180px] bg-white border-slate-200 shadow-sm">
                <SelectValue placeholder={getAppTranslation("select_period", language)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{getAppTranslation("today", language)}</SelectItem>
                <SelectItem value="yesterday">{getAppTranslation("yesterday", language)}</SelectItem>
                <SelectItem value="last7days">{getAppTranslation("last_7_days", language)}</SelectItem>
                <SelectItem value="last30days">{getAppTranslation("last_30_days", language)}</SelectItem>
                <SelectItem value="thisMonth">{getAppTranslation("this_month", language)}</SelectItem>
                <SelectItem value="lastMonth">{getAppTranslation("last_month", language)}</SelectItem>
                <SelectItem value="thisYear">{getAppTranslation("this_Year", language)}</SelectItem>
                <SelectItem value="custom">{getAppTranslation("custom_range", language)}</SelectItem>
              </SelectContent>
            </Select>

            {isCustomPeriod && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto bg-white border-slate-200 shadow-sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      getAppTranslation("pick_date_range", language)
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={{
                      from: dateRange?.from,
                      to: dateRange?.to,
                    }}
                    onSelect={(range) => {
                      if (range?.from) setDateRange({ from: range.from, to: range.to || range.from })
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}

            <Button onClick={exportToCSV} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Download className="mr-2 h-4 w-4" />
              {getAppTranslation("export", language)}
            </Button>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
              className="bg-white border-slate-200 shadow-sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              {getAppTranslation("refresh", language)}
            </Button>
          </div>
        </div>

        {/* Enhanced Loading Indicator */}
        {isLoading && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <div className="absolute inset-0 h-6 w-6 border-2 border-blue-200 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700">Loading Data</p>
                  <p className="text-xs text-blue-600">{loadingStage}</p>
                </div>
              </div>
              {dataFetchComplete && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Complete</span>
                </div>
              )}
            </div>

            {/* Progress bar animation */}
            <div className="mt-3 w-full bg-blue-100 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full animate-pulse"
                style={{ width: dataFetchComplete ? "100%" : "60%" }}
              ></div>
            </div>
          </div>
        )}

        {/* Data Status Indicator */}
        {!isLoading && dataFetchComplete && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700">
                Data loaded successfully • {salesData.length} transactions • Last updated:{" "}
                {format(new Date(), "HH:mm:ss")}
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800">
              {getAppTranslation("filters", language)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-full md:w-auto">
                <Label htmlFor="payment-method" className="text-sm font-medium text-slate-700">
                  {getAppTranslation("payment_method", language)}
                </Label>
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger id="payment-method" className="w-full md:w-[180px] mt-1 bg-white border-slate-200">
                    <SelectValue placeholder={getAppTranslation("all_methods", language)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{getAppTranslation("all_methods", language)}</SelectItem>
                    <SelectItem value="cash">{getAppTranslation("cash", language)}</SelectItem>
                    <SelectItem value="card">{getAppTranslation("card", language)}</SelectItem>
                    <SelectItem value="transfer">{getAppTranslation("transfer", language)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-auto">
                <Label htmlFor="search" className="text-sm font-medium text-slate-700">
                  Search Transactions
                </Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="search"
                    placeholder="Search by ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full md:w-[200px] bg-white border-slate-200"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">
                {getAppTranslation("total_sales", language)}
              </CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {isLoading && isInitialLoad ? (
                  <div className="h-8 bg-blue-200 rounded animate-pulse"></div>
                ) : (
                  formatCurrency(salesSummary.totalSales, currency, language)
                )}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {getAppTranslation("for_period", language)}{" "}
                {dateRange?.from ? format(dateRange.from, "MMM d, yyyy") : "N/A"} {getAppTranslation("to", language)}{" "}
                {dateRange?.to ? format(dateRange.to, "MMM d, yyyy") : "N/A"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-800">
                {getAppTranslation("total_profit", language)}
              </CardTitle>
              <div className="p-2 bg-green-500 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {isLoading && isInitialLoad ? (
                  <div className="h-8 bg-green-200 rounded animate-pulse"></div>
                ) : (
                  formatCurrency(salesSummary.totalProfit, currency, language)
                )}
              </div>
              <p className="text-xs text-green-600 mt-1">
                {getAppTranslation("margin", language)}: {salesSummary.profitMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">
                {getAppTranslation("transactions", language)}
              </CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {isLoading && isInitialLoad ? (
                  <div className="h-8 bg-purple-200 rounded animate-pulse"></div>
                ) : (
                  salesSummary.transactionCount
                )}
              </div>
              <p className="text-xs text-purple-600 mt-1">
                {getAppTranslation("average", language)}: {formatCurrency(salesSummary.averageSale, currency, language)}{" "}
                {getAppTranslation("per_transaction", language)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">
                {getAppTranslation("payment_methods", language)}
              </CardTitle>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                {Object.keys(salesSummary.paymentMethods).length}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(salesSummary.paymentMethods).map(([method, count]) => (
                  <div key={method} className="flex justify-between text-sm">
                    <span className="capitalize text-orange-700">{method}:</span>
                    <span className="font-medium text-orange-900">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modern Chart */}
        <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-800">
              {getAppTranslation("sales_trend", language)}
            </CardTitle>
            <CardDescription className="text-slate-600">
              {getAppTranslation("daily_sales_profit", language)}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {isLoading && isInitialLoad ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="relative mb-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
                    <div className="absolute inset-0 h-12 w-12 border-4 border-blue-200 rounded-full animate-ping mx-auto"></div>
                  </div>
                  <p className="text-slate-600 font-medium">Loading chart data...</p>
                  <p className="text-slate-400 text-sm">{loadingStage}</p>
                </div>
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value, currency, language),
                      name === "sales" ? getAppTranslation("sales", language) : getAppTranslation("profit", language),
                    ]}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: "20px",
                      fontSize: "14px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#salesGradient)"
                    name="sales"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#profitGradient)"
                    name="profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-slate-500">{getAppTranslation("no_sales_data", language)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Products Analytics */}
          <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800">Top Selling Products</CardTitle>
              <CardDescription className="text-slate-600">Best performing products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && isInitialLoad ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {getTopProducts()
                    .slice(0, 5)
                    .map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{product.name}</p>
                            <p className="text-sm text-slate-500">{product.quantity} units sold</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">
                            {formatCurrency(product.revenue, currency, language)}
                          </p>
                          <p className="text-sm text-green-600">
                            {formatCurrency(product.profit, currency, language)} profit
                          </p>
                        </div>
                      </div>
                    ))}
                  {getTopProducts().length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-slate-500">No product data available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods Distribution */}
          <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800">Payment Methods Distribution</CardTitle>
              <CardDescription className="text-slate-600">Revenue breakdown by payment type</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && isInitialLoad ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-slate-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {getPaymentMethodStats().map((method) => (
                    <div key={method.method} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="capitalize font-medium text-slate-700">{method.method}</span>
                        <span className="text-sm text-slate-500">{method.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            method.method === "cash"
                              ? "bg-green-500"
                              : method.method === "card"
                                ? "bg-blue-500"
                                : "bg-purple-500"
                          }`}
                          style={{ width: `${method.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{method.count} transactions</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(method.revenue, currency, language)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {getPaymentMethodStats().length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-slate-500">No payment method data available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-800">Performance Metrics</CardTitle>
            <CardDescription className="text-slate-600">
              Key performance indicators for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-2xl font-bold text-blue-900 mb-1">
                  {salesSummary.transactionCount > 0
                    ? (salesSummary.totalSales / salesSummary.transactionCount).toFixed(2)
                    : "0.00"}
                </div>
                <div className="text-sm text-blue-600">Average Transaction Value</div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div className="text-2xl font-bold text-green-900 mb-1">{salesSummary.profitMargin.toFixed(1)}%</div>
                <div className="text-sm text-green-600">Profit Margin</div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <div className="text-2xl font-bold text-purple-900 mb-1">
                  {Object.keys(salesSummary.salesByDay).length}
                </div>
                <div className="text-sm text-purple-600">Active Sales Days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
