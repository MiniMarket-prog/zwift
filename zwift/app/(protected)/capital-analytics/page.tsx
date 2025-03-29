"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
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
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { CircleDollarSign, DollarSign, Download, RefreshCw, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import {
  getCapitalAnalytics,
  getCapitalTrends,
  getProductProfitability,
  getInventoryOptimizationRecommendations,
} from "@/lib/capital-analytics"

// Import formatCurrency from the correct location
import { formatCurrency } from "@/lib/format-currency"
import { createClient } from "@/lib/supabase-client"

// Define types
interface CapitalAnalytics {
  totalCapital: number
  totalCost: number
  estimatedProfit: number
  profitMargin: number
  capitalByCategory: CategoryCapital[]
  highValueProducts: HighValueProduct[]
  slowMovingInventory: SlowMovingProduct[]
  inventoryTurnover: number
  totalProducts: number
  totalStock: number
}

interface CategoryCapital {
  id: string
  name: string
  capital: number
  cost: number
  profit: number
  productCount: number
  totalStock: number
}

interface HighValueProduct {
  id: string
  name: string
  price: number
  stock: number
  totalValue: number
  totalCost: number
  profit: number
}

interface SlowMovingProduct {
  id: string
  name: string
  price: number
  stock: number
  salesCount: number
  salesRatio: number
  capitalTied: number
}

interface CapitalTrends {
  timeIntervals: TimeInterval[]
  totalSales: number
  totalExpenses: number
  totalProfit: number
}

interface TimeInterval {
  date: Date
  sales: number
  expenses: number
  profit: number
}

interface ProductProfitability {
  productProfitability: ProductProfitabilityItem[]
  mostProfitable: ProductProfitabilityItem[]
  highestTurnover: ProductProfitabilityItem[]
  lowestTurnover: ProductProfitabilityItem[]
}

interface ProductProfitabilityItem {
  id: string
  name: string
  stock: number
  price: number
  costPrice: number
  quantitySold: number
  averageSellingPrice: number
  profitMargin: number
  inventoryValue: number
  inventoryCost: number
  potentialProfit: number
  turnoverRate: number
}

interface InventoryOptimization {
  restockRecommendations: OptimizationRecommendation[]
  reduceRecommendations: OptimizationRecommendation[]
  potentialCapitalRelease: number
  requiredRestockInvestment: number
}

interface OptimizationRecommendation {
  id: string
  name: string
  currentStock: number
  minStock: number
  optimalStock: number
  salesFrequency: number
  recommendation: string
  actionQuantity: number
  capitalImpact: number
  priority: number
}

interface DateRange {
  from: Date
  to: Date
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#8DD1E1",
  "#A4DE6C",
  "#D0ED57",
]

const CapitalAnalyticsPage = () => {
  const { language, getAppTranslation, isRTL } = useLanguage()
  const { toast } = useToast()
  const rtlEnabled = isRTL

  // State variables
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  })

  // Data states
  const [capitalAnalytics, setCapitalAnalytics] = useState<CapitalAnalytics | null>(null)
  const [capitalTrends, setCapitalTrends] = useState<CapitalTrends | null>(null)
  const [productProfitability, setProductProfitability] = useState<ProductProfitability | null>(null)
  const [inventoryOptimization, setInventoryOptimization] = useState<InventoryOptimization | null>(null)
  const [currentCurrency, setCurrentCurrency] = useState("USD")

  // Add this useEffect to fetch the currency setting
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("settings").select("currency").eq("type", "global").single()

        if (!error && data?.currency) {
          setCurrentCurrency(data.currency)
        }
      } catch (error) {
        console.error("Error fetching currency setting:", error)
      }
    }

    fetchCurrency()

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
  }, [])

  // Fetch data functions
  const fetchCapitalAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getCapitalAnalytics()
      setCapitalAnalytics(data)
    } catch (error) {
      console.error("Error fetching capital analytics:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_fetch_capital_analytics" as any, language),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, getAppTranslation, language])

  // Add this after the fetchCapitalAnalytics function
  useEffect(() => {
    if (capitalAnalytics) {
      console.log("Capital Analytics data:", capitalAnalytics)
      console.log("Total products count:", capitalAnalytics.totalProducts)
    }
  }, [capitalAnalytics])

  const fetchCapitalTrends = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getCapitalTrends(selectedPeriod)
      setCapitalTrends(data)
    } catch (error) {
      console.error("Error fetching capital trends:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_fetch_capital_trends" as any, language),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedPeriod, toast, getAppTranslation, language])

  const fetchProductProfitability = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getProductProfitability()
      setProductProfitability(data)
    } catch (error) {
      console.error("Error fetching product profitability:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_fetch_product_profitability" as any, language),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, getAppTranslation, language])

  const fetchInventoryOptimization = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getInventoryOptimizationRecommendations()
      setInventoryOptimization(data)
    } catch (error) {
      console.error("Error fetching inventory optimization:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_fetch_inventory_optimization" as any, language),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, getAppTranslation, language])

  // Initial data load
  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        fetchCapitalAnalytics(),
        fetchCapitalTrends(),
        fetchProductProfitability(),
        fetchInventoryOptimization(),
      ])
    }

    loadAllData()
  }, [fetchCapitalAnalytics, fetchCapitalTrends, fetchProductProfitability, fetchInventoryOptimization])

  // Handle period selection
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
  }

  // Update trends when period changes
  useEffect(() => {
    fetchCapitalTrends()
  }, [selectedPeriod, fetchCapitalTrends])

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  // Export data to CSV
  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0]).join(",")
    const csvRows = data.map((row) =>
      Object.values(row)
        .map((value) => (typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value))
        .join(","),
    )

    const csvContent = [headers, ...csvRows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Get growth indicator
  const getGrowthIndicator = (value: number, inverse = false) => {
    if (value === 0) return null

    const isPositive = inverse ? value < 0 : value > 0
    const Icon = isPositive ? TrendingUp : TrendingDown
    const colorClass = isPositive ? "text-green-600" : "text-red-600"

    return (
      <div className={`flex items-center ${colorClass}`}>
        <Icon className="h-4 w-4 mr-1" />
        <span>
          {value > 0 ? "+" : ""}
          {value.toFixed(1)}%
        </span>
      </div>
    )
  }

  // Loading state
  if (isLoading && !capitalAnalytics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-8 w-8 animate-spin mb-4" />
          <h3 className="text-lg font-medium">{getAppTranslation("loading_capital_analytics" as any, language)}</h3>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">{getAppTranslation("capital_analytics" as any, language)}</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={getAppTranslation("select_period" as any, language)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{getAppTranslation("last_7_days" as any, language)}</SelectItem>
              <SelectItem value="month">{getAppTranslation("last_30_days" as any, language)}</SelectItem>
              <SelectItem value="quarter">{getAppTranslation("last_3_months" as any, language)}</SelectItem>
              <SelectItem value="year">{getAppTranslation("last_12_months" as any, language)}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              fetchCapitalAnalytics()
              fetchCapitalTrends()
              fetchProductProfitability()
              fetchInventoryOptimization()
            }}
          >
            <RefreshCw className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
            {getAppTranslation("refresh_data" as any, language)}
          </Button>
        </div>
      </div>

      {capitalAnalytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {getAppTranslation("total_inventory_value" as any, language)}
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(capitalAnalytics.totalCapital, currentCurrency, language)}
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {capitalAnalytics.totalProducts} {getAppTranslation("products" as any, language)},{" "}
                  {capitalAnalytics.totalStock} {getAppTranslation("units" as any, language)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {getAppTranslation("estimated_profit" as any, language)}
              </CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(capitalAnalytics.estimatedProfit, currentCurrency, language)}
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {getAppTranslation("profit_margin" as any, language)}:{" "}
                  {formatPercentage(capitalAnalytics.profitMargin)}
                </p>
                {getGrowthIndicator(capitalAnalytics.profitMargin)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {getAppTranslation("inventory_cost" as any, language)}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(capitalAnalytics.totalCost, currentCurrency, language)}
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {getAppTranslation("avg_cost_per_product" as any, language)}:{" "}
                  {formatCurrency(
                    capitalAnalytics.totalCost / capitalAnalytics.totalProducts,
                    currentCurrency,
                    language,
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {getAppTranslation("inventory_turnover" as any, language)}
              </CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{capitalAnalytics.inventoryTurnover.toFixed(2)}x</div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {getAppTranslation("industry_avg" as any, language)}: 4-6x
                </p>
                {getGrowthIndicator(
                  ((capitalAnalytics.inventoryTurnover - 4) / 4) * 100,
                  capitalAnalytics.inventoryTurnover < 4,
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="overview">{getAppTranslation("overview" as any, language)}</TabsTrigger>
          <TabsTrigger value="profitability">{getAppTranslation("profitability" as any, language)}</TabsTrigger>
          <TabsTrigger value="trends">{getAppTranslation("trends" as any, language)}</TabsTrigger>
          <TabsTrigger value="optimization">{getAppTranslation("optimization" as any, language)}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {capitalAnalytics && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>{getAppTranslation("capital_distribution_by_category" as any, language)}</CardTitle>
                    <CardDescription>
                      {getAppTranslation("capital_distribution_description" as any, language)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={capitalAnalytics.capitalByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="capital"
                            nameKey="name"
                            label={({ name, percent }) => (percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : "")}
                          >
                            {capitalAnalytics.capitalByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value, currentCurrency, language)}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-background border rounded p-2 shadow-md">
                                    <p className="font-medium">{data.name}</p>
                                    <p className="text-sm">{formatCurrency(data.capital, currentCurrency, language)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {data.productCount} {getAppTranslation("products" as any, language)}
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{ paddingLeft: "20px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>{getAppTranslation("top_categories_by_value" as any, language)}</CardTitle>
                    <CardDescription>
                      {getAppTranslation("categories_highest_inventory_value" as any, language)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {capitalAnalytics.capitalByCategory.slice(0, 5).map((category, index) => (
                        <div key={category.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{category.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(category.capital, currentCurrency, language)}
                            </span>
                          </div>
                          <Progress
                            value={(category.capital / (capitalAnalytics.capitalByCategory[0]?.capital || 1)) * 100}
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {category.productCount} {getAppTranslation("products" as any, language)}
                            </span>
                            <span>
                              {getAppTranslation("est_profit" as any, language)}:{" "}
                              {formatCurrency(category.profit, currentCurrency, language)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{getAppTranslation("high_value_products" as any, language)}</CardTitle>
                    <CardDescription>
                      {getAppTranslation("products_highest_inventory_value" as any, language)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{getAppTranslation("product" as any, language)}</TableHead>
                          <TableHead>{getAppTranslation("stock" as any, language)}</TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("unit_price" as any, language)}
                          </TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("total_value" as any, language)}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {capitalAnalytics.highValueProducts.slice(0, 5).map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.stock}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.price, currentCurrency, language)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.totalValue, currentCurrency, language)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => exportToCSV(capitalAnalytics.highValueProducts, "high_value_products")}
                    >
                      <Download className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                      {getAppTranslation("export_full_list" as any, language)}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{getAppTranslation("slow_moving_inventory" as any, language)}</CardTitle>
                    <CardDescription>
                      {getAppTranslation("products_high_stock_low_sales" as any, language)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{getAppTranslation("product" as any, language)}</TableHead>
                          <TableHead>{getAppTranslation("stock" as any, language)}</TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("sales_ratio" as any, language)}
                          </TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("capital_tied" as any, language)}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {capitalAnalytics.slowMovingInventory.slice(0, 5).map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.stock}</TableCell>
                            <TableCell className="text-right">{product.salesRatio.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.capitalTied, currentCurrency, language)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => exportToCSV(capitalAnalytics.slowMovingInventory, "slow_moving_inventory")}
                    >
                      <Download className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                      {getAppTranslation("export_full_list" as any, language)}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="profitability" className="space-y-4 mt-4">
          {productProfitability && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>{getAppTranslation("product_profitability_analysis" as any, language)}</CardTitle>
                    <CardDescription>{getAppTranslation("profit_margin_vs_turnover" as any, language)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={productProfitability.productProfitability.slice(0, 50)}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis
                            yAxisId="left"
                            label={{
                              value: getAppTranslation("profit_margin_percent" as any, language),
                              angle: -90,
                              position: "insideLeft",
                            }}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            label={{
                              value: getAppTranslation("turnover_rate" as any, language),
                              angle: 90,
                              position: "insideRight",
                            }}
                          />
                          <Tooltip
                            formatter={(value: number, name: string) => {
                              if (name === "profitMargin")
                                return [`${value.toFixed(1)}%`, getAppTranslation("profit_margin" as any, language)]
                              if (name === "turnoverRate")
                                return [value.toFixed(2), getAppTranslation("turnover_rate" as any, language)]
                              return [value, name]
                            }}
                          />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="profitMargin"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                          <Line yAxisId="right" type="monotone" dataKey="turnoverRate" stroke="#82ca9d" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>{getAppTranslation("most_profitable_products" as any, language)}</CardTitle>
                    <CardDescription>
                      {getAppTranslation("products_highest_profit_margins" as any, language)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {productProfitability.mostProfitable.slice(0, 5).map((product) => (
                        <div key={product.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{product.name}</span>
                            <span className="text-sm text-green-600 font-medium">
                              {formatPercentage(product.profitMargin)}
                            </span>
                          </div>
                          <Progress value={product.profitMargin} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {getAppTranslation("cost" as any, language)}:{" "}
                              {formatCurrency(product.costPrice, currentCurrency, language)}
                            </span>
                            <span>
                              {getAppTranslation("price" as any, language)}:{" "}
                              {formatCurrency(product.price, currentCurrency, language)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{getAppTranslation("highest_turnover_products" as any, language)}</CardTitle>
                    <CardDescription>
                      {getAppTranslation("products_sell_most_frequently" as any, language)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{getAppTranslation("product" as any, language)}</TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("turnover_rate" as any, language)}
                          </TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("profit_margin" as any, language)}
                          </TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("potential_profit" as any, language)}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productProfitability.highestTurnover.slice(0, 5).map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right">{product.turnoverRate.toFixed(2)}x</TableCell>
                            <TableCell className="text-right">{formatPercentage(product.profitMargin)}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.potentialProfit, currentCurrency, language)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => exportToCSV(productProfitability.highestTurnover, "highest_turnover_products")}
                    >
                      <Download className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                      {getAppTranslation("export_full_list" as any, language)}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{getAppTranslation("lowest_turnover_products" as any, language)}</CardTitle>
                    <CardDescription>
                      {getAppTranslation("products_sell_least_frequently" as any, language)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{getAppTranslation("product" as any, language)}</TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("turnover_rate" as any, language)}
                          </TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("profit_margin" as any, language)}
                          </TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("capital_tied" as any, language)}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productProfitability.lowestTurnover.slice(0, 5).map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right">{product.turnoverRate.toFixed(2)}x</TableCell>
                            <TableCell className="text-right">{formatPercentage(product.profitMargin)}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(product.inventoryValue, currentCurrency, language)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => exportToCSV(productProfitability.lowestTurnover, "lowest_turnover_products")}
                    >
                      <Download className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                      {getAppTranslation("export_full_list" as any, language)}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4 mt-4">
          {capitalTrends && (
            <>
              <div className="grid gap-4 md:grid-cols-1">
                <Card>
                  <CardHeader>
                    <CardTitle>{getAppTranslation("capital_trends_over_time" as any, language)}</CardTitle>
                    <CardDescription>
                      {getAppTranslation("sales_expenses_profit_trends" as any, language)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={capitalTrends.timeIntervals}
                          margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(date) => formatDate(new Date(date))}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            tickFormatter={(value) => formatCurrency(value, currentCurrency, language).split(" ")[0]}
                          />
                          <Tooltip
                            labelFormatter={(label) => formatDate(new Date(label))}
                            formatter={(value: number) => formatCurrency(value, currentCurrency, language)}
                            contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                          />
                          <Legend verticalAlign="top" height={36} />
                          <Bar dataKey="sales" name={getAppTranslation("sales" as any, language)} fill="#8884d8" />
                          <Bar
                            dataKey="expenses"
                            name={getAppTranslation("expenses" as any, language)}
                            fill="#82ca9d"
                          />
                          <Bar dataKey="profit" name={getAppTranslation("profit" as any, language)} fill="#ffc658" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>{getAppTranslation("total_sales" as any, language)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {formatCurrency(capitalTrends.totalSales, currentCurrency, language)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getAppTranslation("for_the_period" as any, language)}: {formatDate(dateRange.from)} -{" "}
                      {formatDate(dateRange.to)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{getAppTranslation("total_expenses" as any, language)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {formatCurrency(capitalTrends.totalExpenses, currentCurrency, language)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getAppTranslation("for_the_period" as any, language)}: {formatDate(dateRange.from)} -{" "}
                      {formatDate(dateRange.to)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{getAppTranslation("total_profit" as any, language)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {formatCurrency(capitalTrends.totalProfit, currentCurrency, language)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getAppTranslation("for_the_period" as any, language)}: {formatDate(dateRange.from)} -{" "}
                      {formatDate(dateRange.to)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4 mt-4">
          {inventoryOptimization && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{getAppTranslation("inventory_optimization_summary" as any, language)}</CardTitle>
                    <CardDescription>
                      {getAppTranslation("recommendations_optimize_inventory" as any, language)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">
                            {getAppTranslation("potential_capital_release" as any, language)}
                          </span>
                          <span className="text-sm font-medium text-green-600">
                            {formatCurrency(inventoryOptimization.potentialCapitalRelease, currentCurrency, language)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getAppTranslation("by_reducing_overstock" as any, language)}{" "}
                          {inventoryOptimization.reduceRecommendations.length}{" "}
                          {getAppTranslation("products" as any, language)}
                        </p>
                      </div>

                      <Separator />

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">
                            {getAppTranslation("required_restock_investment" as any, language)}
                          </span>
                          <span className="text-sm font-medium text-amber-600">
                            {formatCurrency(inventoryOptimization.requiredRestockInvestment, currentCurrency, language)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getAppTranslation("to_maintain_optimal_stock" as any, language)}{" "}
                          {inventoryOptimization.restockRecommendations.length}{" "}
                          {getAppTranslation("products" as any, language)}
                        </p>
                      </div>

                      <Separator />

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">
                            {getAppTranslation("net_capital_impact" as any, language)}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              inventoryOptimization.potentialCapitalRelease -
                                inventoryOptimization.requiredRestockInvestment >
                              0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(
                              inventoryOptimization.potentialCapitalRelease -
                                inventoryOptimization.requiredRestockInvestment,
                              currentCurrency,
                              language,
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getAppTranslation("estimated_impact_working_capital" as any, language)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{getAppTranslation("optimization_impact" as any, language)}</CardTitle>
                    <CardDescription>
                      {getAppTranslation("potential_impact_inventory_metrics" as any, language)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: getAppTranslation("reduce_stock" as any, language),
                                value: inventoryOptimization.potentialCapitalRelease,
                              },
                              {
                                name: getAppTranslation("restock" as any, language),
                                value: inventoryOptimization.requiredRestockInvestment,
                              },
                              {
                                name: getAppTranslation("maintain" as any, language),
                                value:
                                  (capitalAnalytics?.totalCapital || 0) - inventoryOptimization.potentialCapitalRelease,
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell fill="#f97316" />
                            <Cell fill="#22c55e" />
                            <Cell fill="#3b82f6" />
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value, currentCurrency, language)}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-background border rounded p-2 shadow-md">
                                    <p className="font-medium">{data.name}</p>
                                    <p className="text-sm">{formatCurrency(data.value, currentCurrency, language)}</p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{ paddingLeft: "10px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-1">
                <Card>
                  <CardHeader>
                    <CardTitle>{getAppTranslation("restock_recommendations" as any, language)}</CardTitle>
                    <CardDescription>{getAppTranslation("products_need_restocking" as any, language)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{getAppTranslation("product" as any, language)}</TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("current_stock" as any, language)}
                          </TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("optimal_stock" as any, language)}
                          </TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("restock_quantity" as any, language)}
                          </TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("investment_required" as any, language)}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryOptimization.restockRecommendations.slice(0, 5).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right">{item.currentStock}</TableCell>
                            <TableCell className="text-right">{item.optimalStock}</TableCell>
                            <TableCell className="text-right">{item.actionQuantity}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.capitalImpact, currentCurrency, language)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() =>
                        exportToCSV(inventoryOptimization.restockRecommendations, "restock_recommendations")
                      }
                    >
                      <Download className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                      {getAppTranslation("export_full_list" as any, language)}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{getAppTranslation("reduce_stock_recommendations" as any, language)}</CardTitle>
                    <CardDescription>{getAppTranslation("products_excess_inventory" as any, language)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{getAppTranslation("product" as any, language)}</TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("current_stock" as any, language)}
                          </TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("optimal_stock" as any, language)}
                          </TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("excess_quantity" as any, language)}
                          </TableHead>
                          <TableHead className="text-right">
                            {getAppTranslation("capital_release" as any, language)}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryOptimization.reduceRecommendations.slice(0, 5).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right">{item.currentStock}</TableCell>
                            <TableCell className="text-right">{item.optimalStock}</TableCell>
                            <TableCell className="text-right">{item.actionQuantity}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.capitalImpact, currentCurrency, language)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() =>
                        exportToCSV(inventoryOptimization.reduceRecommendations, "reduce_stock_recommendations")
                      }
                    >
                      <Download className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                      {getAppTranslation("export_full_list" as any, language)}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}

export default CapitalAnalyticsPage

