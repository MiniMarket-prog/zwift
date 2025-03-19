"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { formatCurrency } from "@/lib/format-currency"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import {
  Download,
  Filter,
  RefreshCw,
  Search,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  PieChartIcon,
  Zap,
} from "lucide-react"
import { format, subDays, isAfter, isBefore } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import type { DateRange } from "react-day-picker"

// Types
interface SaleItem {
  id: string
  product_id: string
  sale_id: string
  quantity: number
  price: number
  product_name?: string
  created_at?: string
}

// Update the Sale interface to make status and updated_at optional
interface Sale {
  id: string
  customer_id: string | null
  total: number
  payment_method: string
  status?: string
  created_at: string
  updated_at?: string
  tax?: number | null
  items?: SaleItem[]
  customer_name?: string
}

interface Product {
  id: string
  name: string
  price: number
  stock: number
  barcode: string
  category_id: string | null
  category_name?: string
}

interface Customer {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  website: string | null
  updated_at: string | null
}

interface SalesMetric {
  label: string
  value: number | string
  previousValue?: number | string
  change?: number
  trend?: "up" | "down" | "neutral"
  icon: React.ReactNode
  color: string
}

interface ProductPerformance {
  id: string
  name: string
  revenue: number
  quantity: number
  averagePrice: number
  percentOfTotal: number
}

interface TimeSeriesData {
  date: string
  revenue: number
  orders: number
  averageOrderValue: number
}

interface CategoryPerformance {
  name: string
  value: number
  color: string
}

// Color palette for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

// Helper function to generate random data for demo purposes
const generateRandomData = (count: number, min: number, max: number) => {
  return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min)
}

export default function SalesReportsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [minAmount, setMinAmount] = useState<number[]>([0])
  const [maxAmount, setMaxAmount] = useState<number[]>([10000])
  const [activeTab, setActiveTab] = useState("overview")
  const [chartType, setChartType] = useState("bar")
  const [timeFrame, setTimeFrame] = useState("daily")
  const { getAppTranslation, language, isRTL } = useLanguage()
  const rtlEnabled = isRTL
  const [currentCurrency, setCurrentCurrency] = useState<string>("USD")

  const supabase = createClient()
  const { toast } = useToast()

  // Fetch currency setting
  const fetchCurrency = async () => {
    try {
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
  }

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch currency first
      await fetchCurrency()

      // Fetch sales with date range filter
      let query = supabase.from("sales").select("*").order("created_at", { ascending: false })

      if (dateRange?.from) {
        query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"))
      }

      if (dateRange?.to) {
        query = query.lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59")
      }

      const { data: salesData, error: salesError } = await query

      if (salesError) throw salesError

      // Fetch products
      const { data: productsData, error: productsError } = await supabase.from("products").select("*")

      if (productsError) throw productsError

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase.from("profiles").select("*")

      if (customersError) throw customersError

      // Fetch sale items
      const { data: saleItemsData, error: saleItemsError } = await supabase.from("sale_items").select("*")

      if (saleItemsError) throw saleItemsError

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase.from("categories").select("*")

      if (categoriesError) throw categoriesError

      // Process and combine data
      const processedSales =
        salesData?.map((sale) => {
          const customer = customersData?.find((c) => c.id === sale.customer_id)
          const saleItems = saleItemsData
            ?.filter((item) => item.sale_id === sale.id)
            .map((item) => {
              const product = productsData?.find((p) => p.id === item.product_id)
              return {
                ...item,
                product_name: product?.name || "Unknown Product",
              }
            })

          // Add default values for missing fields
          return {
            ...sale,
            customer_name: customer?.full_name || "Guest",
            items: saleItems || [],
            status: "completed", // Default status
            updated_at: sale.created_at, // Default to created_at
          }
        }) || []

      const processedProducts =
        productsData?.map((product) => {
          const category = categoriesData?.find((c) => c.id === product.category_id)
          return {
            ...product,
            category_name: category?.name || "Uncategorized",
          }
        }) || []

      setSales(processedSales)
      setProducts(processedProducts)
      setCustomers(customersData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: getAppTranslation("error"),
        description: getAppTranslation("error"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Listen for storage events (triggered when settings are updated)
    const handleStorageChange = () => {
      fetchCurrency()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("focus", fetchCurrency)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", fetchCurrency)
    }
  }, [dateRange])

  // Filter sales based on search and filters
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Search term filter
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        sale.id.toLowerCase().includes(searchLower) ||
        sale.customer_name?.toLowerCase().includes(searchLower) ||
        false ||
        sale.payment_method.toLowerCase().includes(searchLower) ||
        sale.status?.toLowerCase().includes(searchLower) ||
        false ||
        sale.total.toString().includes(searchLower)

      // Payment method filter
      const matchesPayment = paymentFilter === "all" || sale.payment_method === paymentFilter

      // Status filter
      const matchesStatus = statusFilter === "all" || sale.status === statusFilter

      // Amount range filter
      const matchesAmount = sale.total >= minAmount[0] && sale.total <= maxAmount[0]

      return matchesSearch && matchesPayment && matchesStatus && matchesAmount
    })
  }, [sales, searchTerm, paymentFilter, statusFilter, minAmount, maxAmount])

  // Calculate metrics
  const metrics = useMemo(() => {
    if (sales.length === 0) return []

    // Total revenue
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)

    // Previous period for comparison
    const currentPeriodStart = dateRange?.from || subDays(new Date(), 30)
    const currentPeriodEnd = dateRange?.to || new Date()
    const daysDiff = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24))
    const previousPeriodStart = subDays(currentPeriodStart, daysDiff)
    const previousPeriodEnd = subDays(currentPeriodStart, 1)

    const previousPeriodSales = sales.filter((sale) => {
      const saleDate = new Date(sale.created_at)
      return isAfter(saleDate, previousPeriodStart) && isBefore(saleDate, previousPeriodEnd)
    })

    const previousRevenue = previousPeriodSales.reduce((sum, sale) => sum + sale.total, 0)
    const revenueChange = previousRevenue === 0 ? 100 : ((totalRevenue - previousRevenue) / previousRevenue) * 100

    // Order count
    const orderCount = sales.length
    const previousOrderCount = previousPeriodSales.length
    const orderCountChange =
      previousOrderCount === 0 ? 100 : ((orderCount - previousOrderCount) / previousOrderCount) * 100

    // Average order value
    const averageOrderValue = totalRevenue / orderCount
    const previousAverageOrderValue = previousOrderCount === 0 ? 0 : previousRevenue / previousOrderCount
    const aovChange =
      previousAverageOrderValue === 0
        ? 100
        : ((averageOrderValue - previousAverageOrderValue) / previousAverageOrderValue) * 100

    // Unique customers
    const uniqueCustomerIds = new Set(sales.map((sale) => sale.customer_id).filter(Boolean))
    const uniqueCustomerCount = uniqueCustomerIds.size
    const previousUniqueCustomerIds = new Set(previousPeriodSales.map((sale) => sale.customer_id).filter(Boolean))
    const previousUniqueCustomerCount = previousUniqueCustomerIds.size
    const customerCountChange =
      previousUniqueCustomerCount === 0
        ? 100
        : ((uniqueCustomerCount - previousUniqueCustomerCount) / previousUniqueCustomerCount) * 100

    return [
      {
        label: getAppTranslation("total"),
        value: formatCurrency(totalRevenue, currentCurrency, language),
        previousValue: formatCurrency(previousRevenue, currentCurrency, language),
        change: revenueChange,
        trend: revenueChange >= 0 ? "up" : "down",
        icon: <DollarSign className="h-4 w-4" />,
        color: "bg-green-500",
      },
      {
        label: getAppTranslation("transactions"),
        value: orderCount,
        previousValue: previousOrderCount,
        change: orderCountChange,
        trend: orderCountChange >= 0 ? "up" : "down",
        icon: <ShoppingCart className="h-4 w-4" />,
        color: "bg-blue-500",
      },
      {
        label: getAppTranslation("average"),
        value: formatCurrency(averageOrderValue, currentCurrency, language),
        previousValue: formatCurrency(previousAverageOrderValue, currentCurrency, language),
        change: aovChange,
        trend: aovChange >= 0 ? "up" : "down",
        icon: <TrendingUp className="h-4 w-4" />,
        color: "bg-purple-500",
      },
      {
        label: getAppTranslation("customers"),
        value: uniqueCustomerCount,
        previousValue: previousUniqueCustomerCount,
        change: customerCountChange,
        trend: customerCountChange >= 0 ? "up" : "down",
        icon: <Users className="h-4 w-4" />,
        color: "bg-orange-500",
      },
    ]
  }, [sales, dateRange, currentCurrency, language, getAppTranslation])

  // Calculate product performance
  const productPerformance = useMemo(() => {
    if (sales.length === 0) return []

    const productMap = new Map<string, ProductPerformance>()
    let totalRevenue = 0

    // Aggregate sales by product
    sales.forEach((sale) => {
      sale.items?.forEach((item) => {
        totalRevenue += item.price * item.quantity

        if (productMap.has(item.product_id)) {
          const existing = productMap.get(item.product_id)!
          productMap.set(item.product_id, {
            ...existing,
            revenue: existing.revenue + item.price * item.quantity,
            quantity: existing.quantity + item.quantity,
          })
        } else {
          const product = products.find((p) => p.id === item.product_id)
          productMap.set(item.product_id, {
            id: item.product_id,
            name: product?.name || item.product_name || "Unknown Product",
            revenue: item.price * item.quantity,
            quantity: item.quantity,
            averagePrice: item.price,
            percentOfTotal: 0, // Will calculate after
          })
        }
      })
    })

    // Calculate percentages and average prices
    const result = Array.from(productMap.values()).map((product) => ({
      ...product,
      averagePrice: product.revenue / product.quantity,
      percentOfTotal: (product.revenue / totalRevenue) * 100,
    }))

    // Sort by revenue (highest first)
    return result.sort((a, b) => b.revenue - a.revenue)
  }, [sales, products])

  // Generate time series data
  const timeSeriesData = useMemo(() => {
    if (sales.length === 0) return []

    const dateMap = new Map<string, TimeSeriesData>()

    // Group by date based on timeFrame
    sales.forEach((sale) => {
      const saleDate = new Date(sale.created_at)
      let dateKey: string

      if (timeFrame === "hourly") {
        dateKey = format(saleDate, "yyyy-MM-dd HH:00")
      } else if (timeFrame === "daily") {
        dateKey = format(saleDate, "yyyy-MM-dd")
      } else if (timeFrame === "weekly") {
        // Use the first day of the week
        const day = saleDate.getDay()
        const diff = saleDate.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
        dateKey = format(new Date(saleDate.setDate(diff)), "yyyy-MM-dd")
      } else {
        // monthly
        dateKey = format(saleDate, "yyyy-MM")
      }

      if (dateMap.has(dateKey)) {
        const existing = dateMap.get(dateKey)!
        dateMap.set(dateKey, {
          ...existing,
          revenue: existing.revenue + sale.total,
          orders: existing.orders + 1,
          averageOrderValue: (existing.revenue + sale.total) / (existing.orders + 1),
        })
      } else {
        dateMap.set(dateKey, {
          date: dateKey,
          revenue: sale.total,
          orders: 1,
          averageOrderValue: sale.total,
        })
      }
    })

    // Convert to array and sort by date
    return Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        ...item,
        date:
          timeFrame === "monthly"
            ? format(new Date(item.date + "-01"), "MMM yyyy")
            : timeFrame === "weekly"
              ? `Week of ${format(new Date(item.date), "MMM d")}`
              : timeFrame === "hourly"
                ? format(new Date(item.date), "ha MMM d")
                : format(new Date(item.date), "MMM d"),
      }))
  }, [sales, timeFrame])

  // Generate category performance data
  const categoryPerformance = useMemo(() => {
    if (sales.length === 0 || products.length === 0) return []

    const categoryMap = new Map<string, number>()

    // Aggregate sales by category
    sales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const product = products.find((p) => p.id === item.product_id)
        const categoryName = product?.category_name || getAppTranslation("uncategorized")
        const revenue = item.price * item.quantity

        if (categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, categoryMap.get(categoryName)! + revenue)
        } else {
          categoryMap.set(categoryName, revenue)
        }
      })
    })

    // Convert to array and add colors
    return Array.from(categoryMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [sales, products, getAppTranslation])

  // AI-powered insights
  const generateInsights = () => {
    if (sales.length === 0) return []

    const insights = []

    // Top performing product
    if (productPerformance.length > 0) {
      const topProduct = productPerformance[0]
      insights.push({
        title: getAppTranslation("products"),
        description: `"${topProduct.name}" ${getAppTranslation("products")}, ${getAppTranslation("total")} ${formatCurrency(topProduct.revenue, currentCurrency, language)} (${topProduct.percentOfTotal.toFixed(1)}% ${getAppTranslation("total")}).`,
        icon: <Package className="h-5 w-5 text-blue-500" />,
      })
    }

    // Sales trend
    if (timeSeriesData.length > 2) {
      const lastIndex = timeSeriesData.length - 1
      const currentRevenue = timeSeriesData[lastIndex].revenue
      const previousRevenue = timeSeriesData[lastIndex - 1].revenue
      const trend = currentRevenue > previousRevenue ? getAppTranslation("active") : getAppTranslation("inactive")
      const percentChange = Math.abs(((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)

      insights.push({
        title: getAppTranslation("sales_trend"),
        description: `${getAppTranslation("sales")} ${trend === "active" ? getAppTranslation("active") : getAppTranslation("inactive")} ${getAppTranslation("by")} ${percentChange}% ${getAppTranslation("for")}.`,
        icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      })
    }

    // Best day of week
    const dayOfWeekMap = new Map<number, number>()
    sales.forEach((sale) => {
      const saleDate = new Date(sale.created_at)
      const dayOfWeek = saleDate.getDay()

      if (dayOfWeekMap.has(dayOfWeek)) {
        dayOfWeekMap.set(dayOfWeek, dayOfWeekMap.get(dayOfWeek)! + sale.total)
      } else {
        dayOfWeekMap.set(dayOfWeek, sale.total)
      }
    })

    if (dayOfWeekMap.size > 0) {
      const bestDay = Array.from(dayOfWeekMap.entries()).sort((a, b) => b[1] - a[1])[0]
      const dayNames = [
        getAppTranslation("date"),
        getAppTranslation("date"),
        getAppTranslation("date"),
        getAppTranslation("date"),
        getAppTranslation("date"),
        getAppTranslation("date"),
        getAppTranslation("date"),
      ]

      insights.push({
        title: getAppTranslation("sales"),
        description: `${dayNames[bestDay[0]]} ${getAppTranslation("sales")}, ${getAppTranslation("with")} ${formatCurrency(bestDay[1] / Math.ceil(sales.length / 7), currentCurrency, language)}.`,
        icon: <Calendar className="h-5 w-5 text-purple-500" />,
      })
    }

    // Customer insights
    if (customers.length > 0) {
      const customerSalesMap = new Map<string, number>()

      sales.forEach((sale) => {
        if (sale.customer_id) {
          if (customerSalesMap.has(sale.customer_id)) {
            customerSalesMap.set(sale.customer_id, customerSalesMap.get(sale.customer_id)! + sale.total)
          } else {
            customerSalesMap.set(sale.customer_id, sale.total)
          }
        }
      })

      const topCustomers = Array.from(customerSalesMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, total]) => {
          const customer = customers.find((c) => c.id === id)
          return {
            name: customer?.full_name || getAppTranslation("name"),
            total,
          }
        })

      if (topCustomers.length > 0) {
        insights.push({
          title: getAppTranslation("customers"),
          description: `${topCustomers[0].name} ${getAppTranslation("customers")}, ${getAppTranslation("with")} ${formatCurrency(topCustomers[0].total, currentCurrency, language)}.`,
          icon: <Users className="h-5 w-5 text-orange-500" />,
        })
      }
    }

    // Opportunity insights
    if (productPerformance.length > 3) {
      const lowPerformers = productPerformance
        .filter((p) => p.percentOfTotal < 5)
        .sort((a, b) => a.percentOfTotal - b.percentOfTotal)
        .slice(0, 3)

      if (lowPerformers.length > 0) {
        insights.push({
          title: getAppTranslation("info"),
          description: `${getAppTranslation("select")} "${lowPerformers[0].name}" ${getAppTranslation("name")} ${lowPerformers[0].percentOfTotal.toFixed(1)}% ${getAppTranslation("of")}.`,
          icon: <Zap className="h-5 w-5 text-yellow-500" />,
        })
      }
    }

    return insights
  }

  const insights = useMemo(generateInsights, [
    sales,
    productPerformance,
    timeSeriesData,
    customers,
    currentCurrency,
    language,
    getAppTranslation,
  ])

  // Table columns
  const columns: ColumnDef<Sale>[] = [
    {
      accessorKey: "id",
      header: getAppTranslation("name"),
      cell: ({ row }) => <div className="font-medium">{row.original.id.substring(0, 8)}...</div>,
    },
    {
      accessorKey: "created_at",
      header: getAppTranslation("date"),
      cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy h:mm a"),
    },
    {
      accessorKey: "customer_name",
      header: getAppTranslation("customers"),
    },
    {
      accessorKey: "total",
      header: getAppTranslation("amount"),
      cell: ({ row }) => formatCurrency(row.original.total, currentCurrency, language),
    },
    {
      accessorKey: "payment_method",
      header: getAppTranslation("payment_method"),
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.payment_method}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: getAppTranslation("status"),
      cell: ({ row }) => {
        const status = row.original.status || "completed"
        let variant: "default" | "outline" | "secondary" | "destructive" = "outline"

        if (status === "completed") variant = "default"
        if (status === "pending") variant = "secondary"
        if (status === "cancelled") variant = "destructive"

        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        )
      },
    },
  ]

  // Export data to CSV
  const handleExport = () => {
    if (filteredSales.length === 0) return

    const headers = [
      getAppTranslation("name"),
      getAppTranslation("date"),
      getAppTranslation("customers"),
      getAppTranslation("amount"),
      getAppTranslation("payment_method"),
      getAppTranslation("status"),
    ]

    const csvData = filteredSales.map((sale) => [
      sale.id,
      format(new Date(sale.created_at), "yyyy-MM-dd HH:mm:ss"),
      sale.customer_name,
      sale.total.toString(),
      sale.payment_method,
      sale.status || "completed",
    ])

    const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `sales_report_${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{getAppTranslation("reports")}</h1>
          <Skeleton className="h-10 w-[250px]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>

        <Skeleton className="h-[400px] w-full" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[300px] w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">{getAppTranslation("reports")}</h1>

        <div className="flex items-center gap-2">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-[250px]" />
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
            {getAppTranslation("export")}
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{metric.value}</h3>

                  <div className="flex items-center mt-2">
                    {metric.trend === "up" ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : metric.trend === "down" ? (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    ) : null}

                    <span
                      className={cn(
                        "text-xs font-medium",
                        metric.trend === "up" ? "text-green-500" : metric.trend === "down" ? "text-red-500" : "",
                      )}
                    >
                      {metric.change !== undefined ? `${Math.abs(metric.change).toFixed(1)}%` : "N/A"}
                    </span>

                    <span className="text-xs text-muted-foreground ml-1">{getAppTranslation("for")}</span>
                  </div>
                </div>

                <div className={cn("p-2 rounded-full", metric.color)}>{metric.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 md:w-[600px] mb-4">
          <TabsTrigger value="overview">{getAppTranslation("overview")}</TabsTrigger>
          <TabsTrigger value="products">{getAppTranslation("products")}</TabsTrigger>
          <TabsTrigger value="trends">{getAppTranslation("sales_trend")}</TabsTrigger>
          <TabsTrigger value="details">{getAppTranslation("info")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                {getAppTranslation("info")}
              </CardTitle>
              <CardDescription>{getAppTranslation("info")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="mt-1">{insight.icon}</div>
                    <div>
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>{getAppTranslation("revenue")}</CardTitle>
                <CardDescription>{getAppTranslation("sales")}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={timeFrame} onValueChange={setTimeFrame}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={getAppTranslation("date")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">{getAppTranslation("time")}</SelectItem>
                    <SelectItem value="daily">{getAppTranslation("date")}</SelectItem>
                    <SelectItem value="weekly">{getAppTranslation("date")}</SelectItem>
                    <SelectItem value="monthly">{getAppTranslation("date")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={chartType} onValueChange={setChartType}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder={getAppTranslation("name")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">{getAppTranslation("name")}</SelectItem>
                    <SelectItem value="line">{getAppTranslation("name")}</SelectItem>
                    <SelectItem value="area">{getAppTranslation("name")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "bar" ? (
                    <BarChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip
                        formatter={(value: number) => formatCurrency(value, currentCurrency, language)}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name={getAppTranslation("revenue")} fill="#0088FE" />
                      <Bar dataKey="orders" name={getAppTranslation("transactions")} fill="#00C49F" />
                    </BarChart>
                  ) : chartType === "line" ? (
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => {
                          if (name === "Revenue") {
                            return formatCurrency(value, currentCurrency, language)
                          }
                          return value
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name={getAppTranslation("revenue")}
                        stroke="#0088FE"
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        name={getAppTranslation("transactions")}
                        stroke="#00C49F"
                      />
                    </LineChart>
                  ) : (
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => {
                          if (name === "Revenue") {
                            return formatCurrency(value, currentCurrency, language)
                          }
                          return value
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name={getAppTranslation("revenue")}
                        stroke="#0088FE"
                        fill="#0088FE"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="orders"
                        name={getAppTranslation("transactions")}
                        stroke="#00C49F"
                        fill="#00C49F"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  {getAppTranslation("categories")}
                </CardTitle>
                <CardDescription>{getAppTranslation("categories")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryPerformance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number) => formatCurrency(value, currentCurrency, language)}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {getAppTranslation("payment_methods")}
                </CardTitle>
                <CardDescription>{getAppTranslation("payment_methods")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={[
                        {
                          name: getAppTranslation("cash"),
                          value: sales.filter((s) => s.payment_method === "cash").length,
                        },
                        {
                          name: getAppTranslation("card"),
                          value: sales.filter((s) => s.payment_method === "credit_card").length,
                        },
                        {
                          name: getAppTranslation("card"),
                          value: sales.filter((s) => s.payment_method === "debit_card").length,
                        },
                        {
                          name: getAppTranslation("transfer"),
                          value: sales.filter((s) => s.payment_method === "mobile_payment").length,
                        },
                        {
                          name: getAppTranslation("all"),
                          value: sales.filter(
                            (s) =>
                              s.status &&
                              !["cash", "credit_card", "debit_card", "mobile_payment"].includes(s.payment_method),
                          ).length,
                        },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <RechartsTooltip />
                      <Bar dataKey="value" fill="#8884d8">
                        {[
                          { name: getAppTranslation("cash"), color: "#FF8042" },
                          { name: getAppTranslation("card"), color: "#0088FE" },
                          { name: getAppTranslation("card"), color: "#00C49F" },
                          { name: getAppTranslation("transfer"), color: "#FFBB28" },
                          { name: getAppTranslation("all"), color: "#8884d8" },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sales Status */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  {getAppTranslation("status")}
                </CardTitle>
                <CardDescription>{getAppTranslation("status")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: getAppTranslation("active"),
                            value: sales.filter((s) => s.status === "completed").length,
                            color: "#4ade80",
                          },
                          {
                            name: getAppTranslation("inactive"),
                            value: sales.filter((s) => s.status === "pending").length,
                            color: "#facc15",
                          },
                          {
                            name: getAppTranslation("inactive"),
                            value: sales.filter((s) => s.status === "cancelled").length,
                            color: "#f87171",
                          },
                          {
                            name: getAppTranslation("all"),
                            value: sales.filter(
                              (s) => s.status && !["completed", "pending", "cancelled"].includes(s.status),
                            ).length,
                            color: "#94a3b8",
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: getAppTranslation("active"), color: "#4ade80" },
                          { name: getAppTranslation("inactive"), color: "#facc15" },
                          { name: getAppTranslation("inactive"), color: "#f87171" },
                          { name: getAppTranslation("all"), color: "#94a3b8" },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{getAppTranslation("products")}</CardTitle>
              <CardDescription>{getAppTranslation("products")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {productPerformance.slice(0, 10).map((product, index) => (
                  <div key={product.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-muted-foreground w-5">{index + 1}.</span>
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <span className="font-medium cursor-help">{product.name}</span>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-semibold">{product.name}</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground">{getAppTranslation("revenue")}</p>
                                  <p className="font-medium">
                                    {formatCurrency(product.revenue, currentCurrency, language)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">{getAppTranslation("quantity")}</p>
                                  <p className="font-medium">
                                    {product.quantity} {getAppTranslation("quantity")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">{getAppTranslation("price")}</p>
                                  <p className="font-medium">
                                    {formatCurrency(product.averagePrice, currentCurrency, language)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">% {getAppTranslation("of")}</p>
                                  <p className="font-medium">{product.percentOfTotal.toFixed(1)}%</p>
                                </div>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(product.revenue, currentCurrency, language)}
                      </span>
                    </div>
                    <Progress value={product.percentOfTotal} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {product.quantity} {getAppTranslation("quantity")}
                      </span>
                      <span>
                        {product.percentOfTotal.toFixed(1)}% {getAppTranslation("of")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{getAppTranslation("products")}</CardTitle>
                <CardDescription>{getAppTranslation("products")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={productPerformance.slice(0, 5)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <RechartsTooltip
                        formatter={(value: number) => formatCurrency(value, currentCurrency, language)}
                      />
                      <Bar dataKey="revenue" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{getAppTranslation("products")}</CardTitle>
                <CardDescription>{getAppTranslation("products")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...productPerformance].sort((a, b) => b.quantity - a.quantity).slice(0, 5)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <RechartsTooltip />
                      <Bar dataKey="quantity" name={getAppTranslation("quantity")} fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{getAppTranslation("sales_trend")}</CardTitle>
              <CardDescription>{getAppTranslation("sales")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => {
                        if (name === "Revenue") {
                          return formatCurrency(value, currentCurrency, language)
                        }
                        if (name === "Avg. Order Value") {
                          return formatCurrency(value, currentCurrency, language)
                        }
                        return value
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name={getAppTranslation("revenue")}
                      stroke="#0088FE"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      name={getAppTranslation("transactions")}
                      stroke="#00C49F"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="averageOrderValue"
                      name={getAppTranslation("average")}
                      stroke="#FFBB28"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>{getAppTranslation("sales")}</CardTitle>
                <CardDescription>{getAppTranslation("sales")}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                {getAppTranslation("export")}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search
                        className={`absolute ${rtlEnabled ? "right-2.5" : "left-2.5"} top-2.5 h-4 w-4 text-muted-foreground`}
                      />
                      <Input
                        placeholder={getAppTranslation("search")}
                        className={rtlEnabled ? "pr-8" : "pl-8"}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9">
                          <Filter className="h-4 w-4 mr-2" />
                          {getAppTranslation("filters")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <h4 className="font-medium">{getAppTranslation("filters")}</h4>

                          <div className="space-y-2">
                            <Label htmlFor="payment-method">{getAppTranslation("payment_method")}</Label>
                            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                              <SelectTrigger id="payment-method">
                                <SelectValue placeholder={getAppTranslation("select")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{getAppTranslation("all_methods")}</SelectItem>
                                <SelectItem value="cash">{getAppTranslation("cash")}</SelectItem>
                                <SelectItem value="credit_card">{getAppTranslation("card")}</SelectItem>
                                <SelectItem value="debit_card">{getAppTranslation("card")}</SelectItem>
                                <SelectItem value="mobile_payment">{getAppTranslation("transfer")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="status">{getAppTranslation("status")}</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger id="status">
                                <SelectValue placeholder={getAppTranslation("select")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{getAppTranslation("all")}</SelectItem>
                                <SelectItem value="completed">{getAppTranslation("active")}</SelectItem>
                                <SelectItem value="pending">{getAppTranslation("inactive")}</SelectItem>
                                <SelectItem value="cancelled">{getAppTranslation("inactive")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor="amount-range">{getAppTranslation("amount")}</Label>
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(minAmount[0], currentCurrency, language)} -{" "}
                                {formatCurrency(maxAmount[0], currentCurrency, language)}
                              </span>
                            </div>
                            <Slider
                              defaultValue={[0, 10000]}
                              max={10000}
                              step={100}
                              value={[minAmount[0]]}
                              onValueChange={setMinAmount}
                              className="mb-4"
                            />
                            <Slider
                              defaultValue={[0, 10000]}
                              max={10000}
                              step={100}
                              value={[maxAmount[0]]}
                              onValueChange={setMaxAmount}
                            />
                          </div>

                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPaymentFilter("all")
                                setStatusFilter("all")
                                setMinAmount([0])
                                setMaxAmount([10000])
                              }}
                            >
                              {getAppTranslation("clear_filters")}
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <DataTable columns={columns} data={filteredSales} />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {getAppTranslation("showing")} {filteredSales.length} {getAppTranslation("of")} {sales.length}{" "}
                {getAppTranslation("total")}
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

