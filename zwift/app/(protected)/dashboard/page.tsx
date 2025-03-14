"use client"

import type React from "react"

import { useState, useEffect, useRef, Suspense, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, subDays } from "date-fns"
import {
  CalendarIcon,
  DollarSign,
  Package,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { getDashboardStats, getProducts, getLowStockProducts } from "@/lib/supabase"
import { useLanguage } from "@/hooks/use-language"
import { formatCurrency } from "@/lib/format-currency"
import { createClient } from "@/lib/supabase-client"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { InventoryStatusCard } from "@/components/inventory/inventory-status"
import { LowStockCard } from "@/components/inventory/low-stock"
import { RecentActivityCard } from "@/components/inventory/recent-activity"
import { getInventoryItems, getLowStockItems } from "@/app/actions/inventory"
import { getRecentInventoryActivity } from "@/app/actions/inventory-activity"
import { getSalesTrend, getSalesByPaymentMethod, getSalesByCategory, getTopSellingProducts } from "@/app/actions/sales"
import type { InventoryActivity } from "@/app/actions/inventory-activity"
import type { SalesByDay, SalesByPaymentMethod, CategorySales } from "@/app/actions/sales"
import { TopProductsCard } from "@/components/sales/top-products"
// Add the import for the chart components
import { SalesTrendChart, PaymentMethodChart, CategorySalesChart } from "@/components/sales/sales-charts"

type DateRange = {
  from: Date
  to: Date
}

type Sale = {
  id: string
  created_at: string
  total: number
  payment_method: string
  tax: number | null
  customer_id: string | null
}

type Expense = {
  id: string
  amount: number
  description: string
  created_at: string | null
  category_id: string | null
}

type Product = {
  id: string
  name: string
  price: number
  stock: number
  min_stock: number
  image?: string | null
  category_id?: string | null
  purchase_price?: number | null
  barcode?: string
}

// Define sort options for better type safety and translation
const SORT_OPTIONS = {
  STOCK_LOW: "stock-low",
  STOCK_HIGH: "stock-high",
  PRICE_LOW: "price-low",
  PRICE_HIGH: "price-high",
  NAME_ASC: "name-asc",
  NAME_DESC: "name-desc",
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  type StatsType = {
    totalSales: number
    totalExpenses: number
    profit: number
    salesCount: number
    expensesCount: number
    totalProducts: number
    lowStockCount: number
    outOfStockCount: number
    recentSales: Sale[]
    recentExpenses: Expense[]
  }

  const [stats, setStats] = useState<StatsType>({
    totalSales: 0,
    totalExpenses: 0,
    profit: 0,
    salesCount: 0,
    expensesCount: 0,
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    recentSales: [],
    recentExpenses: [],
  })

  // Additional state for detailed tabs
  const [salesByDay, setSalesByDay] = useState<SalesByDay[]>([])
  const [salesByPaymentMethod, setSalesByPaymentMethod] = useState<SalesByPaymentMethod[]>([])
  const [categorySales, setCategorySales] = useState<CategorySales[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [recentActivity, setRecentActivity] = useState<InventoryActivity[]>([])
  const [productSearchTerm, setProductSearchTerm] = useState<string>("")
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [productSortBy, setProductSortBy] = useState<string>(SORT_OPTIONS.STOCK_LOW)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [currentCurrency, setCurrentCurrency] = useState<string>("USD")

  const salesChartRef = useRef<HTMLCanvasElement>(null)
  const paymentMethodChartRef = useRef<HTMLCanvasElement>(null)
  const categorySalesChartRef = useRef<HTMLCanvasElement>(null)
  const inventoryStatusChartRef = useRef<HTMLCanvasElement>(null)

  const { toast } = useToast()
  const { language, getAppTranslation, isRTL } = useLanguage()
  const rtlEnabled = isRTL
  const supabase = createClient()

  // Helper function to get sort option label
  const getSortOptionLabel = (sortOption: string) => {
    switch (sortOption) {
      case SORT_OPTIONS.STOCK_LOW:
        return getAppTranslation("stock_low_to_high" as any, language)
      case SORT_OPTIONS.STOCK_HIGH:
        return getAppTranslation("stock_high_to_low" as any, language)
      case SORT_OPTIONS.PRICE_LOW:
        return getAppTranslation("price_low_to_high" as any, language)
      case SORT_OPTIONS.PRICE_HIGH:
        return getAppTranslation("price_high_to_low" as any, language)
      case SORT_OPTIONS.NAME_ASC:
        return getAppTranslation("name_a_to_z" as any, language)
      case SORT_OPTIONS.NAME_DESC:
        return getAppTranslation("name_z_to_a" as any, language)
      default:
        return getAppTranslation("sort_by" as any, language)
    }
  }

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

  useEffect(() => {
    fetchDashboardData()
    fetchCurrency()
  }, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setIsRefreshing(true)

      // Fetch main dashboard stats
      const dashboardStats = await getDashboardStats(dateRange)
      setStats(dashboardStats)

      // Fetch detailed sales data
      await fetchDetailedSalesData()

      // Fetch inventory data
      await fetchInventoryData()
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_fetch_expenses" as any, language),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  async function fetchDetailedSalesData() {
    try {
      // Fetch sales trend data
      const salesTrendData = await getSalesTrend(dateRange)
      setSalesByDay(salesTrendData)

      // Fetch sales by payment method
      const paymentMethodData = await getSalesByPaymentMethod(dateRange)
      setSalesByPaymentMethod(paymentMethodData)

      // Fetch sales by category
      const categorySalesData = await getSalesByCategory(dateRange)
      setCategorySales(categorySalesData)

      // Fetch top products
      const topProductsData = await getTopSellingProducts(dateRange)
      setTopProducts(topProductsData)

      // Draw charts
      // No need to manually draw charts anymore as we're using components with useEffect
    } catch (error) {
      console.error("Error fetching detailed sales data:", error)
    }
  }

  const fetchInventoryData = async () => {
    try {
      // Fetch all products
      const productsData = await getProducts()
      setAllProducts(productsData as Product[])
      setFilteredProducts(productsData as Product[])

      // Fetch low stock products
      const lowStockData = await getLowStockProducts()
      setLowStockProducts(lowStockData as Product[])

      // Fetch recent inventory activity
      const activityData = await getRecentInventoryActivity()
      setRecentActivity(activityData)

      // Draw inventory status chart
      setTimeout(() => {
        drawInventoryStatusChart(productsData as Product[])
      }, 100)
    } catch (error) {
      console.error("Error fetching inventory data:", error)
    }
  }

  const drawInventoryStatusChart = (products: Product[]) => {
    if (!inventoryStatusChartRef.current || products.length === 0) return

    const ctx = inventoryStatusChartRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, inventoryStatusChartRef.current.width, inventoryStatusChartRef.current.height)

    // Chart dimensions
    const width = inventoryStatusChartRef.current.width
    const height = inventoryStatusChartRef.current.height
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(centerX, centerY) - 40

    // Calculate inventory status counts
    const outOfStock = products.filter((p) => p.stock === 0).length
    const lowStock = products.filter((p) => p.stock > 0 && p.stock < p.min_stock).length
    const healthyStock = products.filter((p) => p.stock >= p.min_stock).length

    const total = outOfStock + lowStock + healthyStock

    // Data for pie chart
    const data = [
      { label: "Healthy", value: healthyStock, color: "#10b981" },
      { label: "Low Stock", value: lowStock, color: "#f59e0b" },
      { label: "Out of Stock", value: outOfStock, color: "#ef4444" },
    ]

    // Draw pie chart
    let startAngle = 0
    data.forEach((segment) => {
      const sliceAngle = (segment.value / total) * 2 * Math.PI

      ctx.fillStyle = segment.color
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle)
      ctx.closePath()
      ctx.fill()

      // Calculate position for label
      const labelAngle = startAngle + sliceAngle / 2
      const labelRadius = radius * 0.7
      const labelX = centerX + Math.cos(labelAngle) * labelRadius
      const labelY = centerY + Math.sin(labelAngle) * labelRadius

      // Draw percentage label if slice is big enough
      if (segment.value / total > 0.05) {
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 12px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(`${Math.round((segment.value / total) * 100)}%`, labelX, labelY)
      }

      startAngle += sliceAngle
    })

    // Draw legend
    const legendX = 10
    let legendY = height - 10 - data.length * 20

    ctx.textAlign = "left"
    ctx.textBaseline = "middle"

    data.forEach((segment) => {
      // Draw color box
      ctx.fillStyle = segment.color
      ctx.fillRect(legendX, legendY - 6, 12, 12)

      // Draw label name, count and percentage
      ctx.fillStyle = "#111827"
      ctx.font = "12px sans-serif"
      ctx.fillText(
        `${segment.label}: ${segment.value} (${Math.round((segment.value / total) * 100)}%)`,
        legendX + 20,
        legendY,
      )

      legendY += 20
    })

    // Add title
    ctx.fillStyle = "#111827"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText("Inventory Status", width / 2, 5)
  }

  const handleProductSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase()
    setProductSearchTerm(term)

    if (term.trim() === "") {
      setFilteredProducts(allProducts)
    } else {
      const filtered = allProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          (product.barcode && product.barcode.toLowerCase().includes(term)),
      )
      setFilteredProducts(filtered)
    }
  }

  const handleProductSort = (value: string) => {
    console.log("Sorting by:", value)
    setProductSortBy(value)

    const sorted = [...filteredProducts]

    switch (value) {
      case SORT_OPTIONS.STOCK_LOW:
        sorted.sort((a, b) => a.stock - b.stock)
        break
      case SORT_OPTIONS.STOCK_HIGH:
        sorted.sort((a, b) => b.stock - a.stock)
        break
      case SORT_OPTIONS.PRICE_LOW:
        sorted.sort((a, b) => a.price - b.price)
        break
      case SORT_OPTIONS.PRICE_HIGH:
        sorted.sort((a, b) => b.price - a.price)
        break
      case SORT_OPTIONS.NAME_ASC:
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case SORT_OPTIONS.NAME_DESC:
        sorted.sort((a, b) => b.name.localeCompare(a.name))
        break
    }

    setFilteredProducts(sorted)
  }

  const getStockStatusColor = (product: Product) => {
    if (product.stock === 0) return "text-red-500"
    if (product.stock < product.min_stock) return "text-amber-500"
    return "text-green-500"
  }

  const getStockStatusText = (product: Product) => {
    if (product.stock === 0) {
      return getAppTranslation("out_of_stock", language)
    }
    if (product.stock < product.min_stock) {
      return getAppTranslation("low_stock", language)
    }
    return getAppTranslation("in_stock" as any, language)
  }

  const calculateStockPercentage = (product: Product) => {
    if (product.min_stock === 0) return 100
    const target = Math.max(product.min_stock * 2, 1) // Target is double the min stock or at least 1
    const percentage = (product.stock / target) * 100
    return Math.min(percentage, 100) // Cap at 100%
  }

  const getProgressColor = (product: Product) => {
    if (product.stock === 0) return "bg-red-500"
    if (product.stock < product.min_stock) return "bg-amber-500"
    return "bg-green-500"
  }

  // Inventory status with data fetching
  async function InventoryStatusWrapper() {
    const items = await getInventoryItems()
    return <InventoryStatusCard items={items} />
  }

  // Low stock items with data fetching
  async function LowStockWrapper() {
    const items = await getLowStockItems()
    return <LowStockCard items={items} />
  }

  // Recent activity with data fetching
  async function RecentActivityWrapper() {
    const activities = await getRecentInventoryActivity(10) // Fetch 10 most recent activities
    return <RecentActivityCard activities={activities} />
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{getAppTranslation("dashboard" as any, language)}</h2>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className={`${rtlEnabled ? "ml-2" : "mr-2"} h-4 w-4`} />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>{getAppTranslation("pick_date_range" as any, language)}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => {
                  if (range?.from) setDateRange({ from: range.from, to: range.to || range.from })
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={fetchDashboardData} disabled={isRefreshing}>
            <RefreshCw className={`${rtlEnabled ? "ml-2" : "mr-2"} h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing
              ? getAppTranslation("refreshing" as any, language)
              : getAppTranslation("refresh" as any, language)}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{getAppTranslation("loading_dashboard_data" as any, language)}</span>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">{getAppTranslation("overview" as any, language)}</TabsTrigger>
            <TabsTrigger value="sales">{getAppTranslation("sales" as any, language)}</TabsTrigger>
            <TabsTrigger value="inventory">{getAppTranslation("inventory" as any, language)}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {getAppTranslation("total_sales" as any, language)}
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.totalSales, currentCurrency, language)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.salesCount} {getAppTranslation("transactions" as any, language)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {getAppTranslation("total_expenses" as any, language)}
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.totalExpenses, currentCurrency, language)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.expensesCount} {getAppTranslation("expenses" as any, language)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{getAppTranslation("profit" as any, language)}</CardTitle>
                  {stats.profit >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={cn("text-2xl font-bold", stats.profit >= 0 ? "text-green-500" : "text-destructive")}>
                    {formatCurrency(Math.abs(stats.profit), currentCurrency, language)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.profit >= 0
                      ? getAppTranslation("profit" as any, language)
                      : getAppTranslation("loss" as any, language)}{" "}
                    {getAppTranslation("for_selected_period" as any, language)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {getAppTranslation("inventory_status" as any, language)}
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProducts}</div>
                  <div className="flex items-center mt-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500 mr-1" />
                    <p className="text-xs text-muted-foreground">
                      {stats.lowStockCount} {getAppTranslation("low_stock", language)}, {stats.outOfStockCount}{" "}
                      {getAppTranslation("out_of_stock", language)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{getAppTranslation("recent_sales" as any, language)}</CardTitle>
                  <CardDescription>
                    {getAppTranslation("last_n_sales" as any, language).replace(
                      "{n}",
                      Math.min(stats.recentSales.length, 5).toString(),
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recentSales.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {getAppTranslation("no_recent_sales_found" as any, language)}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {stats.recentSales.map((sale: any) => (
                        <div key={sale.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <ShoppingCart className="h-4 w-4 mr-2 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {getAppTranslation("sale" as any, language)} #{sale.id.substring(0, 8)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(sale.created_at), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-medium">{formatCurrency(sale.total, currentCurrency, language)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{getAppTranslation("recent_expenses" as any, language)}</CardTitle>
                  <CardDescription>
                    {getAppTranslation("last_n_expenses" as any, language).replace(
                      "{n}",
                      Math.min(stats.recentExpenses.length, 5).toString(),
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recentExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {getAppTranslation("no_recent_expenses_found" as any, language)}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {stats.recentExpenses.map((expense: any) => (
                        <div key={expense.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{expense.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {expense.created_at
                                  ? format(new Date(expense.created_at), "MMM d, yyyy")
                                  : getAppTranslation("unknown_date" as any, language)}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-medium">
                            {formatCurrency(expense.amount, currentCurrency, language)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <SalesTrendChart salesByDay={salesByDay} />
              <PaymentMethodChart salesByPaymentMethod={salesByPaymentMethod} />
              <CategorySalesChart categorySales={categorySales} />
            </div>

            <TopProductsCard products={topProducts} />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="col-span-1">
                <Suspense
                  fallback={
                    <Card>
                      <CardHeader>
                        <CardTitle>{getAppTranslation("inventory_status" as any, language)}</CardTitle>
                        <CardDescription>{getAppTranslation("loading_data" as any, language)}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-40 flex items-center justify-center">
                          <div className="animate-pulse h-4 w-3/4 bg-muted rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  }
                >
                  <InventoryStatusWrapper />
                </Suspense>
              </div>
              <div className="col-span-1">
                <Suspense
                  fallback={
                    <Card>
                      <CardHeader>
                        <CardTitle>{getAppTranslation("low_stock", language)}</CardTitle>
                        <CardDescription>{getAppTranslation("loading_data" as any, language)}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-40 flex items-center justify-center">
                          <div className="animate-pulse h-4 w-3/4 bg-muted rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  }
                >
                  <LowStockWrapper />
                </Suspense>
              </div>
              <div className="col-span-1 md:col-span-2 lg:col-span-1">
                <Suspense
                  fallback={
                    <Card>
                      <CardHeader>
                        <CardTitle>{getAppTranslation("recent_activity" as any, language)}</CardTitle>
                        <CardDescription>{getAppTranslation("loading_data" as any, language)}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-40 flex items-center justify-center">
                          <div className="animate-pulse h-4 w-3/4 bg-muted rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  }
                >
                  <RecentActivityWrapper />
                </Suspense>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{getAppTranslation("inventory" as any, language)}</CardTitle>
                <CardDescription>
                  {getAppTranslation("inventory_details_displayed_here" as any, language)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={getAppTranslation("search_products" as any, language)}
                      className="pl-8"
                      value={productSearchTerm}
                      onChange={handleProductSearch}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <div className="w-[180px]">
                      <Select value={productSortBy} onValueChange={handleProductSort}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue>{getSortOptionLabel(productSortBy)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SORT_OPTIONS.STOCK_LOW}>
                            {getAppTranslation("stock_low_to_high" as any, language)}
                          </SelectItem>
                          <SelectItem value={SORT_OPTIONS.STOCK_HIGH}>
                            {getAppTranslation("stock_high_to_low" as any, language)}
                          </SelectItem>
                          <SelectItem value={SORT_OPTIONS.PRICE_LOW}>
                            {getAppTranslation("price_low_to_high" as any, language)}
                          </SelectItem>
                          <SelectItem value={SORT_OPTIONS.PRICE_HIGH}>
                            {getAppTranslation("price_high_to_low" as any, language)}
                          </SelectItem>
                          <SelectItem value={SORT_OPTIONS.NAME_ASC}>
                            {getAppTranslation("name_a_to_z" as any, language)}
                          </SelectItem>
                          <SelectItem value={SORT_OPTIONS.NAME_DESC}>
                            {getAppTranslation("name_z_to_a" as any, language)}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border overflow-hidden">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          {getAppTranslation("name" as any, language)}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          {getAppTranslation("price" as any, language)}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          {getAppTranslation("stock" as any, language)}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          {getAppTranslation("status" as any, language)}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredProducts.slice(0, 5).map((product) => (
                        <tr key={product.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="h-10 w-10 relative bg-muted rounded overflow-hidden flex-shrink-0 mr-3">
                                {product.image ? (
                                  <img
                                    src={product.image || "/placeholder.svg"}
                                    alt={product.name}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <Package className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.barcode && (
                                  <p className="text-xs text-muted-foreground">SKU: {product.barcode}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(product.price, currentCurrency, language)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {product.stock} / {product.min_stock}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <Badge
                              variant={
                                product.stock === 0
                                  ? "destructive"
                                  : product.stock < product.min_stock
                                    ? "outline"
                                    : "default"
                              }
                              className={
                                product.stock < product.min_stock && product.stock > 0
                                  ? "bg-amber-500 hover:bg-amber-500/80 text-white border-amber-500"
                                  : ""
                              }
                            >
                              {getStockStatusText(product)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/inventory">{getAppTranslation("view_all_products" as any, language)}</a>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

