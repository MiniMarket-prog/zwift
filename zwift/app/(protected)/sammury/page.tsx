"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Calendar, RefreshCw, Loader2, DollarSign, CreditCard, TrendingUp } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/format-currency"
import { useLanguage } from "@/hooks/use-language"

// Define types for our data
type SaleData = {
  id: string
  created_at: string
  total: number
  payment_method: string
  sale_items?: SaleItemData[]
}

// Add a new type for sale items with product information
type SaleItemData = {
  id: string
  product_id: string
  quantity: number
  price: number
  discount?: number // Add discount field
  sale_id?: string // Make it optional
  products?: {
    id: string
    name: string
    purchase_price: number | null
  }
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
  purchase_price: number | null
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

  // Add currency state
  const [currency, setCurrency] = useState<string>("USD")
  const { language, getAppTranslation } = useLanguage()

  // First, add a reference for the canvas element at the top of the component with the other states
  const salesChartRef = useRef<HTMLCanvasElement>(null)

  const { toast } = useToast()
  const supabase = createClient()

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

  // Function to fetch sales data
  const fetchSalesData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Make sure dateRange exists before using it
      if (!dateRange || !dateRange.from || !dateRange.to) {
        console.error("Date range is undefined or incomplete")
        return
      }

      // Format dates for Supabase query
      const fromDate = format(dateRange.from, "yyyy-MM-dd")
      const toDate = format(dateRange.to, "yyyy-MM-dd 23:59:59")

      // Modified query to include sale_items and products
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

      if (paymentMethodFilter !== "all") {
        query = query.eq("payment_method", paymentMethodFilter)
      }

      const { data, error } = await query

      if (error) throw error

      setSalesData(data || [])
    } catch (error) {
      console.error("Error fetching sales data:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_fetch_sales", language),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [dateRange, paymentMethodFilter, toast, supabase, getAppTranslation, language])

  // Function to fetch expense data
  const fetchExpenseData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Make sure dateRange exists before using it
      if (!dateRange || !dateRange.from || !dateRange.to) {
        console.error("Date range is undefined or incomplete")
        return
      }

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
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_fetch_expenses", language),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [dateRange, expenseCategoryFilter, toast, supabase, getAppTranslation, language])

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
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_fetch_inventory", language),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [stockFilter, toast, supabase, getAppTranslation, language])

  // Function to fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      // First try to get global settings
      let { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("*")
        .eq("type", "global")
        .single()

      // If no global settings, try system settings
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
        // First check if settings.settings exists and has currency
        let currencyValue = "USD"

        if (settingsData.settings && typeof settingsData.settings === "object" && settingsData.settings !== null) {
          // Check for currency in settings.settings
          if ("currency" in settingsData.settings && typeof settingsData.settings.currency === "string") {
            currencyValue = settingsData.settings.currency
          }
        }

        // Fallback to top-level currency field if it exists
        if (settingsData.currency && typeof settingsData.currency === "string") {
          currencyValue = settingsData.currency
        }

        setCurrency(currencyValue)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    }
  }, [supabase])

  // Fetch data when tab or date range changes
  useEffect(() => {
    fetchSettings()

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
    fetchSettings,
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

    // Calculate profit (revenue - cost)
    let totalCost = 0
    let totalProfit = 0
    let itemsWithProfitCount = 0

    // Sales by day for chart and profit calculation
    const salesByDay: Record<string, { sales: number; profit: number }> = {}

    salesData.forEach((sale) => {
      const day = format(new Date(sale.created_at), "yyyy-MM-dd")

      if (!salesByDay[day]) {
        salesByDay[day] = { sales: 0, profit: 0 }
      }

      salesByDay[day].sales += sale.total

      // Calculate profit for each sale item if product purchase price is available
      if (sale.sale_items && sale.sale_items.length > 0) {
        sale.sale_items.forEach((item) => {
          const purchasePrice = item.products?.purchase_price || null

          if (purchasePrice !== null) {
            // Get the discount percentage (default to 0 if not present)
            const discount = item.discount || 0

            // Calculate the selling price after discount
            const priceAfterDiscount = item.price * (1 - discount / 100)

            // Calculate cost and profit
            const itemCost = purchasePrice * item.quantity
            const itemRevenue = priceAfterDiscount * item.quantity
            const itemProfit = itemRevenue - itemCost

            totalCost += itemCost
            totalProfit += itemProfit
            itemsWithProfitCount++

            // Add to daily profit
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
      title: getAppTranslation("export_successful", language),
      description: `${getAppTranslation("report_exported", language)} ${filename}`,
    })
  }

  // Get category name by ID
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return getAppTranslation("uncategorized", language)
    const category = expenseCategories.find((cat) => cat.id === categoryId)
    return category ? category.name : getAppTranslation("uncategorized", language)
  }

  // Sales summary data
  const salesSummary = calculateSalesSummary()

  // Expenses summary data
  const expensesSummary = calculateExpensesSummary()

  // Inventory summary data
  const inventorySummary = calculateInventorySummary()

  // Add this useEffect to draw the chart whenever salesSummary changes
  useEffect(() => {
    if (
      activeTab === "sales" &&
      !isLoading &&
      salesChartRef.current &&
      Object.keys(salesSummary.salesByDay).length > 0
    ) {
      const ctx = salesChartRef.current.getContext("2d")
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, salesChartRef.current.width, salesChartRef.current.height)

      // Sort dates in ascending order
      const sortedDates = Object.keys(salesSummary.salesByDay).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      )

      // Get sales values in the same order
      const salesValues = sortedDates.map((date) => salesSummary.salesByDay[date].sales)
      const profitValues = sortedDates.map((date) => salesSummary.salesByDay[date].profit)

      // Find max value for scaling
      const maxSales = Math.max(...salesValues, 1) // Avoid division by zero

      // Chart dimensions
      const width = salesChartRef.current.width
      const height = salesChartRef.current.height
      const padding = 40

      // Draw axes
      ctx.strokeStyle = "#d1d5db" // text-muted-foreground
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(padding, padding)
      ctx.lineTo(padding, height - padding)
      ctx.lineTo(width - padding, height - padding)
      ctx.stroke()

      // Draw Y-axis labels
      ctx.fillStyle = "#6b7280" // text-muted-foreground
      ctx.font = "10px sans-serif"
      ctx.textAlign = "right"
      ctx.textBaseline = "middle"

      // Y-axis labels
      for (let i = 0; i <= 5; i++) {
        const y = padding + ((height - 2 * padding) * (5 - i)) / 5
        const value = (maxSales * i) / 5
        // Use a simplified format for chart labels
        const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency
        ctx.fillText(`${currencySymbol}${value.toFixed(0)}`, padding - 5, y)
      }

      // X-axis labels (dates)
      ctx.textAlign = "center"
      ctx.textBaseline = "top"

      // If we have more than 7 days, only show some labels
      const step = sortedDates.length > 7 ? Math.ceil(sortedDates.length / 7) : 1

      sortedDates.forEach((date, i) => {
        if (i % step === 0 || i === sortedDates.length - 1) {
          const x = padding + ((width - 2 * padding) * i) / (sortedDates.length - 1 || 1)
          const formattedDate = format(new Date(date), "MMM d")
          ctx.fillText(formattedDate, x, height - padding + 5)
        }
      })

      // Draw sales line
      ctx.strokeStyle = "#3b82f6" // blue-500
      ctx.lineWidth = 2
      ctx.beginPath()

      sortedDates.forEach((date, i) => {
        const x = padding + ((width - 2 * padding) * i) / (sortedDates.length - 1 || 1)
        const y = height - padding - (height - 2 * padding) * (salesValues[i] / maxSales)

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })

      ctx.stroke()

      // Add sales data points
      ctx.fillStyle = "#3b82f6" // blue-500
      sortedDates.forEach((date, i) => {
        const x = padding + ((width - 2 * padding) * i) / (sortedDates.length - 1 || 1)
        const y = height - padding - (height - 2 * padding) * (salesValues[i] / maxSales)

        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
      })

      // Draw profit line if we have profit data
      if (profitValues.some((profit) => profit > 0)) {
        ctx.strokeStyle = "#10b981" // green-500
        ctx.lineWidth = 2
        ctx.beginPath()

        sortedDates.forEach((date, i) => {
          const x = padding + ((width - 2 * padding) * i) / (sortedDates.length - 1 || 1)
          const y = height - padding - (height - 2 * padding) * (profitValues[i] / maxSales)

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })

        ctx.stroke()

        // Add profit data points
        ctx.fillStyle = "#10b981" // green-500
        sortedDates.forEach((date, i) => {
          const x = padding + ((width - 2 * padding) * i) / (sortedDates.length - 1 || 1)
          const y = height - padding - (height - 2 * padding) * (profitValues[i] / maxSales)

          ctx.beginPath()
          ctx.arc(x, y, 4, 0, 2 * Math.PI)
          ctx.fill()
        })
      }

      // Add legend
      ctx.fillStyle = "#6b7280" // text-muted-foreground
      ctx.font = "12px sans-serif"
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"

      // Sales legend
      ctx.fillStyle = "#3b82f6" // blue-500
      ctx.beginPath()
      ctx.arc(width - padding - 100, padding + 10, 4, 0, 2 * Math.PI)
      ctx.fill()

      ctx.fillStyle = "#6b7280" // text-muted-foreground
      ctx.fillText(getAppTranslation("sales", language), width - padding - 90, padding + 10)

      // Profit legend
      if (profitValues.some((profit) => profit > 0)) {
        ctx.fillStyle = "#10b981" // green-500
        ctx.beginPath()
        ctx.arc(width - padding - 100, padding + 30, 4, 0, 2 * Math.PI)
        ctx.fill()

        ctx.fillStyle = "#6b7280" // text-muted-foreground
        ctx.fillText(getAppTranslation("profit", language), width - padding - 90, padding + 30)
      }
    }
  }, [activeTab, isLoading, salesSummary, currency, language, getAppTranslation])

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">{getAppTranslation("reports", language)}</h1>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {/* Period selector */}
          <Select value={period} onValueChange={(value: PeriodOption) => handlePeriodChange(value)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={getAppTranslation("select_period", language)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{getAppTranslation("today", language)}</SelectItem>
              <SelectItem value="yesterday">{getAppTranslation("yesterday", language)}</SelectItem>
              <SelectItem value="last7days">{getAppTranslation("last_7_days", language)}</SelectItem>
              <SelectItem value="last30days">{getAppTranslation("last_30_days", language)}</SelectItem>
              <SelectItem value="thisMonth">{getAppTranslation("this_month", language)}</SelectItem>
              <SelectItem value="lastMonth">{getAppTranslation("last_month", language)}</SelectItem>
              <SelectItem value="custom">{getAppTranslation("custom_range", language)}</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom date range picker */}
          {isCustomPeriod && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange && dateRange.from ? (
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

          <Button onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            {getAppTranslation("export", language)}
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
            {getAppTranslation("refresh", language)}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">{getAppTranslation("sales", language)}</TabsTrigger>
          <TabsTrigger value="inventory">{getAppTranslation("inventory", language)}</TabsTrigger>
          <TabsTrigger value="expenses">{getAppTranslation("expenses", language)}</TabsTrigger>
        </TabsList>

        {/* Sales Report Tab */}
        <TabsContent value="sales" className="space-y-4">
          {/* Sales Filters */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{getAppTranslation("filters", language)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="w-full md:w-auto">
                  <Label htmlFor="payment-method" className="mb-1 block">
                    {getAppTranslation("payment_method", language)}
                  </Label>
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger id="payment-method" className="w-full md:w-[180px]">
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
              </div>
            </CardContent>
          </Card>

          {/* Sales Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{getAppTranslation("total_sales", language)}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(salesSummary.totalSales, currency, language)}</div>
                <p className="text-xs text-muted-foreground">
                  {getAppTranslation("for_period", language)}{" "}
                  {dateRange && dateRange.from ? format(dateRange.from, "MMM d, yyyy") : "N/A"}{" "}
                  {getAppTranslation("to", language)}{" "}
                  {dateRange && dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{getAppTranslation("total_profit", language)}</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {formatCurrency(salesSummary.totalProfit, currency, language)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {getAppTranslation("margin", language)}: {salesSummary.profitMargin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{getAppTranslation("transactions", language)}</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesSummary.transactionCount}</div>
                <p className="text-xs text-muted-foreground">
                  {getAppTranslation("average", language)}:{" "}
                  {formatCurrency(salesSummary.averageSale, currency, language)}{" "}
                  {getAppTranslation("per_transaction", language)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{getAppTranslation("payment_methods", language)}</CardTitle>
                <Badge variant="outline">{Object.keys(salesSummary.paymentMethods).length}</Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(salesSummary.paymentMethods).map(([method, count]) => (
                    <div key={method} className="flex justify-between">
                      <span className="capitalize">{method}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{getAppTranslation("sales_trend", language)}</CardTitle>
              <CardDescription>{getAppTranslation("daily_sales_profit", language)}</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : salesData.length > 0 ? (
                <div className="h-full">
                  <canvas ref={salesChartRef} width={800} height={300} className="w-full h-full" />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">{getAppTranslation("no_sales_data", language)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>{getAppTranslation("sales_transactions", language)}</CardTitle>
              <CardDescription>
                {getAppTranslation("showing", language)} {salesData.length}{" "}
                {getAppTranslation("transactions_for_period", language)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : salesData.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          {getAppTranslation("date", language)}
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          {getAppTranslation("payment_method", language)}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          {getAppTranslation("revenue", language)}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          {getAppTranslation("cost", language)}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          {getAppTranslation("profit", language)}
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          {getAppTranslation("margin", language)}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {salesData.slice(0, 10).map((sale) => {
                        // Calculate cost, revenue and profit for each sale
                        let cost = 0
                        let profit = 0
                        let hasValidProfit = false

                        if (sale.sale_items && sale.sale_items.length > 0) {
                          sale.sale_items.forEach((item) => {
                            if (item.products?.purchase_price !== null && item.products?.purchase_price !== undefined) {
                              // Get the discount percentage (default to 0 if not present)
                              const discount = item.discount || 0

                              // Calculate the selling price after discount
                              const priceAfterDiscount = item.price * (1 - discount / 100)

                              // Calculate cost and revenue
                              const itemCost = item.products.purchase_price * item.quantity
                              const itemRevenue = priceAfterDiscount * item.quantity

                              cost += itemCost
                              profit += itemRevenue - itemCost
                              hasValidProfit = true
                            }
                          })
                        }

                        const margin = hasValidProfit && sale.total > 0 ? (profit / sale.total) * 100 : 0

                        return (
                          <tr key={sale.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3 text-sm">
                              {format(new Date(sale.created_at), "MMM d, yyyy h:mm a")}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">#{sale.id.substring(0, 8)}</td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant="outline" className="capitalize">
                                {sale.payment_method}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium">
                              {formatCurrency(sale.total, currency, language)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {hasValidProfit ? formatCurrency(cost, currency, language) : "-"}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm text-right font-medium ${profit > 0 ? "text-green-500" : profit < 0 ? "text-red-500" : ""}`}
                            >
                              {hasValidProfit ? formatCurrency(profit, currency, language) : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {hasValidProfit ? `${margin.toFixed(1)}%` : "-"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {salesData.length > 10 && (
                    <div className="px-4 py-2 text-center text-sm text-muted-foreground">
                      {getAppTranslation("showing", language)} 10 {getAppTranslation("of", language)} {salesData.length}{" "}
                      {getAppTranslation("transactions", language)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{getAppTranslation("no_sales_data", language)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory and Expenses tabs would follow the same pattern */}
      </Tabs>
    </div>
  )
}

