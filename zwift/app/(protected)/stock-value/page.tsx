"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { formatCurrency, getCurrentCurrency, type SupportedCurrency } from "@/lib/format-currency"
import { Package, TrendingUp, TrendingDown, Loader2, RefreshCw, ArrowUpDown, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaginationControl } from "@/components/pagination-control"

// Define types based on your database schema
interface Product {
  id: string
  name: string
  price: number
  barcode: string
  stock: number
  min_stock: number
  image: string | null
  category_id: string | null
  created_at: string
  purchase_price: number | null
  expiry_date: string | null
  expiry_notification_days: number | null
  is_pack: boolean
  parent_product_id: string | null
  pack_quantity: number | null
  pack_discount_percentage: number | null
  category_name?: string
}

interface Category {
  id: string
  name: string
  total_value: number
  total_cost: number
  product_count: number
}

interface StockSummary {
  total_retail_value: number
  total_cost_value: number
  total_profit_potential: number
  total_products: number
  total_units: number
  categories: Category[]
  low_stock_value: number
  high_stock_value: number
  expired_value: number
  expiring_soon_value: number
}

export default function StockValuePage() {
  // State variables
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([])
  const [stockSummary, setStockSummary] = useState<StockSummary>({
    total_retail_value: 0,
    total_cost_value: 0,
    total_profit_potential: 0,
    total_products: 0,
    total_units: 0,
    categories: [],
    low_stock_value: 0,
    high_stock_value: 0,
    expired_value: 0,
    expiring_soon_value: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [sortField, setSortField] = useState<keyof Product>("stock")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalPages, setTotalPages] = useState(1)

  // Hooks
  const supabase = createClient()
  const { toast } = useToast()
  const { language } = useLanguage()
  const [currency, setCurrency] = useState<SupportedCurrency>("USD")

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  // Fetch currency setting
  const fetchCurrency = async () => {
    try {
      const currencyValue = await getCurrentCurrency(supabase)
      setCurrency(currencyValue as SupportedCurrency)
    } catch (error) {
      console.error("Error fetching currency setting:", error)
      setCurrency("USD") // Default fallback
    }
  }

  // Get total count of products
  const fetchTotalCount = async () => {
    try {
      const { count, error } = await supabase.from("products").select("*", { count: "exact", head: true })

      if (error) throw error

      return count || 0
    } catch (error) {
      console.error("Error fetching product count:", error)
      return 0
    }
  }

  // Fetch products with pagination to overcome the 1000 row limit
  const fetchAllProducts = async () => {
    const PAGE_SIZE = 1000 // Supabase's maximum limit
    let allProducts: Product[] = []
    let hasMore = true
    let page = 0

    // Get total count first
    const count = await fetchTotalCount()
    setTotalCount(count)

    while (hasMore) {
      setIsFetchingMore(true)
      try {
        const from = page * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        // Update loading progress
        setLoadingProgress(Math.min(((page * PAGE_SIZE) / count) * 100, 99))

        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            categories:category_id (
              id,
              name
            )
          `)
          .range(from, to)

        if (error) throw error

        if (data && data.length > 0) {
          // Process products data
          const processedProducts = data.map((product) => ({
            ...product,
            category_name: product.categories?.name || "Uncategorized",
          }))

          allProducts = [...allProducts, ...processedProducts]
          page++

          // Check if we've reached the end
          hasMore = data.length === PAGE_SIZE
        } else {
          hasMore = false
        }
      } catch (error) {
        console.error("Error fetching products batch:", error)
        hasMore = false
      }
    }

    setLoadingProgress(100)
    setIsFetchingMore(false)
    return allProducts
  }

  // Fetch products and categories
  const fetchData = async () => {
    setIsLoading(true)
    try {
      await fetchCurrency()

      // Fetch all products with pagination
      const allProducts = await fetchAllProducts()

      setProducts(allProducts)
      setFilteredProducts(allProducts)

      // Calculate stock summary
      calculateStockSummary(allProducts)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load stock data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate stock summary
  const calculateStockSummary = (products: Product[]) => {
    const summary: StockSummary = {
      total_retail_value: 0,
      total_cost_value: 0,
      total_profit_potential: 0,
      total_products: products.length,
      total_units: 0,
      categories: [],
      low_stock_value: 0,
      high_stock_value: 0,
      expired_value: 0,
      expiring_soon_value: 0,
    }

    // Category map to aggregate values
    const categoryMap = new Map<string, Category>()

    // Current date for expiry calculations
    const currentDate = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(currentDate.getDate() + 30)

    products.forEach((product) => {
      // Calculate product values
      const retailValue = product.price * product.stock
      const costValue = (product.purchase_price || 0) * product.stock
      const profitPotential = retailValue - costValue

      // Add to totals
      summary.total_retail_value += retailValue
      summary.total_cost_value += costValue
      summary.total_profit_potential += profitPotential
      summary.total_units += product.stock

      // Check stock levels
      if (product.stock <= product.min_stock) {
        summary.low_stock_value += retailValue
      } else if (product.stock > product.min_stock * 3) {
        summary.high_stock_value += retailValue
      }

      // Check expiry
      if (product.expiry_date) {
        const expiryDate = new Date(product.expiry_date)
        if (expiryDate < currentDate) {
          summary.expired_value += retailValue
        } else if (expiryDate <= thirtyDaysFromNow) {
          summary.expiring_soon_value += retailValue
        }
      }

      // Aggregate by category
      const categoryId = product.category_id || "uncategorized"
      const categoryName = product.category_name || "Uncategorized"

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          total_value: 0,
          total_cost: 0,
          product_count: 0,
        })
      }

      const category = categoryMap.get(categoryId)!
      category.total_value += retailValue
      category.total_cost += costValue
      category.product_count += 1
    })

    // Convert category map to array
    summary.categories = Array.from(categoryMap.values()).sort((a, b) => b.total_value - a.total_value)

    setStockSummary(summary)
  }

  // Handle sort change
  const handleSort = (field: keyof Product) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Apply sorting and filtering
  useEffect(() => {
    let result = [...products]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.barcode && product.barcode.toLowerCase().includes(query)),
      )
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      if (categoryFilter === "uncategorized") {
        // Show products with null or undefined category_id
        result = result.filter((product) => !product.category_id)
      } else {
        // Show products with matching category_id
        result = result.filter((product) => product.category_id === categoryFilter)
      }
    }

    // Apply stock filter
    if (stockFilter === "low") {
      result = result.filter((product) => product.stock <= product.min_stock)
    } else if (stockFilter === "high") {
      result = result.filter((product) => product.stock > product.min_stock * 3)
    } else if (stockFilter === "out") {
      result = result.filter((product) => product.stock === 0)
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      // Handle null or undefined values
      if (aValue === null || aValue === undefined) {
        return sortDirection === "asc" ? -1 : 1
      }
      if (bValue === null || bValue === undefined) {
        return sortDirection === "asc" ? 1 : -1
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      } else {
        // Handle numeric or other types
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      }
    })

    setFilteredProducts(result)

    // Calculate total pages
    setTotalPages(Math.max(1, Math.ceil(result.length / pageSize)))

    // Reset to first page when filters change
    setCurrentPage(1)
  }, [products, searchQuery, categoryFilter, stockFilter, sortField, sortDirection, pageSize])

  // Update displayed products when filtered products or pagination changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    setDisplayedProducts(filteredProducts.slice(startIndex, endIndex))
  }, [filteredProducts, currentPage, pageSize])

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  // Calculate retail value for a product
  const getRetailValue = (product: Product) => {
    return product.price * product.stock
  }

  // Calculate cost value for a product
  const getCostValue = (product: Product) => {
    return (product.purchase_price || 0) * product.stock
  }

  // Calculate profit margin for a product
  const getProfitMargin = (product: Product) => {
    if (!product.purchase_price || product.purchase_price === 0) return 0
    return ((product.price - product.purchase_price) / product.purchase_price) * 100
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Stock Value</h1>
          <p className="text-muted-foreground">Monitor the financial value of your inventory</p>
        </div>

        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={fetchData} disabled={isLoading || isFetchingMore}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading || isFetchingMore ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading Progress */}
      {isFetchingMore && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>Loading products...</span>
            <span>{Math.round(loadingProgress)}%</span>
          </div>
          <Progress value={loadingProgress} className="h-2" />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Retail Value</CardTitle>
            <CardDescription>Current selling price of all stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stockSummary.total_retail_value, currency, language)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stockSummary.total_units} units across {stockSummary.total_products} products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cost Value</CardTitle>
            <CardDescription>Purchase cost of all stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stockSummary.total_cost_value, currency, language)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={stockSummary.total_profit_potential > 0 ? "outline" : "destructive"}>
                {stockSummary.total_profit_potential > 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                Potential profit: {formatCurrency(stockSummary.total_profit_potential, currency, language)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock Health</CardTitle>
            <CardDescription>Value distribution by stock status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Low Stock</span>
                <span>{formatCurrency(stockSummary.low_stock_value, currency, language)}</span>
              </div>
              <Progress
                value={(stockSummary.low_stock_value / stockSummary.total_retail_value) * 100}
                className="h-2 bg-muted"
                indicatorClassName="bg-amber-500"
              />

              <div className="flex justify-between text-xs mt-2">
                <span>Overstocked</span>
                <span>{formatCurrency(stockSummary.high_stock_value, currency, language)}</span>
              </div>
              <Progress
                value={(stockSummary.high_stock_value / stockSummary.total_retail_value) * 100}
                className="h-2 bg-muted"
                indicatorClassName="bg-blue-500"
              />

              <div className="flex justify-between text-xs mt-2">
                <span>Expired/Expiring</span>
                <span>
                  {formatCurrency(stockSummary.expired_value + stockSummary.expiring_soon_value, currency, language)}
                </span>
              </div>
              <Progress
                value={
                  ((stockSummary.expired_value + stockSummary.expiring_soon_value) / stockSummary.total_retail_value) *
                  100
                }
                className="h-2 bg-muted"
                indicatorClassName="bg-red-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="products" className="mb-6">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {stockSummary.categories
                    .filter((category) => category.id !== "uncategorized")
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Stock Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Levels</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="high">Overstocked</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <p>Loading stock data...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No products found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Product</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("stock")}>
                          <div className="flex items-center">
                            Stock
                            {sortField === "stock" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("price")}>
                          <div className="flex items-center">
                            Retail Value
                            {sortField === "price" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                          </div>
                        </TableHead>
                        <TableHead>Cost Value</TableHead>
                        <TableHead>Profit Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedProducts.map((product) => {
                        const retailValue = getRetailValue(product)
                        const costValue = getCostValue(product)
                        const profitMargin = getProfitMargin(product)

                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{product.name}</div>
                                {product.stock <= product.min_stock && product.stock > 0 && (
                                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                                    Low Stock
                                  </Badge>
                                )}
                                {product.stock === 0 && (
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                                    Out of Stock
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{product.category_name}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{product.stock}</div>
                              <div className="text-xs text-muted-foreground">Min: {product.min_stock}</div>
                            </TableCell>
                            <TableCell>{formatCurrency(product.price, currency, language)}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(retailValue, currency, language)}
                            </TableCell>
                            <TableCell>
                              {product.purchase_price ? formatCurrency(costValue, currency, language) : "N/A"}
                            </TableCell>
                            <TableCell>
                              {product.purchase_price ? (
                                <div
                                  className={`flex items-center ${profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
                                >
                                  {profitMargin >= 0 ? (
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 mr-1" />
                                  )}
                                  {profitMargin.toFixed(1)}%
                                </div>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="py-4 px-4 border-t flex flex-col gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {displayedProducts.length} of {filteredProducts.length} products
              </div>

              {/* Pagination Control */}
              {filteredProducts.length > 0 && (
                <PaginationControl
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  pageSize={pageSize}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[10, 25, 50, 100, 250]}
                  showFirstLast={true}
                  className="w-full"
                />
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          {/* Categories Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <p>Loading category data...</p>
                </div>
              ) : stockSummary.categories.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No categories found</h3>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead>Retail Value</TableHead>
                        <TableHead>Cost Value</TableHead>
                        <TableHead>% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockSummary.categories.map((category) => {
                        const percentOfTotal = (category.total_value / stockSummary.total_retail_value) * 100

                        return (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>{category.product_count}</TableCell>
                            <TableCell>{formatCurrency(category.total_value, currency, language)}</TableCell>
                            <TableCell>{formatCurrency(category.total_cost, currency, language)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-muted rounded-full h-2.5">
                                  <div
                                    className="bg-primary h-2.5 rounded-full"
                                    style={{ width: `${percentOfTotal}%` }}
                                  ></div>
                                </div>
                                <span>{percentOfTotal.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
