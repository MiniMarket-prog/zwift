"use client"

import { useState, useEffect, Suspense } from "react"
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
  Loader2,
  RefreshCw,
  Search,
  Filter,
  CircleDollarSign,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getDashboardStats, getProducts, getLowStockProducts } from "@/lib/supabase"
import { useLanguage } from "@/hooks/use-language"
import { createClient } from "@/lib/supabase-client"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { InventoryStatusCard } from "@/components/inventory/inventory-status"
import { LowStockCard } from "@/components/inventory/low-stock"
import { RecentActivityCard } from "@/components/inventory/recent-activity"
import { getInventoryItems, getLowStockItems } from "@/app/actions/inventory"
import { getRecentInventoryActivity } from "@/app/actions/inventory-activity"
import { getSalesTrend, getSalesByPaymentMethod, getSalesByCategory, getTopSellingProducts } from "@/app/actions/sales"
import type { InventoryActivity } from "@/app/actions/inventory-activity"
import type { SalesByDay, SalesByPaymentMethod, CategorySales } from "@/app/actions/sales"
import { TopProductsCard } from "@/components/sales/top-products"
import { SalesTrendChart, PaymentMethodChart, CategorySalesChart } from "@/components/sales/sales-charts"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"

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

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  // Properly typed stats state
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
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<InventoryActivity[]>([])
  const [productSearchTerm, setProductSearchTerm] = useState<string>("")
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [productSortBy, setProductSortBy] = useState<string>("stock-low")
  const [allProducts, setAllProducts] = useState<any[]>([])

  const { toast } = useToast()
  const { language, getAppTranslation } = useLanguage()
  const supabase = createClient()

  // Your existing useEffect and functions
  useEffect(() => {
    fetchDashboardData()
  }, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setIsRefreshing(true)

      // Fetch main dashboard stats
      const dashboardStats = await getDashboardStats(dateRange)

      // Ensure dashboardStats matches the StatsType
      setStats({
        totalSales: Number(dashboardStats.totalSales) || 0,
        totalExpenses: Number(dashboardStats.totalExpenses) || 0,
        profit: Number(dashboardStats.profit) || 0,
        salesCount: Number(dashboardStats.salesCount) || 0,
        expensesCount: Number(dashboardStats.expensesCount) || 0,
        totalProducts: Number(dashboardStats.totalProducts) || 0,
        lowStockCount: Number(dashboardStats.lowStockCount) || 0,
        outOfStockCount: Number(dashboardStats.outOfStockCount) || 0,
        recentSales: Array.isArray(dashboardStats.recentSales) ? dashboardStats.recentSales : [],
        recentExpenses: Array.isArray(dashboardStats.recentExpenses) ? dashboardStats.recentExpenses : [],
      })

      // Fetch detailed sales data
      await fetchDetailedSalesData()

      // Fetch inventory data
      await fetchInventoryData()
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: getAppTranslation("error"),
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Your existing functions
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
    } catch (error) {
      console.error("Error fetching detailed sales data:", error)
    }
  }

  const fetchInventoryData = async () => {
    try {
      // Fetch all products
      const productsData = await getProducts()
      setAllProducts(productsData)
      setFilteredProducts(productsData)

      // Fetch low stock products
      const lowStockData = await getLowStockProducts()
      setLowStockProducts(lowStockData)

      // Fetch recent inventory activity
      const activityData = await getRecentInventoryActivity()
      setRecentActivity(activityData)
    } catch (error) {
      console.error("Error fetching inventory data:", error)
    }
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
    <>
      <PageHeader
        title={getAppTranslation("dashboard")}
        description="Welcome to your business dashboard"
        actions={
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>{getAppTranslation("pick_date_range")}</span>
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
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{getAppTranslation("loading_dashboard_data")}</span>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="overview">{getAppTranslation("overview")}</TabsTrigger>
            <TabsTrigger value="sales">{getAppTranslation("sales")}</TabsTrigger>
            <TabsTrigger value="inventory">{getAppTranslation("inventory")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title={getAppTranslation("total_sales")}
                value={`$${stats.totalSales.toFixed(2)}`}
                description={`${stats.salesCount} ${getAppTranslation("transactions")}`}
                icon={<DollarSign className="h-4 w-4" />}
                variant="success"
              />
              <StatCard
                title={getAppTranslation("total_expenses")}
                value={`$${stats.totalExpenses.toFixed(2)}`}
                description={`${stats.expensesCount} ${getAppTranslation("expenses")}`}
                icon={<CircleDollarSign className="h-4 w-4" />}
                variant="danger"
              />
              <StatCard
                title={getAppTranslation("profit")}
                value={`$${Math.abs(stats.profit).toFixed(2)}`}
                description={`${stats.profit >= 0 ? getAppTranslation("profit") : getAppTranslation("loss")} ${getAppTranslation("for_selected_period")}`}
                icon={stats.profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                variant={stats.profit >= 0 ? "info" : "danger"}
              />
              <StatCard
                title={getAppTranslation("inventory_status")}
                value={stats.totalProducts}
                description={`${stats.lowStockCount} ${getAppTranslation("low_stock")}, ${stats.outOfStockCount} ${getAppTranslation("out_of_stock")}`}
                icon={<Package className="h-4 w-4" />}
                variant="warning"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{getAppTranslation("recent_sales")}</CardTitle>
                  <CardDescription>
                    {getAppTranslation("last_n_sales").replace("{n}", Math.min(stats.recentSales.length, 5).toString())}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recentSales.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{getAppTranslation("no_recent_sales_found")}</p>
                  ) : (
                    <div className="space-y-4">
                      {stats.recentSales.map((sale: Sale) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                              <ShoppingCart className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {getAppTranslation("sale")} #{sale.id.substring(0, 8)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(sale.created_at), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-medium">${sale.total.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/sales">View All Sales</a>
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{getAppTranslation("recent_expenses")}</CardTitle>
                  <CardDescription>
                    {getAppTranslation("last_n_expenses").replace(
                      "{n}",
                      Math.min(stats.recentExpenses.length, 5).toString(),
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recentExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{getAppTranslation("no_recent_expenses_found")}</p>
                  ) : (
                    <div className="space-y-4">
                      {stats.recentExpenses.map((expense: Expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center mr-3">
                              <CreditCard className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{expense.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {expense.created_at
                                  ? format(new Date(expense.created_at), "MMM d, yyyy")
                                  : getAppTranslation("unknown_date")}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-medium">${expense.amount.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/expenses">View All Expenses</a>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <SalesTrendChart salesByDay={salesByDay} />
              <PaymentMethodChart salesByPaymentMethod={salesByPaymentMethod} />
              <CategorySalesChart categorySales={categorySales} />
            </div>

            <TopProductsCard products={topProducts} />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="col-span-1">
                <Suspense
                  fallback={
                    <Card>
                      <CardHeader>
                        <CardTitle>{getAppTranslation("inventory_status")}</CardTitle>
                        <CardDescription>{"Loading data..."}</CardDescription>
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
                        <CardTitle>Low Stock</CardTitle>
                        <CardDescription>{"Loading data..."}</CardDescription>
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
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>{"Loading data..."}</CardDescription>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{getAppTranslation("inventory")}</CardTitle>
                  <CardDescription>{getAppTranslation("inventory_details_displayed_here")}</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="/inventory">View All</a>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      className="pl-8"
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={productSortBy} onValueChange={(value) => setProductSortBy(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock-low">Stock (Low to High)</SelectItem>
                        <SelectItem value="stock-high">Stock (High to Low)</SelectItem>
                        <SelectItem value="price-low">Price (Low to High)</SelectItem>
                        <SelectItem value="price-high">Price (High to Low)</SelectItem>
                        <SelectItem value="name-asc">Name (A to Z)</SelectItem>
                        <SelectItem value="name-desc">Name (Z to A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-md border overflow-hidden">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">{getAppTranslation("name")}</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">{getAppTranslation("price")}</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">{getAppTranslation("stock")}</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">{getAppTranslation("status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredProducts.slice(0, 5).map((product) => (
                        <tr key={product.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="h-10 w-10 relative bg-muted rounded-md overflow-hidden flex-shrink-0 mr-3">
                                {product.image ? (
                                  <Image
                                    src={product.image || "/placeholder.svg"}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
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
                          <td className="px-4 py-3 text-sm text-right">${product.price.toFixed(2)}</td>
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
                              className={product.stock < product.min_stock && product.stock > 0 ? "bg-amber-500" : ""}
                            >
                              {product.stock === 0
                                ? getAppTranslation("out_of_stock")
                                : product.stock < product.min_stock
                                  ? getAppTranslation("low_stock")
                                  : "In Stock"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </>
  )
}

