"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { formatCurrency, getCurrentCurrency, type SupportedCurrency } from "@/lib/format-currency"
import { Package, TrendingUp, TrendingDown, Loader2, RefreshCw, ArrowUpDown, Search, ShoppingCart } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import {
  fetchProductsWithSalesData,
  calculateStockSummary,
  type Product,
  type StockSummary,
} from "@/lib/stock-value-service"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaginationControl } from "@/components/pagination-control"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

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
    active_inventory_value: 0,
    inactive_inventory_value: 0,
    active_product_count: 0,
    active_unit_count: 0,
    active_cost_value: 0,
    active_profit_potential: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [sortField, setSortField] = useState<keyof Product>("stock")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")
  const [salesFilter, setSalesFilter] = useState<string>("all") // New filter for sales history
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [showOnlySoldProducts, setShowOnlySoldProducts] = useState(false) // Toggle for showing only products with sales

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

  // Fetch products and categories
  const fetchData = async () => {
    setIsLoading(true)
    setLoadingProgress(0)
    try {
      await fetchCurrency()

      // Show loading progress
      setIsFetchingMore(true)
      setLoadingProgress(30)

      // Fetch all products with sales data
      const allProducts = await fetchProductsWithSalesData()
      setLoadingProgress(80)

      setProducts(allProducts)
      setFilteredProducts(allProducts)

      // Calculate stock summary
      const summary = calculateStockSummary(allProducts, showOnlySoldProducts)
      setStockSummary(summary)

      setLoadingProgress(100)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load stock data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsFetchingMore(false)
    }
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

    // Apply sales history filter if enabled
    if (showOnlySoldProducts) {
      result = result.filter((product) => product.has_sales)
    }

    // Apply sales filter
    if (salesFilter !== "all") {
      if (salesFilter === "with_sales") {
        result = result.filter((product) => product.has_sales)
      } else if (salesFilter === "no_sales") {
        result = result.filter((product) => !product.has_sales)
      }
    }

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
  }, [
    products,
    searchQuery,
    categoryFilter,
    stockFilter,
    salesFilter,
    showOnlySoldProducts,
    sortField,
    sortDirection,
    pageSize,
  ])

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

  // Toggle the "show only sold products" filter
  const toggleShowOnlySoldProducts = () => {
    setShowOnlySoldProducts(!showOnlySoldProducts)
  }

  // Recalculate stock summary when toggle changes
  useEffect(() => {
    if (products.length > 0) {
      const summary = calculateStockSummary(products, showOnlySoldProducts)
      setStockSummary(summary)
    }
  }, [showOnlySoldProducts, products])

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

      {/* Active Inventory Toggle */}
      <div className="flex items-center space-x-2 mb-6">
        <Switch id="active-inventory" checked={showOnlySoldProducts} onCheckedChange={toggleShowOnlySoldProducts} />
        <Label htmlFor="active-inventory">Show only products with sales history (active inventory)</Label>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {showOnlySoldProducts ? "Active Inventory Value" : "Total Retail Value"}
            </CardTitle>
            <CardDescription>
              {showOnlySoldProducts ? "Value of products with sales history" : "Current selling price of all stock"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                showOnlySoldProducts ? stockSummary.active_inventory_value : stockSummary.total_retail_value,
                currency,
                language,
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {showOnlySoldProducts
                ? `${stockSummary.active_unit_count.toLocaleString()} units across ${stockSummary.active_product_count.toLocaleString()} products`
                : `${stockSummary.total_units.toLocaleString()} units across ${stockSummary.total_products.toLocaleString()} products`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {showOnlySoldProducts ? "Active Cost Value" : "Total Cost Value"}
            </CardTitle>
            <CardDescription>
              {showOnlySoldProducts ? "Purchase cost of products with sales" : "Purchase cost of all stock"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                showOnlySoldProducts ? stockSummary.active_cost_value : stockSummary.total_cost_value,
                currency,
                language,
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  (showOnlySoldProducts ? stockSummary.active_profit_potential : stockSummary.total_profit_potential) >
                  0
                    ? "outline"
                    : "destructive"
                }
              >
                {(showOnlySoldProducts ? stockSummary.active_profit_potential : stockSummary.total_profit_potential) >
                0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                Potential profit:{" "}
                {formatCurrency(
                  showOnlySoldProducts ? stockSummary.active_profit_potential : stockSummary.total_profit_potential,
                  currency,
                  language,
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inventory Breakdown</CardTitle>
            <CardDescription>Active vs. Inactive inventory value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Active Inventory (Sold Products)</span>
                <span>{formatCurrency(stockSummary.active_inventory_value, currency, language)}</span>
              </div>
              <Progress
                value={(stockSummary.active_inventory_value / stockSummary.total_retail_value) * 100}
                className="h-2 bg-muted"
                indicatorClassName="bg-green-500"
              />

              <div className="flex justify-between text-xs mt-2">
                <span>Inactive Inventory (Never Sold)</span>
                <span>{formatCurrency(stockSummary.inactive_inventory_value, currency, language)}</span>
              </div>
              <Progress
                value={(stockSummary.inactive_inventory_value / stockSummary.total_retail_value) * 100}
                className="h-2 bg-muted"
                indicatorClassName="bg-amber-500"
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

            <div className="flex flex-wrap gap-2">
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

              <Select value={salesFilter} onValueChange={setSalesFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sales History" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="with_sales">With Sales History</SelectItem>
                  <SelectItem value="no_sales">No Sales History</SelectItem>
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
                        <TableHead>Sales History</TableHead>
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
                            <TableCell>
                              {product.has_sales ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  <ShoppingCart className="h-3 w-3 mr-1" />
                                  Has Sales
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-800">
                                  <Package className="h-3 w-3 mr-1" />
                                  No Sales
                                </Badge>
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
                      {stockSummary.categories
                        .filter((category) => {
                          // If showing only sold products, filter out categories with no sold products
                          if (showOnlySoldProducts) {
                            return category.has_sold_products === true
                          }
                          return true
                        })
                        .map((category) => {
                          // Use the appropriate values based on the toggle state
                          const displayProductCount = showOnlySoldProducts
                            ? category.active_product_count || 0
                            : category.product_count

                          const displayValue = showOnlySoldProducts
                            ? category.active_total_value || 0
                            : category.total_value

                          const displayCost = showOnlySoldProducts
                            ? category.active_total_cost || 0
                            : category.total_cost

                          const percentOfTotal =
                            (displayValue /
                              (showOnlySoldProducts
                                ? stockSummary.active_inventory_value
                                : stockSummary.total_retail_value)) *
                            100

                          return (
                            <TableRow key={category.id}>
                              <TableCell className="font-medium">{category.name}</TableCell>
                              <TableCell>{displayProductCount}</TableCell>
                              <TableCell>{formatCurrency(displayValue, currency, language)}</TableCell>
                              <TableCell>{formatCurrency(displayCost, currency, language)}</TableCell>
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
