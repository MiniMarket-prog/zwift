"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase-client"
import { getLowStockProducts } from "@/lib/supabase"
import { formatCurrency } from "@/lib/format-currency"
import {
  RefreshCw,
  Loader2,
  Lightbulb,
  Zap,
  FlaskConical,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

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
  description?: string | null // Added for potential future AI use
}

type Category = {
  id: string
  name: string
}

type AiInsight = {
  nature: string
  similar_types: string[]
  suggested_restock_quantity?: number // NEW: AI suggested quantity
}

type ProductWithAiInsight = {
  product: Product
  salesVelocity: number
  totalQuantitySold: number
  totalSalesCount: number
  aiInsight: AiInsight | null
  isLoadingAi: boolean
  errorAi: string | null
}

const AiRestockingPage = () => {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [productsWithInsights, setProductsWithInsights] = useState<ProductWithAiInsight[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false)
  const [currentCurrency, setCurrentCurrency] = useState<string>("USD")
  const [salesData, setSalesData] = useState<
    Record<string, { totalQuantity: number; totalRevenue: number; salesCount: number; avgDailyVelocity: number }>
  >({})
  const [aiInsightsGenerated, setAiInsightsGenerated] = useState(false)
  const [triggerAiAnalysis, setTriggerAiAnalysis] = useState(false)

  // NEW: AI Control States
  const [salesPeriodDays, setSalesPeriodDays] = useState<number>(30) // Default to 30 days
  const [maxProductsForAi, setMaxProductsForAi] = useState<number>(5) // Default to 5 products for AI analysis

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5 // Number of items per page

  const { toast } = useToast()
  const supabase = createClient()
  const { getAppTranslation, language } = useLanguage()

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

  // Fetch sales data for the selected period
  const fetchSalesData = useCallback(
    async (periodDays: number) => {
      try {
        const periodAgo = new Date()
        periodAgo.setDate(periodAgo.getDate() - periodDays)

        const { data: salesData, error } = await supabase
          .from("sale_items")
          .select(`
          product_id,
          quantity,
          price,
          sales!inner(created_at)
        `)
          .gte("sales.created_at", periodAgo.toISOString())

        if (error) throw error

        const productSales: Record<
          string,
          { totalQuantity: number; totalRevenue: number; salesCount: number; avgDailyVelocity: number }
        > = {}

        salesData?.forEach((sale: any) => {
          if (!productSales[sale.product_id]) {
            productSales[sale.product_id] = { totalQuantity: 0, totalRevenue: 0, salesCount: 0, avgDailyVelocity: 0 }
          }
          productSales[sale.product_id].totalQuantity += sale.quantity
          productSales[sale.product_id].totalRevenue += sale.price * sale.quantity
          productSales[sale.product_id].salesCount += 1
        })

        Object.keys(productSales).forEach((productId) => {
          productSales[productId].avgDailyVelocity = productSales[productId].totalQuantity / periodDays
        })

        setSalesData(productSales)
      } catch (error) {
        console.error("Error fetching sales data:", error)
        setSalesData({})
      }
    },
    [supabase],
  )

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
      setIsLoadingData(true)
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
      setIsLoadingData(false)
    }
  }, [toast])

  // Function to get category name by ID
  const getCategoryName = useCallback(
    (categoryId: string | null | undefined) => {
      if (!categoryId) return "Uncategorized"
      const category = categories.find((c) => c.id === categoryId)
      return category ? category.name : "Unknown Category"
    },
    [categories],
  )

  // Function to call AI API for insights
  const fetchAiInsight = useCallback(
    async (
      product: Product,
      salesVelocity: number,
      totalQuantitySold: number,
      totalSalesCount: number,
      periodDays: number, // Pass periodDays to AI API
    ): Promise<AiInsight | null> => {
      try {
        const response = await fetch("/api/ai-restocking-suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productName: product.name,
            categoryName: getCategoryName(product.category_id),
            currentStock: product.stock,
            minStock: product.min_stock,
            salesVelocity: salesVelocity,
            totalQuantitySold: totalQuantitySold,
            totalSalesCount: totalSalesCount,
            productDescription: product.description,
            salesPeriodDays: periodDays, // Pass periodDays to AI API
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch AI insights")
        }

        const data: AiInsight = await response.json()
        return data
      } catch (error: any) {
        console.error(`Error fetching AI insight for ${product.name}:`, error)
        return null
      }
    },
    [getCategoryName],
  )

  // Main effect to initialize data
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([fetchLowStockProducts(), fetchCategories(), fetchCurrency(), fetchSalesData(salesPeriodDays)])
    }
    initializeData()
  }, [fetchLowStockProducts, fetchCategories, fetchCurrency, fetchSalesData, salesPeriodDays]) // Re-fetch sales data if period changes

  // Effect to trigger AI analysis only when `triggerAiAnalysis` is true
  useEffect(() => {
    if (
      triggerAiAnalysis &&
      !isLoadingData &&
      lowStockProducts.length > 0 &&
      Object.keys(salesData).length > 0 &&
      categories.length > 0
    ) {
      const analyzeProducts = async () => {
        setIsAnalyzingAi(true)
        // Limit the products sent to AI based on maxProductsForAi setting
        const productsToAnalyze = lowStockProducts.slice(0, maxProductsForAi)

        const insightsPromises = productsToAnalyze.map(async (product) => {
          const productSalesInfo = salesData[product.id] || {
            totalQuantity: 0,
            totalRevenue: 0,
            salesCount: 0,
            avgDailyVelocity: 0,
          }
          const aiInsight = await fetchAiInsight(
            product,
            productSalesInfo.avgDailyVelocity,
            productSalesInfo.totalQuantity,
            productSalesInfo.salesCount,
            salesPeriodDays, // Pass the current sales period
          )
          return {
            product,
            salesVelocity: productSalesInfo.avgDailyVelocity,
            totalQuantitySold: productSalesInfo.totalQuantity,
            totalSalesCount: productSalesInfo.salesCount,
            aiInsight,
            isLoadingAi: false,
            errorAi: aiInsight ? null : "AI analysis failed",
          }
        })

        const results = await Promise.all(insightsPromises)
        setProductsWithInsights(results)
        setIsAnalyzingAi(false)
        setAiInsightsGenerated(true)
        setTriggerAiAnalysis(false)
        setCurrentPage(1) // Reset to first page on new analysis
      }
      analyzeProducts()
    } else if (triggerAiAnalysis && !isLoadingData && lowStockProducts.length === 0) {
      setProductsWithInsights([]) // Clear insights if no low stock products
      setIsAnalyzingAi(false)
      setAiInsightsGenerated(true)
      setTriggerAiAnalysis(false)
    }
  }, [
    triggerAiAnalysis,
    isLoadingData,
    lowStockProducts,
    salesData,
    categories,
    fetchAiInsight,
    salesPeriodDays,
    maxProductsForAi,
  ])

  // Function to manually trigger AI analysis
  const runAiAnalysis = () => {
    if (lowStockProducts.length === 0) {
      toast({
        title: "No Products to Analyze",
        description: "There are no low stock products to generate AI suggestions for.",
        variant: "default",
      })
      return
    }
    if (maxProductsForAi <= 0) {
      toast({
        title: "Invalid Setting",
        description: "Please set 'Max Products for AI' to a number greater than 0.",
        variant: "destructive",
      })
      return
    }
    setTriggerAiAnalysis(true)
    setAiInsightsGenerated(false)
    setProductsWithInsights([])
  }

  const refreshData = async () => {
    // Renamed from refreshAnalysis to avoid confusion with AI analysis
    setProductsWithInsights([])
    setAiInsightsGenerated(false)
    setIsLoadingData(true)
    setIsAnalyzingAi(false)
    setCurrentPage(1)
    await Promise.all([fetchLowStockProducts(), fetchSalesData(salesPeriodDays)]) // Re-fetch core data with current period
  }

  // Pagination logic
  const totalPages = useMemo(() => {
    return Math.ceil(productsWithInsights.length / itemsPerPage)
  }, [productsWithInsights.length, itemsPerPage])

  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    return productsWithInsights.slice(indexOfFirstItem, indexOfLastItem)
  }, [currentPage, productsWithInsights, itemsPerPage])

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  if (isLoadingData) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading inventory and sales data...</p>
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
            <Lightbulb className="h-8 w-8 text-purple-600" />
            AI Restocking Suggestions
          </h1>
          <p className="text-muted-foreground mt-1">
            Intelligent insights for restocking based on product nature, market availability, and optimal quantities.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData} disabled={isLoadingData}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingData && "animate-spin")} />
            Refresh Data
          </Button>
          <Button
            onClick={runAiAnalysis}
            disabled={isAnalyzingAi || isLoadingData || lowStockProducts.length === 0 || maxProductsForAi <= 0}
          >
            {isAnalyzingAi ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run AI Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* NEW: AI Control Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Analysis Settings</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="sales-period" className="text-sm font-medium">
              Sales Analysis Period
            </label>
            <Select value={String(salesPeriodDays)} onValueChange={(value) => setSalesPeriodDays(Number(value))}>
              <SelectTrigger id="sales-period" className="w-full">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="180">Last 180 Days</SelectItem>
                <SelectItem value="365">Last 365 Days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Defines the period for sales velocity calculation.</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="max-products-ai" className="text-sm font-medium">
              Max Products for AI
            </label>
            <Input
              id="max-products-ai"
              type="number"
              min="1"
              value={maxProductsForAi}
              onChange={(e) => setMaxProductsForAi(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Limits the number of low-stock products sent to AI for analysis to control credit usage.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products for Analysis</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Low stock items available for AI analysis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales Analyzed ({salesPeriodDays} days)</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(salesData).reduce((sum, s) => sum + s.salesCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Transactions in last {salesPeriodDays} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Processing Status</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isAnalyzingAi ? "Analyzing..." : aiInsightsGenerated ? "Complete" : "Pending"}
            </div>
            <p className="text-xs text-muted-foreground">AI model generating insights</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions List */}
      <div className="space-y-4">
        {lowStockProducts.length === 0 && !isLoadingData ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No low stock products to analyze at the moment.</p>
          </div>
        ) : isAnalyzingAi ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">AI is generating suggestions. This may take a moment...</p>
            </div>
          </div>
        ) : !aiInsightsGenerated ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">Click "Run AI Analysis" to generate restocking suggestions.</p>
          </div>
        ) : productsWithInsights.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground">
              No AI suggestions available. Ensure you have low stock products and try running AI analysis.
            </p>
          </div>
        ) : (
          <>
            {currentItems.map((item) => (
              <Card key={item.product.id}>
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <img
                    src={item.product.image || "/placeholder.svg?height=64&width=64&query=product"}
                    alt={item.product.name}
                    className="w-16 h-16 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">{item.product.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-sm text-muted-foreground">
                      <span>
                        Category:{" "}
                        <span className="font-medium text-foreground">{getCategoryName(item.product.category_id)}</span>
                      </span>
                      <span>
                        Stock: <span className="font-medium text-foreground">{item.product.stock}</span>/
                        <span className="font-medium text-foreground">{item.product.min_stock}</span>
                      </span>
                      <span>
                        Sales Velocity:{" "}
                        <span className="font-medium text-foreground">{item.salesVelocity.toFixed(1)} units/day</span>
                      </span>
                      <span>
                        Total Sold ({salesPeriodDays} days):{" "}
                        <span className="font-medium text-foreground">{item.totalQuantitySold}</span>
                      </span>
                      <span>
                        Sales Count ({salesPeriodDays} days):{" "}
                        <span className="font-medium text-foreground">{item.totalSalesCount}</span>
                      </span>
                      {item.aiInsight?.suggested_restock_quantity !== undefined && (
                        <span>
                          Suggested Restock:{" "}
                          <span className="font-bold text-purple-700">
                            {item.aiInsight.suggested_restock_quantity} units
                          </span>
                        </span>
                      )}
                    </div>
                    {item.aiInsight ? (
                      <div className="space-y-1 mt-2">
                        <p className="text-sm">
                          <strong className="text-purple-700">Nature:</strong> {item.aiInsight.nature}
                        </p>
                        <p className="text-sm">
                          <strong className="text-purple-700">Similar Types to Consider:</strong>{" "}
                          {item.aiInsight.similar_types.map((type, idx) => (
                            <Badge key={idx} variant="secondary" className="mr-1 mb-1">
                              {type}
                            </Badge>
                          ))}
                        </p>
                      </div>
                    ) : (
                      <div className="text-sm text-red-500 mt-2">
                        {item.errorAi || "AI analysis failed for this product."}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-muted-foreground">Current Price</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(item.product.price, currentCurrency, language)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <span className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AiRestockingPage
