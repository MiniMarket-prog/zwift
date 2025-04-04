"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ShoppingCart,
  Loader2,
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase-client"

// First, let's add imports for the dialog and other components we'll need
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Minus, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/hooks/use-language"
import { formatCurrency } from "@/lib/format-currency"

// Add these types at the top of the file, after the imports
type Product = {
  id: string
  name: string
  price: number
  barcode?: string
  stock: number
  min_stock: number
  category_id?: string | null
  image?: string | null
}

type Category = {
  id: string
  name: string
}

const AlertsPage = () => {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()
  const { getAppTranslation, language, isRTL } = useLanguage()
  const rtlEnabled = isRTL

  // Add state for currency
  const [currentCurrency, setCurrentCurrency] = useState<string>("USD")

  // Add state for the stock adjustment dialog
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [adjustedStock, setAdjustedStock] = useState(0)
  const [isAdjusting, setIsAdjusting] = useState(false)

  // Add state for pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)

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

  // Fetch low stock products from Supabase
  const fetchLowStockProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      // Fetch all products
      const { data, error } = await supabase.from("products").select("*")

      if (error) {
        throw error
      }

      // Filter products where stock is less than min_stock
      const lowStock = data?.filter((product: Product) => product.stock < product.min_stock) || []
      setLowStockProducts(lowStock as Product[])
      setFilteredProducts(lowStock as Product[])

      // Calculate total pages
      setTotalPages(Math.max(1, Math.ceil(lowStock.length / pageSize)))
    } catch (error) {
      console.error("Error fetching low stock products:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_to_load_products", language),
        variant: "destructive",
      })
      setLowStockProducts([])
      setFilteredProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [toast, supabase, getAppTranslation, pageSize, language])

  // Fetch categories from Supabase
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name")

      if (error) {
        throw error
      }

      // Clean up category names if they have encoding issues
      const cleanedCategories =
        data?.map((category) => {
          if (/[ð¾§ðµ¸ðŸ¶]/.test(category.name)) {
            return {
              ...category,
              name: `Category ${category.id.substring(0, 4)}`,
            }
          }
          return category
        }) || []

      setCategories(cleanedCategories as Category[])
    } catch (error) {
      console.error("Error fetching categories:", error)
      setCategories([])
    }
  }, [supabase])

  useEffect(() => {
    fetchLowStockProducts()
    fetchCategories()
    fetchCurrency()
  }, [fetchLowStockProducts, fetchCategories, fetchCurrency])

  // Listen for storage events (triggered when settings are updated)
  useEffect(() => {
    const handleStorageChange = () => {
      fetchCurrency()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("focus", fetchCurrency)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", fetchCurrency)
    }
  }, [fetchCurrency])

  // Filter products based on search term and category
  useEffect(() => {
    let filtered = lowStockProducts.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))

    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter((product) => product.category_id === categoryFilter)
    }

    setFilteredProducts(filtered)

    // Reset to first page when filters change
    setCurrentPage(1)

    // Calculate total pages
    setTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)))
  }, [searchTerm, categoryFilter, lowStockProducts, pageSize])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value)
  }

  const handleAddToCart = (product: Product) => {
    // Implement add to cart functionality
    toast({
      title: getAppTranslation("product_added", language),
      description: `${product.name} ${getAppTranslation("product_added", language).toLowerCase()}.`,
    })
  }

  const handleRestock = async (product: Product) => {
    try {
      // Update the product stock to min_stock + 5 (or some other logic)
      const newStock = product.min_stock + 5

      const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", product.id)

      if (error) throw error

      toast({
        title: getAppTranslation("success", language),
        description: `${product.name} ${getAppTranslation("has_been_restocked", language)} ${newStock} ${getAppTranslation("units", language)}.`,
      })

      // Refresh the product list
      fetchLowStockProducts()
    } catch (error) {
      console.error("Error restocking product:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_to_restock_product", language),
        variant: "destructive",
      })
    }
  }

  // Add a function to handle opening the adjust stock dialog
  const handleAdjustClick = (product: Product) => {
    setSelectedProduct(product)
    setAdjustedStock(product.stock)
    setIsAdjustDialogOpen(true)
  }

  // Add a function to handle stock adjustment
  const handleStockAdjustment = async () => {
    if (!selectedProduct) return

    setIsAdjusting(true)
    try {
      const { error } = await supabase.from("products").update({ stock: adjustedStock }).eq("id", selectedProduct.id)

      if (error) throw error

      toast({
        title: getAppTranslation("stock_updated", language),
        description: `${selectedProduct.name} ${getAppTranslation("stock_has_been_updated", language)} ${adjustedStock} ${getAppTranslation("units", language)}.`,
      })

      // Close dialog and refresh products
      setIsAdjustDialogOpen(false)
      fetchLowStockProducts()
    } catch (error) {
      console.error("Error adjusting stock:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_to_update_stock", language),
        variant: "destructive",
      })
    } finally {
      setIsAdjusting(false)
    }
  }

  // Add a function to increment/decrement stock
  const adjustStock = (amount: number) => {
    setAdjustedStock((prev) => Math.max(0, prev + amount))
  }

  // Get category name by ID
  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return "Uncategorized"

    const category = categories.find((c) => c.id === categoryId)

    // If category exists but name has encoding issues, return a clean fallback
    if (category) {
      // Check if the category name contains encoding issues (common symbols in encoding problems)
      if (/[ð¾§ðµ¸ðŸ¶]/.test(category.name)) {
        return "Category " + category.id.substring(0, 4)
      }
      return category.name
    }

    return "Uncategorized"
  }

  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    setPageSize(Number.parseInt(value))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Get paginated products
  const getPaginatedProducts = () => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredProducts.slice(startIndex, endIndex)
  }

  // Export to CSV function
  const exportToCSV = async () => {
    setIsExporting(true)
    try {
      // Create CSV content
      const headers = ["Name", "Category", "Price", "Current Stock", "Min Stock", "Stock Needed"]

      const csvRows = [headers]

      filteredProducts.forEach((product) => {
        const stockNeeded = product.min_stock - product.stock
        const categoryName = getCategoryName(product.category_id)

        const row = [
          product.name,
          categoryName,
          product.price.toString(),
          product.stock.toString(),
          product.min_stock.toString(),
          stockNeeded.toString(),
        ]
        csvRows.push(row)
      })

      // Convert to CSV string
      const csvContent =
        "data:text/csv;charset=utf-8," + csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

      // Create download link
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `low_stock_report_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Successful",
        description: `${filteredProducts.length} products exported`,
      })
    } catch (error) {
      console.error("Error exporting data:", error)
      toast({
        title: "Error",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Export to PDF function
  const exportToPDF = async () => {
    setIsExportingPDF(true)
    try {
      // Dynamically import jsPDF to avoid SSR issues
      const { jsPDF } = await import("jspdf")
      const { default: autoTable } = await import("jspdf-autotable")

      // Create a new PDF document
      const doc = new jsPDF()

      // Add title
      doc.setFontSize(18)
      doc.text("Low Stock Products Report", 14, 22)

      // Add date
      doc.setFontSize(11)
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 30)

      // Add total count
      doc.text(`Total Products: ${filteredProducts.length}`, 14, 38)

      // Prepare table data
      const tableColumn = ["Name", "Category", "Price", "Current Stock", "Min Stock", "Stock Needed"]
      const tableRows = filteredProducts.map((product) => {
        const stockNeeded = product.min_stock - product.stock
        const categoryName = getCategoryName(product.category_id)
        const price = formatCurrency(product.price, currentCurrency, language)

        return [
          product.name,
          categoryName,
          price,
          product.stock.toString(),
          product.min_stock.toString(),
          stockNeeded.toString(),
        ]
      })

      // Add table to document
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 45 },
      })

      // Save the PDF
      doc.save(`low_stock_report_${new Date().toISOString().split("T")[0]}.pdf`)

      toast({
        title: "Export Successful",
        description: `${filteredProducts.length} products exported to PDF`,
      })
    } catch (error) {
      console.error("Error exporting data to PDF:", error)
      toast({
        title: "Error",
        description: "Failed to export data to PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExportingPDF(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">{getAppTranslation("alerts", language)}</h1>
        <Badge variant="outline" className="text-sm py-1 px-3 flex items-center">
          <AlertCircle className={`h-4 w-4 ${rtlEnabled ? "ml-1" : "mr-1"}`} />
          {lowStockProducts.length} {getAppTranslation("items_below_min_stock", language)}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>{getAppTranslation("low_stock_products", language)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Input
                  type="text"
                  placeholder={getAppTranslation("search_products", language)}
                  onChange={handleSearch}
                  className="max-w-xs"
                />
              </div>
              <Select onValueChange={handleCategoryFilter} value={categoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={getAppTranslation("filter_by_category", language)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{getAppTranslation("all_categories", language)}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCSV} disabled={isExporting || filteredProducts.length === 0}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={exportToPDF}
                disabled={isExportingPDF || filteredProducts.length === 0}
              >
                {isExportingPDF ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Export PDF
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableCaption>{getAppTranslation("products_below_min_stock", language)}</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>{getAppTranslation("name", language)}</TableHead>
                    <TableHead>{getAppTranslation("category", language)}</TableHead>
                    <TableHead>{getAppTranslation("price", language)}</TableHead>
                    <TableHead className="text-center">{getAppTranslation("current_stock", language)}</TableHead>
                    <TableHead className="text-center">{getAppTranslation("min_stock", language)}</TableHead>
                    <TableHead className="text-right">{getAppTranslation("actions", language)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length > 0 ? (
                    getPaginatedProducts().map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCategoryName(product.category_id)}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(product.price, currentCurrency, language)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{product.stock}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{product.min_stock}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleAddToCart(product)}>
                            <ShoppingCart className={`h-4 w-4 ${rtlEnabled ? "ml-1" : "mr-1"}`} />
                            {getAppTranslation("add_to_cart", language)}
                          </Button>
                          <Button size="sm" onClick={() => handleRestock(product)}>
                            {getAppTranslation("restock", language)}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleAdjustClick(product)}>
                            {getAppTranslation("adjust", language)}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        {getAppTranslation("no_low_stock_products", language)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination controls */}
          {filteredProducts.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                {getAppTranslation("showing", language)}{" "}
                {Math.min((currentPage - 1) * pageSize + 1, filteredProducts.length)} -{" "}
                {Math.min(currentPage * pageSize, filteredProducts.length)} {getAppTranslation("of", language)}{" "}
                {filteredProducts.length} {/* Use direct string instead of translation key */}
                items
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 mr-4">
                  <span className="text-sm">{getAppTranslation("show", language)}</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-[70px]">
                      <SelectValue placeholder={pageSize.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Use direct string instead of translation key */}
                  <span className="text-sm">per page</span>
                </div>

                <Button variant="outline" size="icon" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-4">
                  {getAppTranslation("page", language)} {currentPage} {getAppTranslation("of", language)} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("adjust_stock_level", language)}</DialogTitle>
            <DialogDescription>
              {selectedProduct
                ? `${getAppTranslation("update_stock_for", language)} ${selectedProduct.name}`
                : getAppTranslation("update_stock_level", language)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right">
                {getAppTranslation("current_stock", language)}
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Button variant="outline" size="icon" onClick={() => adjustStock(-1)} disabled={adjustedStock <= 0}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={adjustedStock}
                  onChange={(e) => setAdjustedStock(Math.max(0, Number.parseInt(e.target.value) || 0))}
                  className="w-20 text-center"
                />
                <Button variant="outline" size="icon" onClick={() => adjustStock(1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {selectedProduct && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{getAppTranslation("min_stock", language)}</Label>
                <div className="col-span-3">
                  <span className="text-sm font-medium">{selectedProduct.min_stock}</span>
                  {adjustedStock < selectedProduct.min_stock && (
                    <p className="text-xs text-amber-500 mt-1">
                      {getAppTranslation("warning", language)}: {getAppTranslation("stock_below_min", language)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
              {getAppTranslation("cancel", language)}
            </Button>
            <Button onClick={handleStockAdjustment} disabled={isAdjusting}>
              {isAdjusting ? (
                <>
                  <Loader2 className={`${rtlEnabled ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} />
                  {getAppTranslation("saving", language)}...
                </>
              ) : (
                <>
                  <Save className={`${rtlEnabled ? "ml-2" : "mr-2"} h-4 w-4`} />
                  {getAppTranslation("save_changes", language)}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AlertsPage

