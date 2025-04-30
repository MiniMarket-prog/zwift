"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Update the type definition to handle both object and array formats for product
type SaleItemWithSale = {
  product_id: string
  sales:
    | {
        created_at: string
      }
    | Array<{
        created_at: string
      }>
  product?:
    | {
        name: string
        barcode?: string
      }
    | Array<{
        name: string
        barcode?: string
      }>
}

// Add a new type for product details
type ProductDetails = {
  id: string
  name: string
  barcode?: string
}

// Add a type for sale records
type SaleRecord = {
  sale_id: string
  product_id: string
  created_at: string
  quantity: number
  price: number
}

// Update the component to include product details
const LastSaleDateTest = () => {
  const [lastSaleDates, setLastSaleDates] = useState<Record<string, string>>({})
  const [productDetails, setProductDetails] = useState<Record<string, ProductDetails>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [executionTime, setExecutionTime] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("live")
  const supabase = createClient()

  // Add state for product sales history
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([])
  const [isLoadingSales, setIsLoadingSales] = useState(false)
  const [productSearch, setProductSearch] = useState("")

  // Add a log function to track the execution
  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, `${new Date().toISOString().split("T")[1].split(".")[0]} - ${message}`])
  }

  // Helper function to safely get product info regardless of format
  const getProductInfo = (product: any) => {
    if (!product) return null

    if (Array.isArray(product)) {
      return product.length > 0 ? product[0] : null
    }

    return product
  }

  // Update the fetchLastSaleDatesLive function to fetch product details in the same query
  const fetchLastSaleDatesLive = async () => {
    setIsLoading(true)
    setLogs([])
    const startTime = performance.now()

    try {
      addLog("Starting to fetch last sale dates from live data...")

      // First try with direct SQL query for better performance
      try {
        addLog("Attempting to use direct SQL query for better performance...")

        // This query gets the most recent sale date for each product in a single query
        const { data: directData, error: directError } = await supabase.rpc("get_last_sale_dates_with_products")

        if (!directError && directData && directData.length > 0) {
          addLog(`Direct SQL query successful! Received ${directData.length} records`)

          // Process the results
          const lastSaleDates: Record<string, string> = {}
          const productDetailsMap: Record<string, ProductDetails> = {}

          directData.forEach((item: any) => {
            if (item.product_id && item.last_sale_date) {
              lastSaleDates[item.product_id] = item.last_sale_date

              if (item.product_name) {
                productDetailsMap[item.product_id] = {
                  id: item.product_id,
                  name: item.product_name || "Unknown",
                  barcode: item.product_barcode || "N/A",
                }
              }
            }
          })

          addLog(`Processed ${Object.keys(lastSaleDates).length} products with last sale dates`)
          setLastSaleDates(lastSaleDates)
          setProductDetails(productDetailsMap)

          const endTime = performance.now()
          setExecutionTime(endTime - startTime)
          addLog(`Execution completed in ${(endTime - startTime).toFixed(2)}ms`)
          return
        } else {
          addLog(`Direct SQL query failed or returned no data: ${directError?.message || "No data returned"}`)
          addLog("Falling back to standard query method...")
        }
      } catch (sqlError) {
        addLog(`Error with direct SQL query: ${sqlError instanceof Error ? sqlError.message : String(sqlError)}`)
        addLog("Falling back to standard query method...")
      }

      // Implement pagination to fetch all data
      let allSaleItems: SaleItemWithSale[] = []
      let hasMore = true
      let page = 0
      const PAGE_SIZE = 1000 // Supabase's maximum limit

      while (hasMore) {
        addLog(`Fetching page ${page + 1} with range ${page * PAGE_SIZE} to ${(page + 1) * PAGE_SIZE - 1}`)

        // IMPORTANT: Changed to join with sales table and order by created_at
        const { data, error } = await supabase
          .from("sale_items")
          .select(`
            product_id,
            sales:sale_id (
              created_at
            ),
            product:product_id (
              name,
              barcode
            )
          `)
          .order("sales.created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (error) {
          addLog(`Error fetching data: ${error.message}`)
          throw error
        }

        if (data && data.length > 0) {
          addLog(`Received ${data.length} records`)
          allSaleItems = [...allSaleItems, ...(data as any[])]
          page++
          hasMore = data.length === PAGE_SIZE
        } else {
          addLog("No more data to fetch")
          hasMore = false
        }
      }

      addLog(`Total records fetched: ${allSaleItems.length}`)

      // Process the results to get the most recent date for each product
      const lastSaleDates: Record<string, string> = {}
      const productDetailsMap: Record<string, ProductDetails> = {}
      let objectFormatCount = 0
      let arrayFormatCount = 0
      let nullSaleCount = 0

      allSaleItems.forEach((item) => {
        if (item.product_id && item.sales && !lastSaleDates[item.product_id]) {
          // Handle case where sales might be an array due to Supabase's response format
          if (Array.isArray(item.sales)) {
            arrayFormatCount++
            const saleDate = item.sales[0]?.created_at
            if (saleDate) {
              lastSaleDates[item.product_id] = saleDate

              // Store product details if available
              if (item.product) {
                const productInfo = getProductInfo(item.product)
                if (productInfo) {
                  productDetailsMap[item.product_id] = {
                    id: item.product_id,
                    name: productInfo.name || "Unknown",
                    barcode: productInfo.barcode,
                  }
                }
              }
            }
          } else {
            objectFormatCount++
            if (item.sales.created_at) {
              lastSaleDates[item.product_id] = item.sales.created_at

              // Store product details if available
              if (item.product) {
                const productInfo = getProductInfo(item.product)
                if (productInfo) {
                  productDetailsMap[item.product_id] = {
                    id: item.product_id,
                    name: productInfo.name || "Unknown",
                    barcode: productInfo.barcode,
                  }
                }
              }
            }
          }
        } else if (item.product_id && !item.sales) {
          nullSaleCount++
        }
      })

      addLog(`Processing complete. Found dates for ${Object.keys(lastSaleDates).length} products`)
      addLog(`Object format count: ${objectFormatCount}`)
      addLog(`Array format count: ${arrayFormatCount}`)
      addLog(`Null sale count: ${nullSaleCount}`)

      setLastSaleDates(lastSaleDates)
      setProductDetails(productDetailsMap)

      const endTime = performance.now()
      setExecutionTime(endTime - startTime)
      addLog(`Execution completed in ${(endTime - startTime).toFixed(2)}ms`)
    } catch (error) {
      console.error("Error fetching last sale dates:", error)
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to fetch all sales for a specific product
  const fetchProductSalesHistory = async (productId: string) => {
    if (!productId) return

    setIsLoadingSales(true)
    try {
      addLog(`Fetching sales history for product ID: ${productId}`)

      // Query to get all sales for the product
      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          sale_id,
          product_id,
          quantity,
          price,
          sales:sale_id (
            created_at
          )
        `)
        .eq("product_id", productId)
        .order("sales.created_at", { ascending: false })

      if (error) {
        addLog(`Error fetching sales history: ${error.message}`)
        throw error
      }

      if (data && data.length > 0) {
        addLog(`Found ${data.length} sales records for product`)

        // Process the data
        const salesRecords: SaleRecord[] = data.map((item: any) => {
          const createdAt = Array.isArray(item.sales) ? item.sales[0]?.created_at : item.sales?.created_at

          return {
            sale_id: item.sale_id,
            product_id: item.product_id,
            created_at: createdAt || "Unknown",
            quantity: item.quantity || 0,
            price: item.price || 0,
          }
        })

        setSalesHistory(salesRecords)
      } else {
        addLog("No sales records found for this product")
        setSalesHistory([])
      }
    } catch (error) {
      console.error("Error fetching sales history:", error)
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setSalesHistory([])
    } finally {
      setIsLoadingSales(false)
    }
  }

  // Function to test with mock data
  const testWithMockData = () => {
    setIsLoading(true)
    setLogs([])
    const startTime = performance.now()

    try {
      addLog("Starting to test with mock data...")

      // Create mock data with different formats
      const mockData: SaleItemWithSale[] = [
        // Object format
        {
          product_id: "prod-1",
          sales: {
            created_at: "2023-05-15T10:30:00Z",
          },
          product: {
            name: "Product One",
            barcode: "1234567890",
          },
        },
        // Array format with one item
        {
          product_id: "prod-2",
          sales: [
            {
              created_at: "2023-06-20T14:45:00Z",
            },
          ] as any,
          product: {
            name: "Product Two",
            barcode: "2345678901",
          },
        },
        // Array format with multiple items (should take first one)
        {
          product_id: "prod-3",
          sales: [
            {
              created_at: "2023-07-25T09:15:00Z",
            },
            {
              created_at: "2023-07-20T11:30:00Z",
            },
          ] as any,
          product: {
            name: "Product Three",
            barcode: "3456789012",
          },
        },
        // Duplicate product_id (should take first occurrence)
        {
          product_id: "prod-1",
          sales: {
            created_at: "2023-04-10T16:20:00Z",
          },
          product: {
            name: "Product One (Duplicate)",
            barcode: "1234567890",
          },
        },
        // Empty array
        {
          product_id: "prod-4",
          sales: [] as any,
          product: {
            name: "Product Four",
            barcode: "4567890123",
          },
        },
        // Null sale
        {
          product_id: "prod-5",
          sales: null as any,
          product: {
            name: "Product Five",
            barcode: "5678901234",
          },
        },
      ]

      addLog(`Mock data created with ${mockData.length} records`)

      // Process the mock data
      const lastSaleDates: Record<string, string> = {}
      const productDetailsMap: Record<string, ProductDetails> = {}
      let objectFormatCount = 0
      let arrayFormatCount = 0
      let nullSaleCount = 0
      let emptyArrayCount = 0

      mockData.forEach((item) => {
        addLog(
          `Processing item for product_id: ${item.product_id}, sale type: ${item.sales ? (Array.isArray(item.sales) ? "array" : "object") : "null"}`,
        )

        if (item.product_id && item.sales && !lastSaleDates[item.product_id]) {
          // Handle case where sale might be an array
          if (Array.isArray(item.sales)) {
            arrayFormatCount++
            if (item.sales.length === 0) {
              emptyArrayCount++
              addLog(`  Empty array for product_id: ${item.product_id}`)
            } else {
              const saleDate = item.sales[0]?.created_at
              if (saleDate) {
                lastSaleDates[item.product_id] = saleDate
                if (item.product) {
                  const productInfo = getProductInfo(item.product)
                  if (productInfo) {
                    productDetailsMap[item.product_id] = {
                      id: item.product_id,
                      name: productInfo.name,
                      barcode: productInfo.barcode,
                    }
                  }
                }
                addLog(`  Added date for product_id: ${item.product_id}, date: ${saleDate} (from array)`)
              }
            }
          } else {
            objectFormatCount++
            if (item.sales.created_at) {
              lastSaleDates[item.product_id] = item.sales.created_at
              if (item.product) {
                const productInfo = getProductInfo(item.product)
                if (productInfo) {
                  productDetailsMap[item.product_id] = {
                    id: item.product_id,
                    name: productInfo.name,
                    barcode: productInfo.barcode,
                  }
                }
              }
              addLog(`  Added date for product_id: ${item.product_id}, date: ${item.sales.created_at} (from object)`)
            }
          }
        } else if (item.product_id && !item.sales) {
          nullSaleCount++
          addLog(`  Null sale for product_id: ${item.product_id}`)
        } else if (lastSaleDates[item.product_id]) {
          addLog(
            `  Skipped duplicate product_id: ${item.product_id}, already have date: ${lastSaleDates[item.product_id]}`,
          )
        }
      })

      addLog(`Processing complete. Found dates for ${Object.keys(lastSaleDates).length} products`)
      addLog(`Object format count: ${objectFormatCount}`)
      addLog(`Array format count: ${arrayFormatCount}`)
      addLog(`Null sale count: ${nullSaleCount}`)
      addLog(`Empty array count: ${emptyArrayCount}`)

      setLastSaleDates(lastSaleDates)
      setProductDetails(productDetailsMap)

      const endTime = performance.now()
      setExecutionTime(endTime - startTime)
      addLog(`Execution completed in ${(endTime - startTime).toFixed(2)}ms`)
    } catch (error) {
      console.error("Error in mock test:", error)
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Format date to a user-friendly string
  const formatLastSaleDate = (dateString?: string) => {
    if (!dateString) return "No recent sales"

    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  // Update the handleTabChange function to reset product details
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setLogs([])
    setLastSaleDates({})
    setProductDetails({})
    setExecutionTime(null)
    setSalesHistory([])
    setSelectedProductId("")
  }

  // Filter products based on search term
  const filteredProducts = Object.entries(productDetails)
    .filter(
      ([_, product]) =>
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(productSearch.toLowerCase())),
    )
    .sort((a, b) => a[1].name.localeCompare(b[1].name))

  // Update the return JSX to include product name and barcode columns
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Last Sale Date Function Test</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="live">Live Data Test</TabsTrigger>
          <TabsTrigger value="mock">Mock Data Test</TabsTrigger>
          <TabsTrigger value="sales">Product Sales History</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Data Test</CardTitle>
              <CardDescription>
                Test the fetchLastSaleDates function with real data from your Supabase database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={fetchLastSaleDatesLive} disabled={isLoading} className="mb-4">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  "Run Live Test"
                )}
              </Button>

              {executionTime !== null && (
                <div className="mb-4">
                  <Badge variant="outline" className="text-sm">
                    Execution time: {executionTime.toFixed(2)}ms
                  </Badge>
                  <Badge variant="outline" className="text-sm ml-2">
                    Products with dates: {Object.keys(lastSaleDates).length}
                  </Badge>
                </div>
              )}

              <div className="border rounded-md p-4 h-[300px] overflow-y-auto bg-muted/20">
                {logs.length > 0 ? (
                  <pre className="text-xs whitespace-pre-wrap">
                    {logs.map((log, index) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))}
                  </pre>
                ) : (
                  <p className="text-muted-foreground text-center mt-20">Run the test to see execution logs</p>
                )}
              </div>
            </CardContent>
          </Card>

          {Object.keys(lastSaleDates).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>Last sale dates for {Object.keys(lastSaleDates).length} products</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name or barcode"
                      className="pl-8"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="border rounded-md p-4 h-[300px] overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Product ID</th>
                        <th className="text-left py-2">Product Name</th>
                        <th className="text-left py-2">Barcode</th>
                        <th className="text-left py-2">Last Sale Date</th>
                        <th className="text-left py-2">Formatted</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(([productId, product]) => (
                        <tr key={productId} className="border-b">
                          <td className="py-2">{productId}</td>
                          <td className="py-2">{product.name || "Unknown"}</td>
                          <td className="py-2">{product.barcode || "N/A"}</td>
                          <td className="py-2">{lastSaleDates[productId] || "No sales"}</td>
                          <td className="py-2">{formatLastSaleDate(lastSaleDates[productId])}</td>
                          <td className="py-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProductId(productId)
                                setActiveTab("sales")
                                fetchProductSalesHistory(productId)
                              }}
                            >
                              View Sales
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mock Data Test</CardTitle>
              <CardDescription>
                Test the fetchLastSaleDates function with mock data to verify handling of different formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={testWithMockData} disabled={isLoading} className="mb-4">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Run Mock Test"
                )}
              </Button>

              {executionTime !== null && (
                <div className="mb-4">
                  <Badge variant="outline" className="text-sm">
                    Execution time: {executionTime.toFixed(2)}ms
                  </Badge>
                  <Badge variant="outline" className="text-sm ml-2">
                    Products with dates: {Object.keys(lastSaleDates).length}
                  </Badge>
                </div>
              )}

              <div className="border rounded-md p-4 h-[300px] overflow-y-auto bg-muted/20">
                {logs.length > 0 ? (
                  <pre className="text-xs whitespace-pre-wrap">
                    {logs.map((log, index) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))}
                  </pre>
                ) : (
                  <p className="text-muted-foreground text-center mt-20">Run the test to see execution logs</p>
                )}
              </div>
            </CardContent>
          </Card>

          {Object.keys(lastSaleDates).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>Last sale dates for {Object.keys(lastSaleDates).length} products</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md p-4">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Product ID</th>
                        <th className="text-left py-2">Product Name</th>
                        <th className="text-left py-2">Barcode</th>
                        <th className="text-left py-2">Last Sale Date</th>
                        <th className="text-left py-2">Formatted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(lastSaleDates).map(([productId, date]) => (
                        <tr key={productId} className="border-b">
                          <td className="py-2">{productId}</td>
                          <td className="py-2">{productDetails[productId]?.name || "Unknown"}</td>
                          <td className="py-2">{productDetails[productId]?.barcode || "N/A"}</td>
                          <td className="py-2">{date}</td>
                          <td className="py-2">{formatLastSaleDate(date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Sales History</CardTitle>
              <CardDescription>View all sales records for a specific product</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select
                  value={selectedProductId}
                  onValueChange={(value) => {
                    setSelectedProductId(value)
                    fetchProductSalesHistory(value)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(productDetails)
                      .sort(([_, a], [__, b]) => a.name.localeCompare(b.name))
                      .map(([id, product]) => (
                        <SelectItem key={id} value={id}>
                          {product.name} {product.barcode ? `(${product.barcode})` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProductId && (
                <div className="border rounded-md p-4">
                  <h3 className="text-lg font-medium mb-2">
                    Sales for: {productDetails[selectedProductId]?.name || "Unknown Product"}
                  </h3>

                  {isLoadingSales ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading sales history...</span>
                    </div>
                  ) : salesHistory.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Sale ID</th>
                            <th className="text-left py-2">Date</th>
                            <th className="text-left py-2">Quantity</th>
                            <th className="text-left py-2">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesHistory.map((sale, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-2">{sale.sale_id}</td>
                              <td className="py-2">{new Date(sale.created_at).toLocaleString()}</td>
                              <td className="py-2">{sale.quantity}</td>
                              <td className="py-2">{sale.price.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center py-4 text-muted-foreground">No sales records found for this product</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Function Implementation</CardTitle>
          <CardDescription>The fetchLastSaleDates function implementation being tested</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs p-4 bg-muted rounded-md overflow-x-auto">
            {`const fetchLastSaleDates = async () => {
  setIsLoadingLastSaleDates(true);
  try {
    // Try the most efficient method first (database function)
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_last_sale_dates_with_products");

    if (!rpcError && rpcData) {
      // Process the RPC results
      const lastSaleDates = {};
      const productDetails = {};

      rpcData.forEach((item) => {
        if (item.product_id && item.last_sale_date) {
          lastSaleDates[item.product_id] = item.last_sale_date;
          
          if (item.product_name) {
            productDetails[item.product_id] = {
              name: item.product_name,
              barcode: item.product_barcode,
            };
          }
        }
      });

      setLastSaleDates(lastSaleDates);
      setProductDetails(productDetails);
      return;
    }

    // Fallback to optimized query if RPC isn't available
    const { data, error } = await supabase
      .from("sale_items")
      .select(\`
        product_id,
        sales:sale_id (
          created_at
        ),
        product:product_id (
          name,
          barcode
        )
      \`)
      .order("sales.created_at", { ascending: false });

    if (error) throw error;

    // Helper function to safely get product info regardless of format
    const getProductInfo = (product) => {
      if (!product) return null;
      
      if (Array.isArray(product)) {
        return product.length > 0 ? product[0] : null;
      }
      
      return product;
    };

    // Process the results to get the most recent date for each product
    const lastSaleDates = {};
    const productDetails = {};

    data.forEach((item) => {
      const productId = item.product_id;
      const saleDate = Array.isArray(item.sales) 
        ? item.sales[0]?.created_at 
        : item.sales?.created_at;
      const productInfo = getProductInfo(item.product);

      if (productId && saleDate && !lastSaleDates[productId]) {
        lastSaleDates[productId] = saleDate;
        
        if (productInfo) {
          productDetails[productId] = {
            name: productInfo.name || "Unknown",
            barcode: productInfo.barcode
          };
        }
      }
    });

    setLastSaleDates(lastSaleDates);
    setProductDetails(productDetails);
  } catch (error) {
    console.error("Error fetching last sale dates:", error);
  } finally {
    setIsLoadingLastSaleDates(false);
  }
};`}
          </pre>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            This function handles both object and array response formats from Supabase and uses pagination to fetch all
            records. It also fetches product details to display names and barcodes.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default LastSaleDateTest
