"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase-client"
import { getLowStockProducts } from "@/lib/supabase"
import { formatCurrency } from "@/lib/format-currency"
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Package,
  Loader2,
  RefreshCw,
  Download,
  Star,
  Clock,
  Target,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { cn } from "@/lib/utils"

// Define types
type Product = {
  id: string
  name: string
  price: number
  barcode?: string
  stock: number
  min_stock: number
  category_id?: string | null
  image?: string | null
  purchase_price?: number | null
}

type Category = {
  id: string
  name: string
}

type RestockingInsight = {
  product: Product
  priority: "critical" | "high" | "medium" | "low"
  score: number
  reasons: string[]
  recommendedQuantity: number
  estimatedCost: number
  profitMargin: number | null
  urgency: number // 1-10 scale
  salesVelocity: number // avgDailyVelocity
  stockoutRisk: number
  totalQuantitySold: number // New: Total quantity sold in the period
  totalSalesCount: number // New: Total number of sales transactions in the period
}

type CategoryAnalysis = {
  category: Category
  productCount: number
  totalCost: number
  averageScore: number
  highPriorityCount: number
}

const RestockingInsightsPage = () => {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [insights, setInsights] = useState<RestockingInsight[]>([])
  const [categoryAnalysis, setCategoryAnalysis] = useState<CategoryAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentCurrency, setCurrentCurrency] = useState<string>("USD")
  const [salesData, setSalesData] = useState<
    Record<string, { totalQuantitySold: number; totalRevenue: number; salesCount: number; avgDailyVelocity: number }>
  >({})

  const { toast } = useToast()
  const supabase = createClient()
  const { getAppTranslation, language } = useLanguage()

  // Calculate profit margin percentage for a product
  const calculateProfitMargin = useCallback((product: Product): number | null => {
    if (!product.purchase_price || product.purchase_price === 0 || product.price === 0) {
      return null
    }
    return ((product.price - product.purchase_price) / product.price) * 100
  }, [])

  // Fetch currency setting
  const fetchCurrency = useCallback(async () => {
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
  }, [supabase])

  // Fetch sales data for the last 30 days to understand product velocity
  const fetchSalesData = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: salesData, error } = await supabase
        .from("sale_items")
        .select(`
          product_id,
          quantity,
          price,
          sales!inner(created_at)
        `)
        .gte("sales.created_at", thirtyDaysAgo.toISOString())

      if (error) throw error

      // Group sales by product
      const productSales: Record<
        string,
        { totalQuantitySold: number; totalRevenue: number; salesCount: number; avgDailyVelocity: number }
      > = {}

      salesData?.forEach((sale: any) => {
        if (!productSales[sale.product_id]) {
          productSales[sale.product_id] = { totalQuantitySold: 0, totalRevenue: 0, salesCount: 0, avgDailyVelocity: 0 }
        }
        productSales[sale.product_id].totalQuantitySold += sale.quantity
        productSales[sale.product_id].totalRevenue += sale.price * sale.quantity
        productSales[sale.product_id].salesCount += 1
      })

      // Calculate daily velocity
      Object.keys(productSales).forEach((productId) => {
        productSales[productId].avgDailyVelocity = productSales[productId].totalQuantitySold / 30
      })

      setSalesData(productSales)
    } catch (error) {
      console.error("Error fetching sales data:", error)
      setSalesData({})
    }
  }, [supabase])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name")
      if (error) throw error
      setCategories(data as Category[])
    } catch (error) {
      console.error("Error fetching categories:", error)
      setCategories([])
    }
  }, [supabase])

  // Fetch low stock products
  const fetchLowStockProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      const lowStock = await getLowStockProducts()
      setLowStockProducts(lowStock as Product[])
    } catch (error) {
      console.error("Error fetching low stock products:", error)
      toast({
        title: "Error",
        description: "Failed to load products data",
        variant: "destructive",
      })
      setLowStockProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  // Calculate comprehensive restocking insights
  const calculateInsights = useCallback(() => {
    setIsAnalyzing(true)

    const insights: RestockingInsight[] = lowStockProducts.map((product) => {
      const profitMargin = calculateProfitMargin(product)
      const stockShortage = product.min_stock - product.stock
      const stockShortageRatio = stockShortage / product.min_stock

      // Get sales velocity data
      const productSalesData = salesData[product.id] || {
        totalQuantitySold: 0,
        totalRevenue: 0,
        salesCount: 0,
        avgDailyVelocity: 0,
      }
      const dailyVelocity = productSalesData.avgDailyVelocity
      const totalQuantitySold = productSalesData.totalQuantitySold
      const totalSalesCount = productSalesData.salesCount

      // Calculate stockout risk (days until stockout)
      // If dailyVelocity is 0, it means no sales in the last 30 days, so risk is low (high days until stockout)
      const daysUntilStockout = dailyVelocity > 0 ? product.stock / dailyVelocity : Number.POSITIVE_INFINITY
      // Stockout risk is higher if daysUntilStockout is low. Max 100% risk if already out or very soon.
      const stockoutRisk = Math.max(0, Math.min(100, (1 - Math.min(daysUntilStockout / 14, 1)) * 100)) // Risk peaks if stockout in 0-14 days

      // Calculate priority score (0-100)
      let score = 0
      const reasons: string[] = []

      // 1. Stock shortage severity (0-40 points) - Increased weight for direct shortage
      const shortageScore = Math.min(stockShortageRatio * 40, 40)
      score += shortageScore
      if (stockShortage > 0) {
        reasons.push(`${stockShortage} units below minimum stock`)
      }

      // 2. Stockout risk (0-30 points) - Increased weight for impending stockout
      const riskScore = stockoutRisk * 0.3 // 30 points for 100% risk
      score += riskScore
      if (stockoutRisk > 50) {
        reasons.push(`High stockout risk (${Math.round(stockoutRisk)}%)`)
      }

      // 3. Sales velocity (0-20 points) - High velocity means more urgent
      const velocityScore = Math.min(dailyVelocity * 5, 20) // 20 points for 4 units/day
      score += velocityScore
      if (dailyVelocity > 1) {
        reasons.push(`High sales velocity (${dailyVelocity.toFixed(1)} units/day)`)
      }

      // 4. Profit margin impact (0-10 points) - Important, but less urgent than stock
      if (profitMargin !== null) {
        const marginScore = Math.min(profitMargin / 10, 10) // 10 points for 100% margin
        score += marginScore
        if (profitMargin > 20) {
          reasons.push(`High profit margin (${profitMargin.toFixed(1)}%)`)
        }
      }

      // Determine priority based on score
      let priority: "critical" | "high" | "medium" | "low"
      if (score >= 75)
        priority = "critical" // Adjusted threshold to be more selective for critical
      else if (score >= 55) priority = "high"
      else if (score >= 35) priority = "medium"
      else priority = "low"

      // Calculate recommended quantity
      const safetyBuffer = Math.max(Math.ceil(dailyVelocity * 14), 10) // 2 weeks buffer, minimum 10 units
      const recommendedQuantity = Math.max(stockShortage + safetyBuffer, 5) // Ensure at least 5 units recommended

      // Calculate estimated cost
      const estimatedCost = (product.purchase_price || product.price * 0.65) * recommendedQuantity

      // Calculate urgency (1-10 scale)
      const urgency = Math.min(Math.ceil(score / 10), 10)

      return {
        product,
        priority,
        score,
        reasons,
        recommendedQuantity,
        estimatedCost,
        profitMargin,
        urgency,
        salesVelocity: dailyVelocity,
        stockoutRisk,
        totalQuantitySold,
        totalSalesCount,
      }
    })

    // Sort by score (highest first)
    insights.sort((a, b) => b.score - a.score)
    setInsights(insights)

    // Calculate category analysis
    const categoryMap = new Map<string, CategoryAnalysis>()

    categories.forEach((category) => {
      const categoryProducts = insights.filter((i) => i.product.category_id === category.id)
      if (categoryProducts.length > 0) {
        categoryMap.set(category.id, {
          category,
          productCount: categoryProducts.length,
          totalCost: categoryProducts.reduce((sum, p) => sum + p.estimatedCost, 0),
          averageScore: categoryProducts.reduce((sum, p) => sum + p.score, 0) / categoryProducts.length,
          highPriorityCount: categoryProducts.filter((p) => p.priority === "critical" || p.priority === "high").length,
        })
      }
    })

    // Handle uncategorized products
    const uncategorizedProducts = insights.filter((i) => !i.product.category_id)
    if (uncategorizedProducts.length > 0) {
      categoryMap.set("uncategorized", {
        category: { id: "uncategorized", name: "Uncategorized" },
        productCount: uncategorizedProducts.length,
        totalCost: uncategorizedProducts.reduce((sum, p) => sum + p.estimatedCost, 0),
        averageScore: uncategorizedProducts.reduce((sum, p) => sum + p.score, 0) / uncategorizedProducts.length,
        highPriorityCount: uncategorizedProducts.filter((p) => p.priority === "critical" || p.priority === "high")
          .length,
      })
    }

    const sortedCategoryAnalysis = Array.from(categoryMap.values()).sort((a, b) => b.averageScore - a.averageScore)
    setCategoryAnalysis(sortedCategoryAnalysis)

    setIsAnalyzing(false)
  }, [lowStockProducts, salesData, calculateProfitMargin, categories])

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([fetchLowStockProducts(), fetchCategories(), fetchCurrency(), fetchSalesData()])
    }
    initializeData()
  }, [fetchLowStockProducts, fetchCategories, fetchCurrency, fetchSalesData])

  // Calculate insights when data is ready
  useEffect(() => {
    if (lowStockProducts.length > 0) {
      calculateInsights()
    }
  }, [lowStockProducts, salesData, calculateInsights])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200"
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200"
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "low":
        return "text-green-600 bg-green-50 border-green-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critical":
        return <AlertTriangle className="h-4 w-4" />
      case "high":
        return <TrendingUp className="h-4 w-4" />
      case "medium":
        return <Clock className="h-4 w-4" />
      case "low":
        return <Target className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const refreshAnalysis = async () => {
    await fetchLowStockProducts()
    await fetchSalesData()
  }

  const exportInsights = () => {
    const csvContent = [
      [
        "Product Name",
        "Priority",
        "Score",
        "Recommended Quantity",
        "Estimated Cost",
        "Profit Margin",
        "Sales Velocity (units/day)",
        "Total Quantity Sold (30 days)",
        "Total Sales Count (30 days)",
        "Stockout Risk (%)",
        "Reasons",
      ],
      ...insights.map((insight) => [
        insight.product.name,
        insight.priority,
        insight.score.toFixed(0),
        insight.recommendedQuantity.toString(),
        insight.estimatedCost.toFixed(2),
        insight.profitMargin?.toFixed(1) || "N/A",
        insight.salesVelocity.toFixed(2),
        insight.totalQuantitySold.toString(),
        insight.totalSalesCount.toString(),
        insight.stockoutRisk.toFixed(1),
        insight.reasons.join("; "),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `restocking-insights-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading inventory data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Smart Restocking Insights
          </h1>
          <p className="text-muted-foreground mt-1">Data-driven recommendations for optimal inventory restocking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshAnalysis} disabled={isAnalyzing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isAnalyzing && "animate-spin")} />
            Refresh Analysis
          </Button>
          <Button variant="outline" onClick={exportInsights}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products to Restock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.length}</div>
            <p className="text-xs text-muted-foreground">
              {insights.filter((i) => i.priority === "critical").length} critical priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                insights.reduce((sum, i) => sum + i.estimatedCost, 0),
                currentCurrency,
                language,
              )}
            </div>
            <p className="text-xs text-muted-foreground">Estimated restocking cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                insights.filter((i) => i.profitMargin !== null).reduce((sum, i) => sum + (i.profitMargin || 0), 0) /
                  insights.filter((i) => i.profitMargin !== null).length || 0
              ).toFixed(1)}
              %
            </div>
            <p className="text-xs text-muted-foreground">Average across all products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Products</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.filter((i) => i.stockoutRisk > 70).length}</div>
            <p className="text-xs text-muted-foreground">Risk of stockout soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">Priority Insights</TabsTrigger>
          <TabsTrigger value="categories">Category Analysis</TabsTrigger>
          <TabsTrigger value="detailed-list">Detailed List</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Critical Priority Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Critical Priority
                </CardTitle>
                <CardDescription>Products requiring immediate restocking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights
                  .filter((i) => i.priority === "critical")
                  .slice(0, 5)
                  .map((insight) => (
                    <div key={insight.product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <img
                          src={insight.product.image || "/placeholder.svg?height=64&width=64&query=product"}
                          alt={insight.product.name}
                          className="w-16 h-16 rounded object-cover"
                        />
                        <div>
                          <p className="font-medium">{insight.product.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">Score: {insight.score.toFixed(0)}/100</p>
                            <Badge variant="destructive" className="text-xs">
                              {insight.stockoutRisk.toFixed(0)}% risk
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{insight.recommendedQuantity} units</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(insight.estimatedCost, currentCurrency, language)}
                        </p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* High ROI Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  High ROI Opportunities
                </CardTitle>
                <CardDescription>Products with best profit margins</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights
                  .filter((i) => i.profitMargin !== null && i.profitMargin > 20)
                  .sort((a, b) => (b.profitMargin || 0) - (a.profitMargin || 0))
                  .slice(0, 5)
                  .map((insight) => (
                    <div key={insight.product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <img
                          src={insight.product.image || "/placeholder.svg?height=64&width=64&query=product"}
                          alt={insight.product.name}
                          className="w-16 h-16 rounded object-cover"
                        />
                        <div>
                          <p className="font-medium">{insight.product.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-green-600">
                              {insight.profitMargin?.toFixed(1)}% margin
                            </Badge>
                            <p className="text-xs text-muted-foreground">{insight.salesVelocity.toFixed(1)}/day</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{insight.recommendedQuantity} units</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(insight.estimatedCost, currentCurrency, language)}
                        </p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryAnalysis.map((analysis) => (
              <Card key={analysis.category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{analysis.category.name}</span>
                    <Badge variant="outline">{analysis.productCount} products</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average Priority Score</span>
                    <div className="flex items-center gap-2">
                      <Progress value={analysis.averageScore} className="w-16 h-2" />
                      <span className="text-sm font-medium">{analysis.averageScore.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">High Priority Items</span>
                    <span className="text-sm font-medium">{analysis.highPriorityCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Investment</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(analysis.totalCost, currentCurrency, language)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detailed-list" className="space-y-4">
          <div className="space-y-4">
            {insights.map((insight) => (
              <Card key={insight.product.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <img
                        src={insight.product.image || "/placeholder.svg?height=64&width=64&query=product"}
                        alt={insight.product.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{insight.product.name}</h3>
                          <Badge className={cn("border", getPriorityColor(insight.priority))}>
                            {getPriorityIcon(insight.priority)}
                            <span className="ml-1 capitalize">{insight.priority}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            Stock: {insight.product.stock}/{insight.product.min_stock}
                          </span>
                          <span>Price: {formatCurrency(insight.product.price, currentCurrency, language)}</span>
                          {insight.profitMargin && (
                            <span className="text-green-600">Margin: {insight.profitMargin.toFixed(1)}%</span>
                          )}
                          <span>Velocity: {insight.salesVelocity.toFixed(1)}/day</span>
                          {/* New additions */}
                          <span>Total Sold (30 days): {insight.totalQuantitySold}</span>
                          <span>Sales Count (30 days): {insight.totalSalesCount}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Priority Score:</span>
                            <Progress value={insight.score} className="w-24 h-2" />
                            <span className="text-sm text-muted-foreground">{insight.score.toFixed(0)}/100</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Stockout Risk:</span>
                            <Progress value={insight.stockoutRisk} className="w-24 h-2" />
                            <span className="text-sm text-muted-foreground">{insight.stockoutRisk.toFixed(0)}%</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <strong>Analysis:</strong> {insight.reasons.join(", ")}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Recommended Quantity</p>
                        <p className="text-lg font-semibold">{insight.recommendedQuantity} units</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Cost</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(insight.estimatedCost, currentCurrency, language)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">Urgency:</span>
                        <div className="flex">
                          {Array.from({ length: 10 }, (_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "w-2 h-2 rounded-full mr-1",
                                i < insight.urgency ? "bg-red-500" : "bg-gray-200",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RestockingInsightsPage
