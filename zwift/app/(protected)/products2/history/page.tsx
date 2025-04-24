"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { CalendarIcon, Download, Search, ArrowUpDown, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/format-currency"
import type { DateRange } from "@/lib/types"

// Define types for our product history data
type ProductHistoryItem = {
  id: string
  product_id: string
  quantity: number
  price: number
  discount?: number
  created_at: string
  sale_id: string
  product: {
    id: string
    name: string
    purchase_price: number | null
    category_id: string | null
    category?: {
      name: string
    }
  }
}

// Define a new type for aggregated product data
type AggregatedProduct = {
  id: string
  name: string
  category: string
  quantity: number
  price: number
  discount: number
  revenue: number
  cost: number
  profit: number
}

type PeriodOption = "last7days" | "last30days" | "thisMonth" | "lastMonth" | "thisYear" | "lastYear" | "custom"

export default function ProductHistoryPage() {
  // State for period selection
  const [period, setPeriod] = useState<PeriodOption>("last30days")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(false)

  // State for product history data
  const [productHistory, setProductHistory] = useState<ProductHistoryItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [currency, setCurrency] = useState<string>("USD")

  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [sortField, setSortField] = useState<keyof AggregatedProduct>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Add pagination state variables after the other state declarations (around line 40)
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)

  // Function to get date range based on period
  const getDateRange = (selectedPeriod: PeriodOption): DateRange => {
    const today = new Date()

    switch (selectedPeriod) {
      case "last7days":
        return { from: subDays(today, 7), to: today }
      case "last30days":
        return { from: subDays(today, 30), to: today }
      case "thisMonth":
        return { from: startOfMonth(today), to: today }
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(today), 1)
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
      case "thisYear":
        return { from: startOfYear(today), to: today }
      case "lastYear":
        const lastYear = new Date(today.getFullYear() - 1, 0, 1)
        return { from: startOfYear(lastYear), to: endOfYear(lastYear) }
      case "custom":
        return dateRange
      default:
        return { from: subDays(today, 30), to: today }
    }
  }

  // Handle period change
  const handlePeriodChange = (newPeriod: PeriodOption) => {
    setPeriod(newPeriod)
    setIsCustomPeriod(newPeriod === "custom")

    if (newPeriod !== "custom") {
      const newRange = getDateRange(newPeriod)
      setDateRange(newRange)
    }
  }

  // Fetch product history data
  const fetchProductHistory = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const range = getDateRange(period)

      // Format dates for Supabase query
      const fromDate = format(range.from, "yyyy-MM-dd")
      const toDate = format(range.to, "yyyy-MM-dd 23:59:59")

      // Implement pagination to fetch all data
      let allProductHistory: ProductHistoryItem[] = []
      let hasMore = true
      let page = 0
      const PAGE_SIZE = 1000 // Supabase's maximum limit

      console.log("Fetching product history with pagination...")

      while (hasMore) {
        const { data, error } = await supabase
          .from("sale_items")
          .select(`
          id,
          product_id,
          quantity,
          price,
          discount,
          created_at,
          sale_id,
          product:product_id (
            id,
            name,
            purchase_price,
            category_id,
            category:category_id (
              name
            )
          )
        `)
          .gte("created_at", fromDate)
          .lte("created_at", toDate)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching product history:", error)
          throw error
        }

        if (data && data.length > 0) {
          // Process the data to match our type definition
          const processedData = data.map((item) => {
            // Handle the case where product might be an array
            const productData = Array.isArray(item.product) ? item.product[0] : item.product

            // Process category data
            let categoryData = undefined
            if (productData && productData.category) {
              categoryData = Array.isArray(productData.category) ? productData.category[0] : productData.category
            }

            return {
              id: item.id,
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
              created_at: item.created_at,
              sale_id: item.sale_id,
              product: productData
                ? {
                    id: productData.id,
                    name: productData.name,
                    purchase_price: productData.purchase_price,
                    category_id: productData.category_id,
                    category: categoryData,
                  }
                : undefined,
            } as ProductHistoryItem
          })

          allProductHistory = [...allProductHistory, ...processedData]
          console.log(`Fetched ${data.length} product history records (page ${page + 1})`)
          page++
          hasMore = data.length === PAGE_SIZE
        } else {
          hasMore = false
        }
      }

      console.log(`Total product history records fetched: ${allProductHistory.length}`)
      setProductHistory(allProductHistory)

      // Fetch currency setting
      const { data: settingsData } = await supabase.from("settings").select("currency").eq("type", "global").single()

      if (settingsData?.currency) {
        setCurrency(settingsData.currency)
      }
    } catch (error) {
      console.error("Error fetching product history:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate profit for a product history item
  const calculateProfit = (item: ProductHistoryItem): number => {
    if (item.product?.purchase_price === null || item.product?.purchase_price === undefined) {
      return 0
    }

    const discount = item.discount || 0
    const sellingPrice = item.price * (1 - discount / 100)
    const cost = item.product.purchase_price

    return (sellingPrice - cost) * item.quantity
  }

  // Aggregate product data
  const aggregatedProducts = useMemo(() => {
    const productMap = new Map<string, AggregatedProduct>()

    productHistory.forEach((item) => {
      if (!item.product) return

      const productId = item.product.id
      const discount = item.discount || 0
      const sellingPrice = item.price * (1 - discount / 100)
      const revenue = sellingPrice * item.quantity
      const cost = (item.product.purchase_price || 0) * item.quantity
      const profit = calculateProfit(item)

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          id: productId,
          name: item.product.name || "Unknown Product",
          category: item.product.category?.name || "Uncategorized",
          quantity: 0,
          price: item.price, // We'll use the most recent price
          discount: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        })
      }

      const product = productMap.get(productId)!
      product.quantity += item.quantity
      product.revenue += revenue
      product.cost += cost
      product.profit += profit

      // Calculate average discount (weighted by quantity)
      const totalQuantity = product.quantity
      const previousWeight = (totalQuantity - item.quantity) / totalQuantity
      const currentWeight = item.quantity / totalQuantity
      product.discount = product.discount * previousWeight + discount * currentWeight
    })

    return Array.from(productMap.values())
  }, [productHistory])

  // Filter and sort aggregated products
  const filteredAndSortedProducts = useMemo(() => {
    // First apply search filter
    let filtered = aggregatedProducts

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (product) => product.name.toLowerCase().includes(term) || product.category.toLowerCase().includes(term),
      )
    }

    // Then sort the data
    return [...filtered].sort((a, b) => {
      const valueA = a[sortField]
      const valueB = b[sortField]

      // Handle string comparison
      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortDirection === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA)
      }

      // Handle numeric comparison
      return sortDirection === "asc" ? (valueA as number) - (valueB as number) : (valueB as number) - (valueA as number)
    })
  }, [aggregatedProducts, searchTerm, sortField, sortDirection])

  // Add a useMemo for paginated history after the other useMemo hooks (around line 300)
  const paginatedProducts = useMemo(() => {
    const start = currentPage * itemsPerPage
    const end = start + itemsPerPage
    return filteredAndSortedProducts.slice(start, end)
  }, [filteredAndSortedProducts, currentPage, itemsPerPage])

  // Handle sort toggle
  const toggleSort = (field: keyof AggregatedProduct) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Export data to CSV
  const exportToCSV = () => {
    if (filteredAndSortedProducts.length === 0) return

    // Create CSV headers
    const headers = ["Product", "Category", "Quantity", "Price", "Discount", "Revenue", "Cost", "Profit"]

    // Create CSV rows
    const rows = filteredAndSortedProducts.map((product) => {
      return [
        product.name,
        product.category,
        product.quantity.toString(),
        product.price.toString(),
        product.discount > 0 ? `${product.discount.toFixed(1)}%` : "0%",
        product.revenue.toString(),
        product.cost.toString(),
        product.profit.toString(),
      ]
    })

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `products-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Fetch data when period changes
  useEffect(() => {
    fetchProductHistory()
  }, [period, dateRange])

  // Calculate summary statistics
  const summary = useMemo(() => {
    let totalQuantity = 0
    let totalRevenue = 0
    let totalCost = 0
    let totalProfit = 0

    filteredAndSortedProducts.forEach((product) => {
      totalQuantity += product.quantity
      totalRevenue += product.revenue
      totalCost += product.cost
      totalProfit += product.profit
    })

    return {
      totalProducts: filteredAndSortedProducts.length,
      totalQuantity,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    }
  }, [filteredAndSortedProducts])

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Track your product performance over time</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
          {/* Period selector */}
          <Select value={period} onValueChange={(value) => handlePeriodChange(value as PeriodOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">Last 7 days</SelectItem>
              <SelectItem value="last30days">Last 30 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="lastMonth">Last month</SelectItem>
              <SelectItem value="thisYear">This year</SelectItem>
              <SelectItem value="lastYear">Last year</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom date range picker */}
          {isCustomPeriod && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[150px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "MMM dd, yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[150px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Button variant="outline" onClick={exportToCSV} disabled={filteredAndSortedProducts.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalQuantity}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue, currency)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalProfit, currency)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.profitMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filter */}
      <div className="flex items-center mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products or categories..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Product history table */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAndSortedProducts.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("name")}>
                        Product
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("category")}>
                        Category
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("quantity")}>
                        Quantity
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("price")}>
                        Price
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Discount</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("revenue")}>
                        Revenue
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("cost")}>
                        Cost
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("profit")}>
                        Profit
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedProducts.map((product) => {
                    const profitMargin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0

                    return (
                      <tr key={product.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                        <td className="px-4 py-3 text-sm">{product.category}</td>
                        <td className="px-4 py-3 text-sm text-right">{product.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(product.price, currency)}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {product.discount > 0 ? `${product.discount.toFixed(1)}%` : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(product.revenue, currency)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(product.cost, currency)}</td>
                        <td
                          className={`px-4 py-3 text-sm text-right font-medium ${
                            product.profit > 0 ? "text-green-500" : product.profit < 0 ? "text-red-500" : ""
                          }`}
                        >
                          {formatCurrency(product.profit, currency)}
                          <span className="text-xs text-muted-foreground ml-1">({profitMargin.toFixed(1)}%)</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/products2/history/${product.id}`, "_blank")}
                          >
                            View History
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No products found for the selected period.</p>
            </div>
          )}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {Math.min(currentPage * itemsPerPage + 1, filteredAndSortedProducts.length)} to{" "}
              {Math.min((currentPage + 1) * itemsPerPage, filteredAndSortedProducts.length)} of{" "}
              {filteredAndSortedProducts.length} entries
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) =>
                    (prev + 1) * itemsPerPage < filteredAndSortedProducts.length ? prev + 1 : prev,
                  )
                }
                disabled={(currentPage + 1) * itemsPerPage >= filteredAndSortedProducts.length}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
