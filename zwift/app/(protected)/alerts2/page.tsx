"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase-client"
import { getLowStockProducts } from "@/lib/supabase"
import { formatCurrency } from "@/lib/format-currency"
import { jsPDF } from "jspdf"
// Add the autoTable plugin to jsPDF
import "jspdf-autotable"
import { Minus, Plus, Loader2, Save } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PaginationControl } from "@/components/pagination-control"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/hooks/use-language"

// Import the optimized last sale date hook
import { useLastSaleDates } from "@/app/(protected)/alerts2/optimized-last-sale-date"

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

// Add this type for jsPDF with autotable extensions
interface JsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => any
  lastAutoTable: {
    finalY: number
  }
  internal: {
    events: any
    scaleFactor: number
    pageSize: {
      width: number
      getWidth: () => number
      height: number
      getHeight: () => number
    }
    pages: number[]
    getEncryptor(objectId: number): (data: string) => string
    getNumberOfPages: () => number
    getCurrentPageInfo: () => { pageNumber: number }
    getFontSize: () => number
    getStringUnitWidth: (text: string) => string
  }
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

  // Initialize the last sale dates hook
  const {
    lastSaleDates,
    productDetails,
    isLoading: isLoadingLastSaleDates,
    fetchLastSaleDates,
    formatLastSaleDate,
  } = useLastSaleDates()

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
  const [totalProductCount, setTotalProductCount] = useState(0)

  // Add a new state for export page count after the other state declarations
  const [exportPageCount, setExportPageCount] = useState<string>("auto")

  // State for edited stock levels
  const [editedStockLevels, setEditedStockLevels] = useState<Record<string, number>>({})

  // First, add state for edited prices
  const [editedPrice, setEditedPrice] = useState<number | null>(null)
  const [editedPurchasePrice, setEditedPurchasePrice] = useState<number | null>(null)

  // Add state for category editing
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Add state for image editing after the other state variables
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null)

  // Add a new state for the barcode dialog after the other state declarations
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false)
  const [selectedBarcode, setSelectedBarcode] = useState<{ name: string; barcode: string | undefined }>({
    name: "",
    barcode: undefined,
  })

  // Add these state variables for sorting after the other state declarations
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Add a new state for edited barcode after the other state variables
  const [editedBarcode, setEditedBarcode] = useState<string | null>(null)

  // Add a new state for edited product name after the other state variables
  const [editedProductName, setEditedProductName] = useState<string>("")

  // Add a new state for edited min stock
  const [editedMinStock, setEditedMinStock] = useState<number | null>(null)

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

  // Fetch low stock products using the same function as the POS page
  const fetchLowStockProducts = useCallback(async () => {
    try {
      setIsLoading(true)

      // First, get the total count of products for reference
      const { count: totalCount } = await supabase.from("products").select("*", { count: "exact", head: true })

      setTotalProductCount(totalCount || 0)
      console.log(`Total products in database: ${totalCount}`)

      // Use the same function as the POS page to get low stock products
      const lowStock = await getLowStockProducts()
      console.log(`Found ${lowStock.length} low stock products using getLowStockProducts()`)

      setLowStockProducts(lowStock as Product[])
      setFilteredProducts(lowStock as Product[])

      // Calculate total pages
      setTotalPages(Math.max(1, Math.ceil(lowStock.length / pageSize)))

      // Initialize edited stock levels
      const initialStockLevels: Record<string, number> = {}
      lowStock.forEach((product: Product) => {
        initialStockLevels[product.id] = product.stock
      })
      setEditedStockLevels(initialStockLevels)
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
        data?.map((category: any) => {
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
    fetchLastSaleDates() // Fetch last sale dates when component mounts
  }, [fetchLowStockProducts, fetchCategories, fetchCurrency, fetchLastSaleDates])

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
    let filtered = lowStockProducts.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      const barcodeMatch = product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase())

      // Return true if either name or barcode matches
      return nameMatch || barcodeMatch
    })

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

  // Add a function to handle showing the barcode dialog
  const handleShowBarcode = (product: Product) => {
    setSelectedBarcode({
      name: product.name,
      barcode: product.barcode,
    })
    setIsBarcodeDialogOpen(true)
  }

  // Update the handleAdjustClick function to initialize the min stock value
  const handleAdjustClick = (product: Product) => {
    setSelectedProduct(product)
    setAdjustedStock(product.stock)
    setEditedPrice(product.price)
    setEditedPurchasePrice(product.purchase_price || null)
    setSelectedCategory(product.category_id || "uncategorized")
    setEditedImageUrl(product.image || null)
    setEditedBarcode(product.barcode || null)
    setEditedProductName(product.name)
    setEditedMinStock(product.min_stock) // Initialize the min stock value
    setIsAdjustDialogOpen(true)
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
        description: `${product.name} ${getTranslation("has_been_restocked")} ${newStock} ${getTranslation("units")}.`,
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
    } finally {
      setIsAdjusting(false)
    }
  }

  // Update the handleStockAdjustment function to include min_stock in the update data
  const handleStockAdjustment = async () => {
    if (!selectedProduct) return

    setIsAdjusting(true)
    try {
      // Create an update object with the stock and any changed prices
      const updateData: any = { stock: adjustedStock }

      // Only include price fields if they've been changed
      if (editedPrice !== null && editedPrice !== selectedProduct.price) {
        updateData.price = editedPrice
      }

      if (editedPurchasePrice !== null && editedPurchasePrice !== selectedProduct.purchase_price) {
        updateData.purchase_price = editedPurchasePrice
      }

      // Add category update
      if (selectedCategory !== selectedProduct.category_id) {
        // If "uncategorized" is selected, set category_id to null
        updateData.category_id = selectedCategory === "uncategorized" ? null : selectedCategory
      }

      // Add image update
      if (editedImageUrl !== selectedProduct.image) {
        updateData.image = editedImageUrl
      }

      // Add barcode update
      if (editedBarcode !== selectedProduct.barcode) {
        updateData.barcode = editedBarcode
      }

      // Add product name update
      if (editedProductName !== selectedProduct.name) {
        updateData.name = editedProductName
      }

      // Add min stock update
      if (editedMinStock !== null && editedMinStock !== selectedProduct.min_stock) {
        updateData.min_stock = editedMinStock
      }

      const { error } = await supabase.from("products").update(updateData).eq("id", selectedProduct.id)

      if (error) throw error

      toast({
        title: getAppTranslation("product_updated", language),
        description: `${selectedProduct.name} ${getTranslation("has_been_updated")}.`,
      })

      // Close dialog and refresh products
      setIsAdjustDialogOpen(false)
      fetchLowStockProducts()
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_to_update_product", language),
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

  // Handle stock level change
  const handleStockChange = (productId: string, value: string) => {
    const newStock = Number.parseInt(value, 10)
    if (!isNaN(newStock) && newStock >= 0) {
      setEditedStockLevels((prev) => ({
        ...prev,
        [productId]: newStock,
      }))
    }
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

  // Add this function to handle translation keys safely:
  // This will help us avoid TypeScript errors with undefined translation keys
  const getTranslation = (key: string): string => {
    try {
      // Try to get the translation using the app's translation system
      // @ts-ignore - Ignore TypeScript errors for keys not in AppTranslationKey
      const translated = getAppTranslation(key, language)

      // If the translation is the same as the key, it means no translation was found
      if (translated === key) {
        // Return a formatted version of the key as fallback
        return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
      }

      return translated
    } catch (error) {
      // If there's an error, return a formatted version of the key
      return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    }
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

  // Add this function to handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // New sort field, default to ascending
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Modify the getPaginatedProducts function to include sorting
  const getPaginatedProducts = () => {
    // First sort the products if a sort field is selected
    const sortedProducts = [...filteredProducts]

    if (sortField) {
      sortedProducts.sort((a, b) => {
        let valueA: any
        let valueB: any

        // Special handling for different field types
        if (sortField === "name") {
          valueA = a.name.toLowerCase()
          valueB = b.name.toLowerCase()
        } else if (sortField === "category_id") {
          valueA = getCategoryName(a.category_id).toLowerCase()
          valueB = getCategoryName(b.category_id).toLowerCase()
        } else if (sortField === "barcode") {
          valueA = a.barcode || ""
          valueB = b.barcode || ""
        } else if (sortField === "lastSaleDate") {
          // Handle sorting by last sale date
          valueA = lastSaleDates[a.id] || ""
          valueB = lastSaleDates[b.id] || ""
        } else {
          // For other fields, safely access the property
          valueA = a[sortField as keyof Product]
          valueB = b[sortField as keyof Product]

          // Handle null/undefined values
          valueA = valueA === null || valueA === undefined ? 0 : valueA
          valueB = valueB === null || valueB === undefined ? 0 : valueB
        }

        // Compare the values (now guaranteed to be defined)
        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    // Then paginate
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedProducts.slice(startIndex, endIndex)
  }

  // Add this function to handle export page count change
  const handleExportPageCountChange = (value: string) => {
    setExportPageCount(value)
  }

  // Export to CSV function
  const exportToCSV = async () => {
    setIsExporting(true)
    try {
      // Create CSV content
      const headers = [
        "Name",
        "Category",
        "Barcode",
        "Price",
        "Purchase Price",
        "Current Stock",
        "Min Stock",
        "Stock Needed",
        "Last Sale Date", // Added last sale date column
      ]

      const csvRows = [headers]

      filteredProducts.forEach((product) => {
        const stockNeeded = product.min_stock - product.stock
        const categoryName = getCategoryName(product.category_id)

        const row = [
          product.name,
          categoryName,
          product.barcode || "N/A",
          product.price.toString(),
          product.purchase_price?.toString() || "N/A",
          product.stock.toString(),
          product.min_stock.toString(),
          stockNeeded.toString(),
          formatLastSaleDate(lastSaleDates[product.id]), // Added last sale date
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

  // Simple PDF export function without using autoTable
  const exportToPDF = async () => {
    setIsExportingPDF(true)
    try {
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: "landscape", // Use landscape for more space
        unit: "mm",
        format: "a4",
      })

      // Set RTL mode if using Arabic
      if (isRTL || language.startsWith("ar")) {
        doc.setR2L(true)
      }

      // Use standard font
      doc.setFont("helvetica")

      // Add title
      doc.setFontSize(18)
      doc.text("Low Stock Products Report", 14, 15)

      // Add date
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 22)
      doc.text(`Total Products: ${filteredProducts.length}`, 14, 28)

      // Set up table headers
      const headers = ["Name", "Category", "Barcode", "Price", "Stock", "Min Stock", "Needed", "Last Sale"]

      // Set up column widths (total width = 280mm for landscape A4)
      const colWidths = [60, 40, 30, 25, 20, 20, 20, 40]
      const startX = 14
      let startY = 35
      const rowHeight = 8

      // Calculate total width
      const totalWidth = colWidths.reduce((sum, width) => sum + width, 0)

      // Draw header background
      doc.setFillColor(41, 128, 185) // Blue header background
      doc.rect(startX, startY, totalWidth, rowHeight, "F")

      // Draw header text
      doc.setTextColor(255, 255, 255) // White text for header
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")

      let currentX = startX
      headers.forEach((header, i) => {
        doc.text(header, currentX + 2, startY + 5) // Add padding
        currentX += colWidths[i]
      })

      // Reset text color for data rows
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "normal")

      // Draw data rows
      startY += rowHeight

      // Determine how many products to include based on exportPageCount
      let productsToInclude = filteredProducts
      if (exportPageCount !== "auto" && exportPageCount !== "1") {
        const pageCount = Number.parseInt(exportPageCount, 10)
        if (!isNaN(pageCount) && pageCount > 0) {
          // Calculate how many products per page
          const rowsPerPage = Math.floor((297 - startY) / rowHeight) // 297mm is A4 height
          const totalRowsAllowed = rowsPerPage * pageCount

          if (filteredProducts.length > totalRowsAllowed) {
            productsToInclude = filteredProducts.slice(0, totalRowsAllowed)
          }
        }
      }

      // Draw alternating row backgrounds
      productsToInclude.forEach((product, index) => {
        // Draw alternating row background
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245) // Light gray for even rows
        } else {
          doc.setFillColor(255, 255, 255) // White for odd rows
        }
        doc.rect(startX, startY, totalWidth, rowHeight, "F")

        // Check if we need a new page
        if (startY > 280) {
          // Near bottom of page (297mm is A4 height)
          doc.addPage()
          startY = 15 // Reset Y position on new page

          // Add page header
          doc.setFontSize(10)
          doc.text(`Low Stock Report - Page ${doc.getNumberOfPages()}`, 14, 10)
        }

        // Get data for this row
        const stockNeeded = product.min_stock - product.stock
        const categoryName = getCategoryName(product.category_id)
        const price = formatCurrency(product.price, currentCurrency, language)
        const lastSaleDate = formatLastSaleDate(lastSaleDates[product.id])

        // Draw row data
        doc.setFontSize(8)

        currentX = startX

        // Name column
        doc.text(product.name.substring(0, 28), currentX + 2, startY + 5)
        currentX += colWidths[0]

        // Category column
        doc.text(categoryName.substring(0, 18), currentX + 2, startY + 5)
        currentX += colWidths[1]

        // Barcode column
        doc.text(product.barcode?.substring(0, 13) || "N/A", currentX + 2, startY + 5)
        currentX += colWidths[2]

        // Price column
        doc.text(price, currentX + 2, startY + 5)
        currentX += colWidths[3]

        // Stock column
        doc.text(product.stock.toString(), currentX + 2, startY + 5)
        currentX += colWidths[4]

        // Min Stock column
        doc.text(product.min_stock.toString(), currentX + 2, startY + 5)
        currentX += colWidths[5]

        // Stock Needed column
        doc.text(stockNeeded.toString(), currentX + 2, startY + 5)
        currentX += colWidths[6]

        // Last Sale Date column
        doc.text(lastSaleDate, currentX + 2, startY + 5)

        // Move to next row
        startY += rowHeight
      })

      // Add page numbers at the bottom of each page
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`Page ${i} of ${pageCount}`, 140, 290) // Center bottom of page
      }

      // Save the PDF
      doc.save(`low_stock_report_${new Date().toISOString().split("T")[0]}.pdf`)

      toast({
        title: "Export Successful",
        description: `${productsToInclude.length} products exported to PDF`,
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
    <>
      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl">{getTranslation("adjust_product")}</DialogTitle>
            <DialogDescription className="text-base">
              {selectedProduct
                ? `${getTranslation("update_product")} ${selectedProduct.name}`
                : getTranslation("update_product_details")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Product name field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product-name" className="text-right font-medium text-foreground">
                {getAppTranslation("product_name", language) || "Product Name"}
              </Label>
              <div className="col-span-3">
                <Input
                  id="product-name"
                  type="text"
                  value={editedProductName}
                  onChange={(e) => setEditedProductName(e.target.value)}
                  className="w-full font-medium"
                  placeholder="Enter product name"
                  autoFocus={false}
                />
              </div>
            </div>

            {/* Stock adjustment */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right font-medium text-foreground">
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
                  className="w-20 text-center font-medium"
                  autoFocus={true}
                />
                <Button variant="outline" size="icon" onClick={() => adjustStock(1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Category selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right font-medium text-foreground">
                {getAppTranslation("category", language)}
              </Label>
              <div className="col-span-3">
                <Select value={selectedCategory || "uncategorized"} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image URL field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image" className="text-right font-medium text-foreground">
                {getAppTranslation("image", language) || "Image URL"}
              </Label>
              <div className="col-span-3">
                <div className="flex flex-col gap-2">
                  {editedImageUrl && (
                    <div className="relative w-16 h-16 mb-2 mx-auto">
                      <img
                        src={editedImageUrl || "/placeholder.svg"}
                        alt="Product preview"
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                  )}
                  <Input
                    id="image"
                    type="text"
                    value={editedImageUrl || ""}
                    onChange={(e) => setEditedImageUrl(e.target.value || null)}
                    className="w-full"
                    placeholder="Enter image URL"
                  />
                </div>
              </div>
            </div>

            {/* Barcode field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="barcode" className="text-right font-medium text-foreground">
                {getAppTranslation("barcode", language) || "Barcode"}
              </Label>
              <div className="col-span-3">
                <Input
                  id="barcode"
                  type="text"
                  value={editedBarcode || ""}
                  onChange={(e) => setEditedBarcode(e.target.value || null)}
                  className="w-full"
                  placeholder="Enter barcode"
                />
              </div>
            </div>

            {/* Price adjustment */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right font-medium text-foreground">
                {getAppTranslation("price", language)}
              </Label>
              <div className="col-span-3">
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedPrice !== null ? editedPrice : ""}
                  onChange={(e) => setEditedPrice(e.target.value ? Number.parseFloat(e.target.value) : null)}
                  className="w-full font-medium"
                  placeholder="Enter price"
                />
              </div>
            </div>

            {/* Purchase price adjustment */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purchase-price" className="text-right">
                {getAppTranslation("purchase_price", language)}
              </Label>
              <div className="col-span-3">
                <Input
                  id="purchase-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedPurchasePrice !== null ? editedPurchasePrice : ""}
                  onChange={(e) => setEditedPurchasePrice(e.target.value ? Number.parseFloat(e.target.value) : null)}
                  className="w-full"
                  placeholder="Enter purchase price"
                />
              </div>
            </div>

            {/* Min Stock adjustment - ADDED THIS SECTION */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="min-stock" className="text-right font-medium text-foreground">
                {getAppTranslation("min_stock", language)}
              </Label>
              <div className="col-span-3">
                <Input
                  id="min-stock"
                  type="number"
                  min="0"
                  value={editedMinStock !== null ? editedMinStock : ""}
                  onChange={(e) => setEditedMinStock(e.target.value ? Number.parseInt(e.target.value) : null)}
                  className="w-full"
                  placeholder="Enter minimum stock level"
                />
                {adjustedStock < (editedMinStock || 0) && (
                  <p className="text-xs text-amber-500 mt-1">
                    {getAppTranslation("warning", language)}: {getAppTranslation("stock_below_min", language)}
                  </p>
                )}
              </div>
            </div>

            {/* Profit margin calculation */}
            {editedPrice !== null && editedPurchasePrice !== null && editedPurchasePrice > 0 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{getAppTranslation("profit_margin", language)}</Label>
                <div className="col-span-3">
                  <Badge variant={editedPrice > editedPurchasePrice ? "outline" : "destructive"}>
                    {editedPrice > editedPurchasePrice
                      ? `${(((editedPrice - editedPurchasePrice) / editedPrice) * 100).toFixed(2)}%`
                      : getAppTranslation("loss", language)}
                  </Badge>
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

      {/* Barcode Dialog */}
      <Dialog open={isBarcodeDialogOpen} onOpenChange={setIsBarcodeDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl">{getTranslation("product_barcode")}</DialogTitle>
            <DialogDescription className="text-base">
              {selectedBarcode.name ? `${getTranslation("barcode_for")} ${selectedBarcode.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="barcode" className="text-right font-medium text-foreground">
                {getAppTranslation("barcode", language)}
              </Label>
              <div className="col-span-3">
                <Input
                  id="barcode"
                  type="text"
                  value={selectedBarcode.barcode || getTranslation("no_barcode")}
                  readOnly
                  className="w-full font-medium"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBarcodeDialogOpen(false)}>
              {getAppTranslation("close", language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container py-10">
        <div className="flex flex-col space-y-4">
          <div className="flex-1 space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{getTranslation("low_stock_alerts")}</h2>
            <p className="text-muted-foreground text-base">{getTranslation("products_running_low")}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Input
              type="search"
              placeholder={getAppTranslation("search_products", language)}
              className="w-full sm:w-64"
              onChange={handleSearch}
            />
            <select
              className="rounded-md border border-input bg-background px-4 py-2 text-sm w-full sm:w-auto"
              value={categoryFilter}
              onChange={(e) => handleCategoryFilter(e.target.value)}
            >
              <option value="all">{getAppTranslation("all_categories", language)}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow ring-1 ring-black/5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-muted">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6 cursor-pointer hover:bg-muted/80"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        {getAppTranslation("product", language)}
                        {sortField === "name" && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/80"
                      onClick={() => handleSort("category_id")}
                    >
                      <div className="flex items-center">
                        {getAppTranslation("category", language)}
                        {sortField === "category_id" && (
                          <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-foreground hidden md:table-cell cursor-pointer hover:bg-muted/80"
                      onClick={() => handleSort("barcode")}
                    >
                      <div className="flex items-center">
                        {getAppTranslation("barcode", language)}
                        {sortField === "barcode" && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/80"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center">
                        {getAppTranslation("price", language)}
                        {sortField === "price" && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-foreground hidden md:table-cell cursor-pointer hover:bg-muted/80"
                      onClick={() => handleSort("purchase_price")}
                    >
                      <div className="flex items-center">
                        {getAppTranslation("purchase_price", language)}
                        {sortField === "purchase_price" && (
                          <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/80"
                      onClick={() => handleSort("stock")}
                    >
                      <div className="flex items-center">
                        {getAppTranslation("current_stock", language)}
                        {sortField === "stock" && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/80"
                      onClick={() => handleSort("min_stock")}
                    >
                      <div className="flex items-center">
                        {getAppTranslation("min_stock", language)}
                        {sortField === "min_stock" && (
                          <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      {getTranslation("stock_needed")}
                    </th>
                    {/* Add Last Sale Date column header */}
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-foreground cursor-pointer hover:bg-muted/80"
                      onClick={() => handleSort("lastSaleDate")}
                    >
                      <div className="flex items-center">
                        {getAppTranslation("last_sale_date", language)}
                        {sortField === "lastSaleDate" && (
                          <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                      {getAppTranslation("actions", language)}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-background">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-4">
                        <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                        <p className="mt-2">{getTranslation("loading_products")}...</p>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-4">
                        {getAppTranslation("no_low_stock_products", language)}
                      </td>
                    </tr>
                  ) : (
                    getPaginatedProducts().map((product) => {
                      const stockNeeded = product.min_stock - product.stock

                      return (
                        <tr key={product.id}>
                          <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                            <div className="flex items-center">
                              <div
                                className="h-10 w-10 flex-shrink-0 cursor-pointer md:cursor-default"
                                onClick={() => handleShowBarcode(product)}
                              >
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={product.image || "/placeholder.jpg"}
                                  alt={product.name}
                                />
                                <span className="md:hidden block text-[8px] text-center mt-1 text-muted-foreground">
                                  {getTranslation("view_barcode")}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="font-medium text-foreground">{product.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm text-foreground">{getCategoryName(product.category_id)}</td>
                          <td className="px-3 py-4 text-sm text-foreground hidden md:table-cell">
                            {product.barcode || "N/A"}
                          </td>
                          <td className="px-3 py-4 text-sm font-medium text-foreground">
                            {formatCurrency(product.price, currentCurrency, language)}
                          </td>
                          <td className="px-3 py-4 text-sm text-foreground hidden md:table-cell">
                            {product.purchase_price
                              ? formatCurrency(product.purchase_price, currentCurrency, language)
                              : "N/A"}
                          </td>
                          <td className="px-3 py-4 text-sm font-medium text-foreground">
                            {editedStockLevels[product.id] !== undefined
                              ? editedStockLevels[product.id]
                              : product.stock}
                          </td>
                          <td className="px-3 py-4 text-sm font-medium text-foreground">{product.min_stock}</td>
                          <td className="px-3 py-4 text-sm">
                            {stockNeeded > 0 ? (
                              <Badge variant="destructive" className="font-medium">
                                {stockNeeded}
                              </Badge>
                            ) : (
                              <Badge className="font-medium">{stockNeeded}</Badge>
                            )}
                          </td>
                          {/* Add Last Sale Date column */}
                          <td className="px-3 py-4 text-sm text-foreground">
                            {isLoadingLastSaleDates ? (
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                              formatLastSaleDate(lastSaleDates[product.id])
                            )}
                          </td>
                          <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleAdjustClick(product)}>
                                {getAppTranslation("edit", language)}
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => handleRestock(product)}>
                                {getTranslation("restock")}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination controls */}
        <div className="flex flex-col items-center mt-4 space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-2">
            <Label htmlFor="page-size">{getAppTranslation("page_size", language)}:</Label>
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
          </div>

          <PaginationControl currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>

        {/* Export options */}
        <div className="flex flex-col items-center mt-6 space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="secondary" onClick={exportToCSV} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getTranslation("exporting")}...
                </>
              ) : (
                getTranslation("export_to_csv")
              )}
            </Button>

            <div className="flex items-center space-x-2">
              <Label htmlFor="export-page-count">{getTranslation("pages")}:</Label>
              <Select value={exportPageCount} onValueChange={handleExportPageCountChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={exportPageCount} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{getTranslation("auto")}</SelectItem>
                  <SelectItem value="1">1 {getTranslation("page")}</SelectItem>
                  <SelectItem value="2">2 {getTranslation("pages")}</SelectItem>
                  <SelectItem value="3">3 {getTranslation("pages")}</SelectItem>
                  <SelectItem value="4">4 {getTranslation("pages")}</SelectItem>
                  <SelectItem value="5">5 {getTranslation("pages")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="secondary" onClick={exportToPDF} disabled={isExportingPDF}>
              {isExportingPDF ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getTranslation("exporting")}...
                </>
              ) : (
                getTranslation("export_to_pdf")
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default AlertsPage
