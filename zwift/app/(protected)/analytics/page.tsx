"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Download, RefreshCw } from "lucide-react"
import { DateRangePicker } from "@/components/date-range-picker"
import { format, subDays } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/utils/supabase/client"
import { calculateProductMetrics } from "./calculations"
import { exportToCSV } from "./export-utils"
import { ProductPerformanceTable } from "./product-performance-table"
import { TopProductsChart } from "./top-products-chart"
import { SalesOverTimeChart } from "./sales-over-time-chart"
import { CategoryAnalysisChart } from "./category-analysis-chart"
import { ProfitMarginCard } from "./profit-margin-card"
import { InventoryValueCard } from "./inventory-value-card"
import { StockTurnoverCard } from "./stock-turnover-card"
import type { DateRange } from "react-day-picker"

// Define types for our data
interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  price: number
  purchase_price?: number
}

interface Sale {
  id: string
  total: number
  payment_method?: string
  created_at: string
  updated_at?: string
  sale_items?: SaleItem[]
}

interface Product {
  id: string
  name: string
  price: number
  purchase_price?: number
  stock: number
  category_id?: string
}

interface Category {
  id: string
  name: string
}

export default function AnalyticsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [salesData, setSalesData] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()

        // Fetch all products using pagination
        let allProducts: Product[] = []
        let page = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
          const {
            data: productsPage,
            error: productsError,
            count,
          } = await supabase
            .from("products")
            .select("*", { count: "exact" })
            .range(page * pageSize, (page + 1) * pageSize - 1)

          if (productsError) throw productsError

          if (productsPage && productsPage.length > 0) {
            allProducts = [...allProducts, ...(productsPage as Product[])]
            page++

            // Check if we've fetched all products
            hasMore = productsPage.length === pageSize
          } else {
            hasMore = false
          }
        }

        console.log(`Fetched ${allProducts.length} products in total`)
        setProducts(allProducts)

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase.from("categories").select("*")

        if (categoriesError) throw categoriesError
        setCategories((categoriesData as Category[]) || [])

        // Fetch sales within date range
        if (dateRange?.from && dateRange?.to) {
          const fromDate = format(dateRange.from, "yyyy-MM-dd")
          const toDate = format(dateRange.to, "yyyy-MM-dd") + "T23:59:59"

          // Fetch sales with their items
          const { data: salesData, error: salesError } = await supabase
            .from("sales")
            .select("*, sale_items(*, product_id)")
            .gte("created_at", fromDate)
            .lte("created_at", toDate)

          if (salesError) throw salesError

          // Log the first sale to see its structure
          if (salesData && salesData.length > 0) {
            console.log("First sale structure:", JSON.stringify(salesData[0], null, 2))
          }

          // Enhance sale items with product data
          const enhancedSalesData =
            salesData?.map((sale: Sale) => {
              if (sale.sale_items) {
                sale.sale_items = sale.sale_items.map((item: SaleItem) => {
                  const product = allProducts.find((p) => p.id === item.product_id)
                  if (product) {
                    return {
                      ...item,
                      purchase_price: product.purchase_price || 0,
                    }
                  }
                  return item
                })
              }
              return sale
            }) || []

          setSalesData(enhancedSalesData)

          // Calculate analytics
          if (allProducts.length > 0 && categoriesData && enhancedSalesData) {
            const analytics = calculateProductMetrics(enhancedSalesData, allProducts, categoriesData)
            setAnalyticsData(analytics)
          }
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error)
        toast({
          title: "Error",
          description: "Failed to load analytics data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [dateRange, toast])

  // Handle refresh
  const handleRefresh = () => {
    setIsLoading(true)
    // Re-calculate analytics with current data
    if (products && categories && salesData) {
      const analytics = calculateProductMetrics(salesData, products, categories)
      setAnalyticsData(analytics)
      setIsLoading(false)

      toast({
        title: "Refreshed",
        description: "Analytics data has been refreshed.",
      })
    }
  }

  // Handle export
  const handleExport = () => {
    if (!analyticsData || !dateRange?.from || !dateRange?.to) return

    const filename = `product-analytics-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}`
    exportToCSV(analyticsData.productPerformance, filename)

    toast({
      title: "Export Complete",
      description: "Analytics data has been exported to CSV.",
    })
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Analytics</h1>
          <p className="text-muted-foreground">Analyze your product performance, sales trends, and profitability.</p>
        </div>

        <div className="flex items-center gap-2">
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : analyticsData ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProfitMarginCard metrics={analyticsData} />
            <InventoryValueCard products={products} />
            <StockTurnoverCard metrics={analyticsData} />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Products</CardTitle>
                    <CardDescription>Products with highest profit contribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TopProductsChart metrics={analyticsData} type="profit" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Category Analysis</CardTitle>
                    <CardDescription>Performance by product category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CategoryAnalysisChart metrics={analyticsData} categories={categories} type="profit" />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Sales Over Time</CardTitle>
                  <CardDescription>Revenue and profit trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <SalesOverTimeChart salesData={salesData} dateRange={dateRange} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Product Performance</CardTitle>
                  <CardDescription>Detailed analysis of all products</CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductPerformanceTable data={analyticsData?.productPerformance || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                  <CardDescription>Analysis by product category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <CategoryAnalysisChart metrics={analyticsData} categories={categories} type="sales" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Trends</CardTitle>
                  <CardDescription>Revenue and profit over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <SalesOverTimeChart
                      salesData={salesData}
                      dateRange={dateRange}
                      showProfitLine={true}
                      height={400}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">No data available for the selected period.</p>
            <Button
              onClick={() =>
                setDateRange({
                  from: subDays(new Date(), 90),
                  to: new Date(),
                })
              }
            >
              Try a Longer Date Range
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

