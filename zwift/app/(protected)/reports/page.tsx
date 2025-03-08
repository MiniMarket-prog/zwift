"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download,
  BarChart3,
  LineChart,
  PieChart,
  Calendar,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Package,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

// Define types for our data
type SaleData = {
  id: string
  created_at: string
  total: number
  payment_method: string
}

type ExpenseData = {
  id: string
  amount: number
  description: string
  category_id: string | null
  created_at: string | null
}

type ProductData = {
  id: string
  name: string
  stock: number
  min_stock: number
  price: number
}

type CategoryData = {
  id: string
  name: string
}

type DateRange = {
  from: Date
  to: Date
}

type PeriodOption = "today" | "yesterday" | "last7days" | "last30days" | "thisMonth" | "lastMonth" | "custom"

export default function ReportsPage() {
  // State for active tab and period selection
  const [activeTab, setActiveTab] = useState("sales")
  const [isLoading, setIsLoading] = useState(false)
  const [period, setPeriod] = useState<PeriodOption>("last7days")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [isCustomPeriod, setIsCustomPeriod] = useState(false)

  // State for data
  const [salesData, setSalesData] = useState<SaleData[]>([])
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([])
  const [productData, setProductData] = useState<ProductData[]>([])
  const [expenseCategories, setExpenseCategories] = useState<CategoryData[]>([])

  // State for filters
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all")
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")

  const { toast } = useToast()

  // Function to set date range based on period selection
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
      case "custom":
        setIsCustomPeriod(true)
        break
    }
  }

  // Function to handle custom date selection

  // Function to fetch sales data
  const fetchSalesData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Format dates for Supabase query
      const fromDate = format(dateRange.from, "yyyy-MM-dd")
      const toDate = format(dateRange.to, "yyyy-MM-dd 23:59:59")

      let query = supabase
        .from("sales")
        .select("*")
        .gte("created_at", fromDate)
        .lte("created_at", toDate)
        .order("created_at", { ascending: false })

      if (paymentMethodFilter !== "all") {
        query = query.eq("payment_method", paymentMethodFilter)
      }

      const { data, error } = await query

      if (error) throw error

      setSalesData(data || [])
    } catch (error) {
      console.error("Error fetching sales data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch sales data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [dateRange, paymentMethodFilter, toast])

  // Function to fetch expense data
  const fetchExpenseData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Format dates for Supabase query
      const fromDate = format(dateRange.from, "yyyy-MM-dd")
      const toDate = format(dateRange.to, "yyyy-MM-dd 23:59:59")

      let query = supabase
        .from("expenses")
        .select("*")
        .gte("created_at", fromDate)
        .lte("created_at", toDate)
        .order("created_at", { ascending: false })

      if (expenseCategoryFilter !== "all") {
        query = query.eq("category_id", expenseCategoryFilter)
      }

      const { data, error } = await query

      if (error) throw error

      setExpenseData(data || [])

      // Fetch expense categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("expense_categories")
        .select("*")
        .order("name")

      if (categoriesError) throw categoriesError

      setExpenseCategories(categoriesData || [])
    } catch (error) {
      console.error("Error fetching expense data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch expense data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [dateRange, expenseCategoryFilter, toast])

  // Function to fetch inventory data
  const fetchInventoryData = useCallback(async () => {
    try {
      setIsLoading(true)

      let query = supabase.from("products").select("*").order("name")

      if (stockFilter === "low") {
        query = query.lt("stock", supabase.rpc("get_min_stock_for_product"))
      } else if (stockFilter === "out") {
        query = query.eq("stock", 0)
      }

      const { data, error } = await query

      if (error) throw error

      setProductData(data || [])
    } catch (error) {
      console.error("Error fetching inventory data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch inventory data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [stockFilter, toast])

  // Fetch data when tab or date range changes
  useEffect(() => {
    if (activeTab === "sales") {
      fetchSalesData()
    } else if (activeTab === "expenses") {
      fetchExpenseData()
    } else if (activeTab === "inventory") {
      fetchInventoryData()
    }
  }, [
    activeTab,
    dateRange,
    paymentMethodFilter,
    expenseCategoryFilter,
    stockFilter,
    fetchSalesData,
    fetchExpenseData,
    fetchInventoryData,
  ])

  // Calculate summary metrics for sales
  const calculateSalesSummary = () => {
    const totalSales = salesData.reduce((sum, sale) => sum + sale.total, 0)
    const averageSale = salesData.length > 0 ? totalSales / salesData.length : 0

    // Count by payment method
    const paymentMethods = salesData.reduce(
      (acc, sale) => {
        acc[sale.payment_method] = (acc[sale.payment_method] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Sales by day for chart
    const salesByDay = salesData.reduce(
      (acc, sale) => {
        const day = format(new Date(sale.created_at), "yyyy-MM-dd")
        acc[day] = (acc[day] || 0) + sale.total
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalSales,
      averageSale,
      transactionCount: salesData.length,
      paymentMethods,
      salesByDay,
    }
  }

  // Calculate summary metrics for expenses
  const calculateExpensesSummary = () => {
    const totalExpenses = expenseData.reduce((sum, expense) => sum + expense.amount, 0)
    const averageExpense = expenseData.length > 0 ? totalExpenses / expenseData.length : 0

    // Expenses by category
    const expensesByCategory = expenseData.reduce(
      (acc, expense) => {
        const categoryId = expense.category_id || "uncategorized"
        acc[categoryId] = (acc[categoryId] || 0) + expense.amount
        return acc
      },
      {} as Record<string, number>,
    )

    // Expenses by day for chart
    const expensesByDay = expenseData.reduce(
      (acc, expense) => {
        if (!expense.created_at) return acc
        const day = format(new Date(expense.created_at), "yyyy-MM-dd")
        acc[day] = (acc[day] || 0) + expense.amount
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalExpenses,
      averageExpense,
      expenseCount: expenseData.length,
      expensesByCategory,
      expensesByDay,
    }
  }

  // Calculate summary metrics for inventory
  const calculateInventorySummary = () => {
    const totalProducts = productData.length
    const totalValue = productData.reduce((sum, product) => sum + product.stock * product.price, 0)
    const lowStockCount = productData.filter((product) => product.stock < product.min_stock).length
    const outOfStockCount = productData.filter((product) => product.stock === 0).length

    return {
      totalProducts,
      totalValue,
      lowStockCount,
      outOfStockCount,
    }
  }

  // Export data to CSV
  const exportToCSV = () => {
    let data: (SaleData | ExpenseData | ProductData)[] = []
    let filename = ""
    let headers: string[] = []

    if (activeTab === "sales") {
      data = salesData
      filename = `sales_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`
      headers = ["ID", "Date", "Total", "Payment Method"]
    } else if (activeTab === "expenses") {
      data = expenseData
      filename = `expenses_report_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}.csv`
      headers = ["ID", "Date", "Amount", "Description", "Category"]
    } else if (activeTab === "inventory") {
      data = productData
      filename = `inventory_report_${format(new Date(), "yyyy-MM-dd")}.csv`
      headers = ["ID", "Name", "Stock", "Min Stock", "Price", "Value"]
    }

    // Convert data to CSV format
    const csvRows = [headers]

    data.forEach((item) => {
      if (activeTab === "sales") {
        const sale = item as SaleData
        csvRows.push([
          sale.id,
          format(new Date(sale.created_at), "yyyy-MM-dd HH:mm:ss"),
          sale.total.toString(),
          sale.payment_method,
        ])
      } else if (activeTab === "expenses") {
        const expense = item as ExpenseData
        csvRows.push([
          expense.id,
          expense.created_at ? format(new Date(expense.created_at), "yyyy-MM-dd HH:mm:ss") : "",
          expense.amount.toString(),
          expense.description,
          expense.category_id || "Uncategorized",
        ])
      } else if (activeTab === "inventory") {
        const product = item as ProductData
        csvRows.push([
          product.id,
          product.name,
          product.stock.toString(),
          product.min_stock.toString(),
          product.price.toString(),
          (product.stock * product.price).toString(),
        ])
      }
    })

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((row) => row.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)

    // Create a link and trigger download
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Successful",
      description: `Report has been exported to ${filename}`,
    })
  }

  // Get category name by ID
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized"
    const category = expenseCategories.find((cat) => cat.id === categoryId)
    return category ? category.name : "Uncategorized"
  }

  // Sales summary data
  const salesSummary = calculateSalesSummary()

  // Expenses summary data
  const expensesSummary = calculateExpensesSummary()

  // Inventory summary data
  const inventorySummary = calculateInventorySummary()

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {/* Period selector */}
          <Select value={period} onValueChange={(value: PeriodOption) => handlePeriodChange(value)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom date range picker */}
          {isCustomPeriod && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Pick a date range"
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
                  onSelect={(range) => {
                    if (range?.from) setDateRange({ from: range.from, to: range.to || range.from })
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          <Button onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              if (activeTab === "sales") fetchSalesData()
              else if (activeTab === "expenses") fetchExpenseData()
              else if (activeTab === "inventory") fetchInventoryData()
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        {/* Sales Report Tab */}
        <TabsContent value="sales" className="space-y-4">
          {/* Sales Filters */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="w-full md:w-auto">
                  <Label htmlFor="payment-method" className="mb-1 block">
                    Payment Method
                  </Label>
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger id="payment-method" className="w-full md:w-[180px]">
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${salesSummary.totalSales.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  For period {format(dateRange.from, "MMM d, yyyy")} to {format(dateRange.to, "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesSummary.transactionCount}</div>
                <p className="text-xs text-muted-foreground">
                  Average: ${salesSummary.averageSale.toFixed(2)} per transaction
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
                <Badge variant="outline">{salesSummary.paymentMethods["cash"] || 0}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(((salesSummary.paymentMethods["cash"] || 0) / (salesSummary.transactionCount || 1)) * 100).toFixed(
                    1,
                  )}
                  %
                </div>
                <p className="text-xs text-muted-foreground">Of total transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Card Sales</CardTitle>
                <Badge variant="outline">{salesSummary.paymentMethods["card"] || 0}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(((salesSummary.paymentMethods["card"] || 0) / (salesSummary.transactionCount || 1)) * 100).toFixed(
                    1,
                  )}
                  %
                </div>
                <p className="text-xs text-muted-foreground">Of total transactions</p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
              <CardDescription>Daily sales for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : salesData.length > 0 ? (
                <div className="h-full">
                  {/* This would be replaced with an actual chart component */}
                  <div className="flex h-full items-center justify-center">
                    <LineChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Sales chart would be rendered here with {Object.keys(salesSummary.salesByDay).length} data points
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No sales data available for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Transactions</CardTitle>
              <CardDescription>Showing {salesData.length} transactions for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : salesData.length > 0 ? (
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Payment Method</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {salesData.slice(0, 10).map((sale) => (
                        <tr key={sale.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm">
                            {format(new Date(sale.created_at), "MMM d, yyyy h:mm a")}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">#{sale.id}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant="outline" className="capitalize">
                              {sale.payment_method}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">${sale.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {salesData.length > 10 && (
                    <div className="px-4 py-2 text-center text-sm text-muted-foreground">
                      Showing 10 of {salesData.length} transactions
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No sales data available for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Report Tab */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Inventory Filters */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="w-full md:w-auto">
                  <Label htmlFor="stock-filter" className="mb-1 block">
                    Stock Level
                  </Label>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger id="stock-filter" className="w-full md:w-[180px]">
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="low">Low Stock</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventorySummary.totalProducts}</div>
                <p className="text-xs text-muted-foreground">In inventory</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${inventorySummary.totalValue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Total value of all products</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                <TrendingDown className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventorySummary.lowStockCount}</div>
                <p className="text-xs text-muted-foreground">Products below minimum stock level</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventorySummary.outOfStockCount}</div>
                <p className="text-xs text-muted-foreground">Products with zero stock</p>
              </CardContent>
            </Card>
          </div>

          {/* Inventory Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Distribution</CardTitle>
              <CardDescription>Overview of product stock levels</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : productData.length > 0 ? (
                <div className="h-full">
                  {/* This would be replaced with an actual chart component */}
                  <div className="flex h-full items-center justify-center">
                    <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Inventory chart would be rendered here with {productData.length} products
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No inventory data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
              <CardDescription>Showing {productData.length} products</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : productData.length > 0 ? (
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Price</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Stock</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Min Stock</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Value</th>
                        <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {productData.slice(0, 10).map((product) => (
                        <tr key={product.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                          <td className="px-4 py-3 text-sm text-right">${product.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-right">{product.stock}</td>
                          <td className="px-4 py-3 text-sm text-right">{product.min_stock}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            ${(product.stock * product.price).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {product.stock === 0 ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : product.stock < product.min_stock ? (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                                In Stock
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {productData.length > 10 && (
                    <div className="px-4 py-2 text-center text-sm text-muted-foreground">
                      Showing 10 of {productData.length} products
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No inventory data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Report Tab */}
        <TabsContent value="expenses" className="space-y-4">
          {/* Expenses Filters */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="w-full md:w-auto">
                  <Label htmlFor="expense-category" className="mb-1 block">
                    Category
                  </Label>
                  <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                    <SelectTrigger id="expense-category" className="w-full md:w-[180px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${expensesSummary.totalExpenses.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  For period {format(dateRange.from, "MMM d, yyyy")} to {format(dateRange.to, "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Expense Count</CardTitle>
                <Badge variant="outline">{expensesSummary.expenseCount}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{expensesSummary.expenseCount}</div>
                <p className="text-xs text-muted-foreground">
                  Average: ${expensesSummary.averageExpense.toFixed(2)} per expense
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Profit/Loss</CardTitle>
                {salesSummary.totalSales > expensesSummary.totalExpenses ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    salesSummary.totalSales > expensesSummary.totalExpenses ? "text-green-500" : "text-destructive",
                  )}
                >
                  ${(salesSummary.totalSales - expensesSummary.totalExpenses).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Sales minus expenses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Expense Ratio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {salesSummary.totalSales > 0
                    ? ((expensesSummary.totalExpenses / salesSummary.totalSales) * 100).toFixed(1)
                    : "0"}
                  %
                </div>
                <p className="text-xs text-muted-foreground">Expenses as percentage of sales</p>
              </CardContent>
            </Card>
          </div>

          {/* Expenses Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>Distribution of expenses across categories</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : expenseData.length > 0 ? (
                <div className="h-full">
                  {/* This would be replaced with an actual chart component */}
                  <div className="flex h-full items-center justify-center">
                    <PieChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Expenses chart would be rendered here with{" "}
                      {Object.keys(expensesSummary.expensesByCategory).length} categories
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No expense data available for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Transactions</CardTitle>
              <CardDescription>Showing {expenseData.length} expenses for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : expenseData.length > 0 ? (
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {expenseData.slice(0, 10).map((expense) => (
                        <tr key={expense.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm">
                            {expense.created_at ? format(new Date(expense.created_at), "MMM d, yyyy") : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{expense.description}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant="outline">{getCategoryName(expense.category_id)}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">${expense.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {expenseData.length > 10 && (
                    <div className="px-4 py-2 text-center text-sm text-muted-foreground">
                      Showing 10 of {expenseData.length} expenses
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No expense data available for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

