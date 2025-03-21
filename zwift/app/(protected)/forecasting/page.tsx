"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/components/ui/data-table"
import { Download, RefreshCw, TrendingUp, ShoppingCart, AlertTriangle, Check } from "lucide-react"
import { format, addDays } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/hooks/use-language"
import { createClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { generatePurchaseOrder } from "@/app/actions/forecasting"
import Link from "next/link"

// Define types
type Product = {
  id: string
  name: string
  stock: number
  min_stock: number
  price: number
  purchase_price: number | null
  barcode: string
  category_id: string | null
  created_at?: string | null
}

type ForecastProduct = Product & {
  avg_daily_sales: number
  days_until_stockout: number
  reorder_recommendation: number
  forecast: Array<{ date: string; projected_stock: number }>
}

type PurchaseOrderResponse = {
  success: boolean
  order_id: string
  products: Product[]
  total_items: number
  estimated_cost: number
}

export default function ForecastingPage() {
  const [products, setProducts] = useState<ForecastProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<ForecastProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("days_until_stockout")
  const [sortOrder, setSortOrder] = useState("asc")
  const [selectedProduct, setSelectedProduct] = useState<ForecastProduct | null>(null)
  const [forecastDays, setForecastDays] = useState(30)
  const [leadTime, setLeadTime] = useState(7) // Default supplier lead time in days
  const [safetyStock, setSafetyStock] = useState(5) // Default safety stock percentage
  const [activeTab, setActiveTab] = useState("all")
  const [currentCurrency, setCurrentCurrency] = useState<string>("USD")
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [orderQuantity, setOrderQuantity] = useState(0)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [purchaseOrderResult, setPurchaseOrderResult] = useState<PurchaseOrderResponse | null>(null)

  const { toast } = useToast()
  const { getAppTranslation, language, isRTL } = useLanguage()
  const supabase = createClient()

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

  // Handle product selection for detailed view
  const handleRowClick = (product: ForecastProduct) => {
    setSelectedProduct(product)
  }

  // Handle opening the purchase order dialog
  const handleOpenOrderDialog = () => {
    if (selectedProduct) {
      setOrderQuantity(selectedProduct.reorder_recommendation)
      setIsOrderDialogOpen(true)
    }
  }

  // Handle creating a purchase order
  const handleCreatePurchaseOrder = async () => {
    if (!selectedProduct) return

    try {
      setIsCreatingOrder(true)

      // Call the server action to generate a purchase order
      const result = await generatePurchaseOrder([selectedProduct.id])

      setPurchaseOrderResult(result)

      // Show success toast
      toast({
        title: "Purchase Order Created",
        description: (
          <div>
            Order #{result.order_id} created successfully.{" "}
            <Link href="/purchase-orders" className="underline font-medium">
              View all orders
            </Link>
          </div>
        ),
        variant: "default",
      })

      // Close the dialog after a short delay
      setTimeout(() => {
        setIsOrderDialogOpen(false)
        setPurchaseOrderResult(null)
      }, 3000)
    } catch (error) {
      console.error("Error creating purchase order:", error)
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      })
    } finally {
      setIsCreatingOrder(false)
    }
  }

  // Define columns for the data table
  const columns = [
    {
      accessorKey: "name",
      header: "Product Name",
    },
    {
      accessorKey: "stock",
      header: "Current Stock",
    },
    {
      accessorKey: "avg_daily_sales",
      header: "Avg. Daily Sales",
      cell: ({ row }: { row: any }) => {
        const value = Number.parseFloat(row.getValue("avg_daily_sales"))
        return value.toFixed(2)
      },
    },
    {
      accessorKey: "days_until_stockout",
      header: "Days Until Stockout",
      cell: ({ row }: { row: any }) => {
        const value = Number.parseInt(row.getValue("days_until_stockout"))
        return (
          <div className="flex items-center">
            <span
              className={
                value < 7 ? "text-red-600 font-medium" : value < 14 ? "text-amber-600 font-medium" : "text-green-600"
              }
            >
              {value}
            </span>
            {value < 7 && <AlertTriangle className="h-4 w-4 ml-2 text-red-600" />}
          </div>
        )
      },
    },
    {
      accessorKey: "reorder_recommendation",
      header: "Reorder Qty",
      cell: ({ row }: { row: any }) => {
        const value = Number.parseInt(row.getValue("reorder_recommendation"))
        return value > 0 ? (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {value}
          </Badge>
        ) : (
          "—"
        )
      },
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => {
        const product = row.original
        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={(e) => {
                e.stopPropagation()
                handleRowClick(product)
                setOrderQuantity(product.reorder_recommendation)
                setIsOrderDialogOpen(true)
              }}
              disabled={product.reorder_recommendation <= 0}
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1" />
              Order
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleRowClick(product)}>
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              Details
            </Button>
          </div>
        )
      },
    },
  ]

  // Load products and generate forecast data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        // Fetch currency first
        await fetchCurrency()

        // Fetch products
        const { data: productsData, error: productsError } = await supabase.from("products").select("*").order("name")

        if (productsError) throw productsError

        // Since we don't have actual sales data, we'll generate some mock data
        // In a real application, you would fetch this from your sales table
        const productsWithForecast =
          productsData?.map((product) => {
            // Generate a random average daily sales between 0 and 10% of current stock
            const maxSales = Math.max(1, Math.floor(product.stock * 0.1))
            const avg_daily_sales = Math.random() * maxSales

            // Calculate days until stockout
            const days_until_stockout = avg_daily_sales > 0 ? Math.floor(product.stock / avg_daily_sales) : 999 // If no sales, set a high number

            // Calculate reorder recommendation based on lead time and safety stock
            const reorder_recommendation = Math.ceil(
              avg_daily_sales * leadTime + avg_daily_sales * leadTime * (safetyStock / 100),
            )

            // Generate forecast data for the chart
            const forecast = []
            let projectedStock = product.stock

            for (let i = 0; i < forecastDays; i++) {
              const date = format(addDays(new Date(), i), "MMM dd")
              projectedStock = Math.max(0, projectedStock - avg_daily_sales)
              forecast.push({
                date,
                projected_stock: Math.round(projectedStock * 100) / 100,
              })
            }

            return {
              ...product,
              avg_daily_sales,
              days_until_stockout,
              reorder_recommendation: days_until_stockout < leadTime * 2 ? reorder_recommendation : 0,
              forecast,
            }
          }) || []

        setProducts(productsWithForecast)
        setFilteredProducts(productsWithForecast)
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "Failed to load forecasting data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [leadTime, safetyStock, forecastDays])

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...products]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (product) => product.name.toLowerCase().includes(term) || product.barcode.toLowerCase().includes(term),
      )
    }

    // Apply tab filter
    if (activeTab === "critical") {
      filtered = filtered.filter((product) => product.days_until_stockout < 7)
    } else if (activeTab === "warning") {
      filtered = filtered.filter((product) => product.days_until_stockout >= 7 && product.days_until_stockout < 14)
    } else if (activeTab === "reorder") {
      filtered = filtered.filter((product) => product.reorder_recommendation > 0)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0

      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy === "stock") {
        comparison = a.stock - b.stock
      } else if (sortBy === "avg_daily_sales") {
        comparison = a.avg_daily_sales - b.avg_daily_sales
      } else if (sortBy === "days_until_stockout") {
        comparison = a.days_until_stockout - b.days_until_stockout
      } else if (sortBy === "reorder_recommendation") {
        comparison = a.reorder_recommendation - b.reorder_recommendation
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    setFilteredProducts(filtered)
  }, [products, searchTerm, activeTab, sortBy, sortOrder])

  // Handle export to CSV
  const handleExport = () => {
    const headers = [
      "Product Name",
      "Current Stock",
      "Avg. Daily Sales",
      "Days Until Stockout",
      "Reorder Recommendation",
    ]

    const csvData = filteredProducts.map((product) => [
      product.name,
      product.stock,
      product.avg_daily_sales.toFixed(2),
      product.days_until_stockout,
      product.reorder_recommendation,
    ])

    const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `inventory-forecast-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Forecasting</h1>
          <p className="text-muted-foreground">Plan your reorders and prevent stockouts</p>
        </div>
        <Button onClick={handleExport} className="flex items-center gap-2">
          <Download className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Lead Time Settings</CardTitle>
            <CardDescription>Configure supplier lead time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="lead-time">Average Supplier Lead Time (days)</Label>
              <Input
                id="lead-time"
                type="number"
                min="1"
                max="60"
                value={leadTime}
                onChange={(e) => setLeadTime(Number.parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-muted-foreground">
                The average time it takes for suppliers to deliver after placing an order
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Safety Stock</CardTitle>
            <CardDescription>Buffer inventory percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="safety-stock">Safety Stock Percentage (%)</Label>
              <Input
                id="safety-stock"
                type="number"
                min="0"
                max="100"
                value={safetyStock}
                onChange={(e) => setSafetyStock(Number.parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-muted-foreground">
                Extra inventory to maintain as a buffer against uncertainty
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Forecast Range</CardTitle>
            <CardDescription>Days to project into the future</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="forecast-days">Forecast Days</Label>
              <Select
                value={forecastDays.toString()}
                onValueChange={(value) => setForecastDays(Number.parseInt(value))}
              >
                <SelectTrigger id="forecast-days">
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">How far into the future to project inventory levels</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/3">
          <Card className="h-full">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Inventory Forecast</CardTitle>
                  <CardDescription>Products that need attention</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-[200px]"
                  />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="stock">Current Stock</SelectItem>
                      <SelectItem value="avg_daily_sales">Daily Sales</SelectItem>
                      <SelectItem value="days_until_stockout">Days Until Stockout</SelectItem>
                      <SelectItem value="reorder_recommendation">Reorder Quantity</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </Button>
                </div>
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="all">All Products</TabsTrigger>
                  <TabsTrigger value="critical" className="text-red-600">
                    Critical (&lt;7 days)
                  </TabsTrigger>
                  <TabsTrigger value="warning" className="text-amber-600">
                    Warning (&lt;14 days)
                  </TabsTrigger>
                  <TabsTrigger value="reorder" className="text-blue-600">
                    Reorder Now
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden">
                  <DataTable columns={columns} data={filteredProducts} />
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Click on a product to view detailed forecast</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <div className="flex items-center justify-between w-full">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredProducts.length} of {products.length} products
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setActiveTab("all")
                    setSortBy("days_until_stockout")
                    setSortOrder("asc")
                  }}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reset Filters
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="w-full md:w-1/3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Forecast Details</CardTitle>
              <CardDescription>
                {selectedProduct
                  ? `Projected inventory for ${selectedProduct.name}`
                  : "Select a product to view detailed forecast"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : selectedProduct ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Current Stock</p>
                      <p className="text-2xl font-bold">{selectedProduct.stock}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Daily Sales</p>
                      <p className="text-2xl font-bold">{selectedProduct.avg_daily_sales.toFixed(2)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Days Until Stockout</p>
                      <p
                        className={`text-2xl font-bold ${
                          selectedProduct.days_until_stockout < 7
                            ? "text-red-600"
                            : selectedProduct.days_until_stockout < 14
                              ? "text-amber-600"
                              : "text-green-600"
                        }`}
                      >
                        {selectedProduct.days_until_stockout}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Reorder Quantity</p>
                      <p className="text-2xl font-bold">{selectedProduct.reorder_recommendation}</p>
                    </div>
                  </div>

                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedProduct.forecast} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="projected_stock"
                          name="Projected Stock"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                        />
                        {/* Add a reference line for min stock */}
                        <Line
                          type="monotone"
                          dataKey={() => selectedProduct.min_stock}
                          name="Min Stock"
                          stroke="#ff7300"
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Reorder Recommendation</h4>
                    {selectedProduct.reorder_recommendation > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm">
                          Based on your average daily sales of{" "}
                          <span className="font-medium">{selectedProduct.avg_daily_sales.toFixed(2)}</span> units and a
                          lead time of <span className="font-medium">{leadTime}</span> days, you should order{" "}
                          <span className="font-medium">{selectedProduct.reorder_recommendation}</span> units now.
                        </p>
                        <Button className="w-full" onClick={handleOpenOrderDialog}>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Create Purchase Order
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No immediate reorder needed. You have sufficient stock for the next{" "}
                        {selectedProduct.days_until_stockout} days.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a product from the table to view detailed forecast</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Health Overview</CardTitle>
          <CardDescription>Summary of your inventory status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      name: "Critical",
                      count: products.filter((p) => p.days_until_stockout < 7).length,
                      color: "#ef4444",
                    },
                    {
                      name: "Warning",
                      count: products.filter((p) => p.days_until_stockout >= 7 && p.days_until_stockout < 14).length,
                      color: "#f59e0b",
                    },
                    {
                      name: "Healthy",
                      count: products.filter((p) => p.days_until_stockout >= 14).length,
                      color: "#10b981",
                    },
                    {
                      name: "No Sales",
                      count: products.filter((p) => p.avg_daily_sales === 0).length,
                      color: "#6b7280",
                    },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Number of Products">
                    {[
                      { dataKey: "count", fill: "#ef4444" },
                      { dataKey: "count", fill: "#f59e0b" },
                      { dataKey: "count", fill: "#10b981" },
                      { dataKey: "count", fill: "#6b7280" },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="grid grid-cols-4 gap-4 w-full">
            <div className="text-center">
              <p className="text-sm font-medium text-red-600">Critical</p>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mx-auto" />
                ) : (
                  products.filter((p) => p.days_until_stockout < 7).length
                )}
              </p>
              <p className="text-xs text-muted-foreground">Less than 7 days of stock</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-amber-600">Warning</p>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mx-auto" />
                ) : (
                  products.filter((p) => p.days_until_stockout >= 7 && p.days_until_stockout < 14).length
                )}
              </p>
              <p className="text-xs text-muted-foreground">7-14 days of stock</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-green-600">Healthy</p>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mx-auto" />
                ) : (
                  products.filter((p) => p.days_until_stockout >= 14).length
                )}
              </p>
              <p className="text-xs text-muted-foreground">More than 14 days of stock</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">No Sales</p>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mx-auto" />
                ) : (
                  products.filter((p) => p.avg_daily_sales === 0).length
                )}
              </p>
              <p className="text-xs text-muted-foreground">No recent sales activity</p>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Purchase Order Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              {selectedProduct ? `Order ${selectedProduct.name} from supplier` : "Order product from supplier"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(Number.parseInt(e.target.value) || 0)}
                min="1"
                className="col-span-3"
              />
            </div>
            {selectedProduct && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Cost</Label>
                <div className="col-span-3">
                  {currentCurrency}{" "}
                  {((selectedProduct.purchase_price || selectedProduct.price) * orderQuantity).toFixed(2)}
                </div>
              </div>
            )}
            {purchaseOrderResult && (
              <div className="bg-green-50 p-3 rounded-md border border-green-200 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <div className="text-green-800">
                  <p className="font-medium">Order #{purchaseOrderResult.order_id} created!</p>
                  <p className="text-sm">Total items: {purchaseOrderResult.total_items}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePurchaseOrder}
              disabled={isCreatingOrder || orderQuantity <= 0 || !selectedProduct}
            >
              {isCreatingOrder ? "Creating..." : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

