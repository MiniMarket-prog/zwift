"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { TableHead } from "@/components/ui/table"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase-client"
import { getLowStockProducts } from "@/lib/supabase" // Import the same function used in the POS page
import { useLanguage } from "@/hooks/use-language"
import { formatCurrency } from "@/lib/format-currency"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { Minus, Plus, Loader2, Save } from "lucide-react" // Import missing icons
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
// Add the import for PaginationControl at the top of the file with the other imports
import { PaginationControl } from "@/components/pagination-control"

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

  // Add a new state for the barcode dialog after the other state declarations
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false)
  const [selectedBarcode, setSelectedBarcode] = useState<{ name: string; barcode: string | undefined }>({
    name: "",
    barcode: undefined,
  })

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

  // Add a function to handle showing the barcode dialog
  const handleShowBarcode = (product: Product) => {
    setSelectedBarcode({
      name: product.name,
      barcode: product.barcode,
    })
    setIsBarcodeDialogOpen(true)
  }

  // Add a function to handle opening the adjust stock dialog
  const handleAdjustClick = (product: Product) => {
    setSelectedProduct(product)
    setAdjustedStock(product.stock)
    setEditedPrice(product.price)
    setEditedPurchasePrice(product.purchase_price || null)
    setIsAdjustDialogOpen(true)
  }

  // Add a function to handle stock adjustment
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

  // Get paginated products
  const getPaginatedProducts = () => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredProducts.slice(startIndex, endIndex)
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

  // Helper function to convert image URL to base64
  const getImageAsBase64Helper = async (url: string): Promise<string> => {
    // Instead of trying to fetch external images which often fail due to CORS,
    // we'll use a set of predefined base64 encoded images based on the URL pattern

    // Simple hash function to get a consistent number from a string
    const simpleHash = (str: string) => {
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32bit integer
      }
      return Math.abs(hash) % 5 // Get a number between 0-4
    }

    // Array of simple colored square base64 images
    const coloredSquares = [
      // Blue square
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABLSURBVFiF7c6xCQAgDEXRp3QFcf9pHEFcIoWNKIJ4By5vgKQiSZJ+ZmZVtc0xl3vjvZ8H4B0wswOoqgGY2QZ0EbGMcQBIknQrSQ84ggvLMHhhgwAAAABJRU5ErkJggg==",
      // Green square
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABLSURBVFiF7c4xDcAwDEXRD6EzUPbfliGozlAJiQvXEt7Jsi8YqUiSJEmfM7Oq2uaYy73x3s8D8A6Y2QFUVQPMbAO6iFjGOAAkSbqVpAcUWAvLQmLy7AAAAABJRU5ErkJggg==",
      // Red square
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABLSURBVFiF7c6xDcAwDARBQ3QFcv9tXIHoDBWQuHANYU+QdgZGKpIkSdLnzKyqtjnmcm+89/MAvANmdgBV1QAz24AuIpYxDgBJkm4l6QEFjQvLt9Kh5QAAAABJRU5ErkJggg==",
      // Yellow square
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABLSURBVFiF7c4xDcAwDEXRD6EzUPbfliGozlAJiQvXEt7Jsi8YqUiSJEmfM7Oq2uaYy73x3s8D8A6Y2QFUVQPMbAO6iFjGOAAkSbqVpAcUWAvLQmLy7AAAAABJRU5ErkJggg==",
      // Purple square
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABLSURBVFiF7c4xDcAwDARBQ3QFcv9tXIHoDBWQuHANYU+QdgZGKpIkSdLnzKyqtjnmcm+89/MAvANmdgBV1QAz24AuIpYxDgBJkm4l6QEFjQvLt9Kh5QAAAABJRU5ErkJggg==",
    ]

    // Shopping cart icon as fallback
    const shoppingCartIcon =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAABWklEQVR4nO2UO0sDQRDHf3O5BARjoUUECx/gq7ARTMRC0N7CT2Fnb2FjZ2FjZ2FnI1gKfgCx00YsxFLFwkcpaiGKj7vdGYtEuNzlLgbBwj8s7Oz8Z2b/O7OwoP+uQEFnTeAYaAEGmAIjwHqsYAJYBPaBGjBt/TpwCMwBo8CyFewAFWAXGPB8FWADmLHiTWAVOLHiVWAZWABKwBGwZn0bwDwwB+wAh8A2cAMsAXnP9wDcAVfAJXAGnAIXwLMVvwGPwD1wC9wBLaDu5W0Cj8A9cApcAhfAM/AeCbSBd6BlRXXgCrgGnoAH4A64Bd7sXBNoAk2gYUVvQMPO1YEX4NXGfAJdoAMEkUAX6Nh5Y+c7QGDnP4Au0LPzPc/fBbqRQM/z9zx/L+YLYr4g5gv+RyAHlIEpYBwYA0aAYaAIFIB8IpEQkUQiISKJhIgkEiKSSIhIIiEiiYSIJBIikkiISCIhIomEiPRrfQEVnA7CFsZPFAAAAABJRU5ErkJggg=="

    try {
      // If URL is empty or invalid, return shopping cart icon
      if (!url || !url.startsWith("http")) {
        return shoppingCartIcon
      }

      // Use the hash of the URL to select a colored square
      const index = simpleHash(url)
      return coloredSquares[index]
    } catch (error) {
      console.error("Error generating image:", error)
      return shoppingCartIcon
    }
  }

  // Export to PDF function
  const exportToPDF = async () => {
    setIsExportingPDF(true)
    try {
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      }) as JsPDFWithAutoTable

      // Set RTL mode if using Arabic
      if (isRTL || language.startsWith("ar")) {
        doc.setR2L(true)
        // Additional RTL configuration for better Arabic support
        doc.setLanguage("ar")
      }

      // Use standard font
      doc.setFont("helvetica")

      // Add title
      doc.setFontSize(18)
      doc.text("Low Stock Products Report", 14, 22)

      // Add date
      doc.setFontSize(11)
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 30)

      // Add total count
      doc.text(`Total Products: ${filteredProducts.length}`, 14, 38)

      // Prepare table data - REMOVE IMAGE COLUMN
      const tableColumn = [
        "Name",
        "Category",
        "Barcode",
        "Price",
        "Purchase Price",
        "Current Stock",
        "Min Stock",
        "Stock Needed",
      ]

      // Create table rows - REMOVE IMAGE COLUMN
      const tableRows = filteredProducts.map((product) => {
        const stockNeeded = product.min_stock - product.stock
        const categoryName = getCategoryName(product.category_id)
        const price = formatCurrency(product.price, currentCurrency, language)
        const purchasePrice = product.purchase_price
          ? formatCurrency(product.purchase_price, currentCurrency, language)
          : "N/A"

        return [
          product.name,
          categoryName,
          product.barcode || "N/A",
          price,
          purchasePrice,
          product.stock.toString(),
          product.min_stock.toString(),
          stockNeeded.toString(),
        ]
      })

      // Determine font size and row height based on exportPageCount
      let fontSize = 9
      let cellPadding = 2

      // If user selected a specific page count (not "auto")
      if (exportPageCount !== "auto") {
        const pageCount = Number.parseInt(exportPageCount, 10)
        if (!isNaN(pageCount) && pageCount > 0) {
          // Calculate how many rows we need to fit per page
          const rowsPerPage = Math.ceil(filteredProducts.length / pageCount)

          // Adjust font size and cell padding based on rows per page
          if (rowsPerPage > 30) {
            fontSize = 6
            cellPadding = 1
          } else if (rowsPerPage > 20) {
            fontSize = 7
            cellPadding = 1.5
          }

          // For single page, make everything even smaller
          if (pageCount === 1 && filteredProducts.length > 40) {
            fontSize = 5
            cellPadding = 1
          }
        }
      }

      // Configure auto table options
      const tableOptions = {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        styles: {
          fontSize: fontSize,
          cellPadding: cellPadding,
          font: "helvetica",
          overflow: "linebreak",
          cellWidth: "wrap",
          halign: isRTL || language.startsWith("ar") ? "right" : "left",
        },
        headStyles: {
          fillColor: [41, 128, 185] as [number, number, number],
          textColor: 255,
          halign: "center",
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 45, right: 10, left: 10, bottom: 15 },
        columnStyles: {
          0: { cellWidth: 40 }, // Name
          1: { cellWidth: 25 }, // Category
          2: { cellWidth: 25 }, // Barcode
          3: { cellWidth: 20 }, // Price
          4: { cellWidth: 25 }, // Purchase Price
          5: { cellWidth: 20 }, // Current Stock
          6: { cellWidth: 20 }, // Min Stock
          7: { cellWidth: 20 }, // Stock Needed
        },
        didDrawPage: (data: any) => {
          // Add page number at the bottom
          doc.setFontSize(8)

          // Get page size from doc
          const pageSize = doc.internal.pageSize
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()

          // Just use the page data provided by autotable
          const text = `Page ${data.pageNumber}`
          const textWidth = (doc.getStringUnitWidth(text) * 8) / doc.internal.scaleFactor
          const textX = (pageSize.width - textWidth) / 2

          doc.text(text, textX, pageHeight - 10)
        },
      }

      // If user selected a specific page count, split the data into chunks
      if (exportPageCount !== "auto" && exportPageCount !== "1") {
        const pageCount = Number.parseInt(exportPageCount, 10)
        if (!isNaN(pageCount) && pageCount > 0) {
          // Calculate rows per page
          const rowsPerPage = Math.ceil(filteredProducts.length / pageCount)

          // Split the data into chunks for each page
          for (let page = 0; page < pageCount; page++) {
            const startIdx = page * rowsPerPage
            const endIdx = Math.min(startIdx + rowsPerPage, filteredProducts.length)

            if (startIdx >= filteredProducts.length) break

            const pageRows = tableRows.slice(startIdx, endIdx)

            // Create a table for this page
            doc.autoTable({
              ...tableOptions,
              body: pageRows,
              startY: page === 0 ? 45 : undefined, // Only set startY for first page
            })
          }
        }
      } else {
        // Auto page mode or single page - just create one table
        doc.autoTable(tableOptions)
      }

      // Save the PDF
      doc.save(`low_stock_report_${new Date().toISOString().split("T")[0]}.pdf`)

      toast({
        title: "Export Successful",
        description: `${filteredProducts.length} products exported to PDF (${exportPageCount === "auto" ? "auto-paged" : exportPageCount + " page(s)"})`,
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

  // Update the Dialog component to include price and purchase price fields
  // Replace the existing Dialog component with this updated version

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
                />
                <Button variant="outline" size="icon" onClick={() => adjustStock(1)}>
                  <Plus className="h-4 w-4" />
                </Button>
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

      {/* Barcode Dialog for mobile */}
      <Dialog open={isBarcodeDialogOpen} onOpenChange={setIsBarcodeDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl">{getTranslation("product_barcode")}</DialogTitle>
            <DialogDescription className="text-base">{selectedBarcode.name}</DialogDescription>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center justify-center">
            {selectedBarcode.barcode ? (
              <>
                <div className="bg-white p-4 rounded-md mb-4">
                  {/* Display barcode as text in a monospace font with larger size */}
                  <div className="font-mono text-xl text-center mb-2 select-all">{selectedBarcode.barcode}</div>

                  {/* Display barcode in a format that resembles a barcode */}
                  <div className="flex justify-center items-center h-16 overflow-hidden">
                    {selectedBarcode.barcode.split("").map((char, index) => (
                      <div
                        key={index}
                        className="h-full w-1 mx-[1px]"
                        style={{
                          backgroundColor: Math.random() > 0.5 ? "black" : "white",
                          height: "100%",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(selectedBarcode.barcode || "")
                      toast({
                        title: getTranslation("copied"),
                        description: getTranslation("barcode_copied_to_clipboard"),
                      })
                    }
                  }}
                  className="w-full"
                >
                  {getTranslation("copy_barcode")}
                </Button>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">{getTranslation("no_barcode_available")}</div>
            )}
          </div>
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
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6"
                    >
                      {getAppTranslation("product", language)}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      {getAppTranslation("category", language)}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-foreground hidden md:table-cell"
                    >
                      {getAppTranslation("barcode", language)}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      {getAppTranslation("price", language)}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-foreground hidden md:table-cell"
                    >
                      {getAppTranslation("purchase_price", language)}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      {getAppTranslation("current_stock", language)}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      {getAppTranslation("min_stock", language)}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">
                      {getTranslation("stock_needed")}
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                      <TableHead className="text-right">{getAppTranslation("actions", language)}</TableHead>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-background">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4">
                        <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                        <p className="mt-2">{getTranslation("loading_products")}...</p>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4">
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
                          <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAdjustClick(product)}
                                className="w-full sm:w-auto"
                              >
                                {getAppTranslation("edit", language)}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestock(product)}
                                className="w-full sm:w-auto"
                              >
                                {getAppTranslation("restock", language)}
                              </Button>
                              <Button size="sm" onClick={() => handleAddToCart(product)} className="w-full sm:w-auto">
                                {getAppTranslation("add_to_cart", language)}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShowBarcode(product)}
                                className="w-full sm:w-auto"
                              >
                                {getTranslation("show_barcode")}
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

        <div className="flex flex-col space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="export-page-count" className="text-foreground font-medium">
                {getTranslation("pages")}:
              </Label>
              <select
                id="export-page-count"
                className="rounded-md border border-input bg-background px-4 py-2 text-sm"
                value={exportPageCount}
                onChange={(e) => handleExportPageCountChange(e.target.value)}
              >
                <option value="auto" className="font-medium">
                  {getTranslation("auto") || "Automatic"}
                </option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>

            {/* Use the imported PaginationControl component */}
            <PaginationControl
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageSize={pageSize}
              onPageSizeChange={(size) => handlePageSizeChange(size.toString())}
              pageSizeOptions={[5, 10, 20, 50]}
              onExportPDF={exportToPDF}
              onExportCSV={exportToCSV}
              isExporting={isExporting || isExportingPDF}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default AlertsPage

