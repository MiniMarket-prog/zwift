"use client"

import { useState, useEffect } from "react"
import { ArrowDown, ArrowUp, DollarSign, Package, ShoppingCart, Wallet, AlertTriangle, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, LineChart } from "@/components/ui/chart"
import { useToast } from "@/components/ui/use-toast"
import { getDashboardStats, getLowStockProducts } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"

export default function Dashboard() {
  const [salesData, setSalesData] = useState({
    totalRevenue: 0,
    totalCapital: 0,
    totalSales: 0,
    totalProducts: 0,
    lowStockCount: 0,
  })

  const { toast } = useToast()
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get dashboard stats
        const stats = await getDashboardStats()
        setSalesData(stats)

        // Get low stock products
        const lowStockData = await getLowStockProducts()
        setLowStockProducts(lowStockData)

        // Update lowStockCount in case the direct query is more accurate
        if (lowStockData) {
          setSalesData((prev) => ({
            ...prev,
            lowStockCount: lowStockData.length,
          }))
        }
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error)
        setError(error.message || "Failed to load dashboard data")
        toast({
          title: "Error",
          description: "Failed to fetch dashboard data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
        <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center gap-2">
            <Button>Download Reports</Button>
          </div>
        </div>

        {salesData.lowStockCount > 0 && (
          <Alert variant="destructive" className="border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Low Stock Alert</AlertTitle>
            <AlertDescription>
              {salesData.lowStockCount} products are below minimum stock levels.
              <Button variant="link" className="p-0 h-auto font-semibold" asChild>
                <a href="/alerts"> View details</a>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24 mb-2" />
              ) : (
                <div className="text-2xl font-bold">${salesData.totalRevenue.toFixed(2)}</div>
              )}
              <p className="text-xs text-muted-foreground">
                <span className="text-emerald-500 flex items-center">
                  <ArrowUp className="mr-1 h-4 w-4" />
                  +20.1%
                </span>{" "}
                from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capital</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24 mb-2" />
              ) : (
                <div className="text-2xl font-bold">${salesData.totalCapital.toFixed(2)}</div>
              )}
              <p className="text-xs text-muted-foreground">
                <span className="text-emerald-500 flex items-center">
                  <ArrowUp className="mr-1 h-4 w-4" />
                  +10.5%
                </span>{" "}
                from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mb-2" />
              ) : (
                <div className="text-2xl font-bold">{salesData.totalSales}</div>
              )}
              <p className="text-xs text-muted-foreground">
                <span className="text-rose-500 flex items-center">
                  <ArrowDown className="mr-1 h-4 w-4" />
                  -2.5%
                </span>{" "}
                from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mb-2" />
              ) : (
                <div className="text-2xl font-bold">{salesData.totalProducts}</div>
              )}
              <p className="text-xs text-muted-foreground">
                <span className="text-emerald-500 flex items-center">
                  <ArrowUp className="mr-1 h-4 w-4" />
                  +7
                </span>{" "}
                new this month
              </p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading dashboard data...</span>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Revenue Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <LineChart
                      data={[
                        { name: "Jan", total: 1800 },
                        { name: "Feb", total: 2200 },
                        { name: "Mar", total: 2800 },
                        { name: "Apr", total: 2400 },
                        { name: "May", total: 2900 },
                        { name: "Jun", total: 3300 },
                        { name: "Jul", total: 3200 },
                      ]}
                      categories={["total"]}
                      colors={["#0ea5e9"]}
                      valueFormatter={(value) => `$${value}`}
                      className="aspect-[4/3]"
                    />
                  </CardContent>
                </Card>
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Top Products</CardTitle>
                    <CardDescription>Your best selling products this month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      data={[
                        { name: "Product A", total: 652 },
                        { name: "Product B", total: 480 },
                        { name: "Product C", total: 390 },
                        { name: "Product D", total: 350 },
                        { name: "Product E", total: 278 },
                      ]}
                      categories={["total"]}
                      colors={["#0ea5e9"]}
                      valueFormatter={(value) => `${value} units`}
                      className="aspect-[4/3]"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Payment Method</CardTitle>
                  <CardDescription>Distribution of sales by payment method</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={[
                      { name: "Cash", total: 4200 },
                      { name: "Credit Card", total: 5800 },
                      { name: "Debit Card", total: 2100 },
                      { name: "Mobile Payment", total: 1800 },
                    ]}
                    categories={["total"]}
                    colors={["#0ea5e9"]}
                    valueFormatter={(value) => `$${value}`}
                    className="aspect-[4/3]"
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                  <CardDescription>Sales distribution by product category</CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={[
                      { name: "Electronics", total: 6500 },
                      { name: "Clothing", total: 4200 },
                      { name: "Food", total: 3800 },
                      { name: "Home", total: 2900 },
                      { name: "Beauty", total: 1800 },
                    ]}
                    categories={["total"]}
                    colors={["#0ea5e9"]}
                    valueFormatter={(value) => `$${value}`}
                    className="aspect-[4/3]"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

