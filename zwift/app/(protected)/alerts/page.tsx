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
  Package,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase-client"
import { getLowStockProducts } from "@/lib/supabase" // Import the same function used in the POS page

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
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Add this type import at the top of the file, after the other imports
import type { CellHookData } from "jspdf-autotable"

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
    getStringUnitWidth: (text: string) => number
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
    try {
      // For local images or images from the same origin
      if (url.startsWith("/") || url.startsWith(window.location.origin)) {
        try {
          const response = await fetch(url, {
            mode: "cors",
            cache: "no-cache",
            headers: {
              "Cache-Control": "no-cache",
            },
          })

          if (response.ok) {
            const blob = await response.blob()
            return new Promise((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
          }
        } catch (error) {
          console.error("Error fetching local image:", error)
        }
      }

      // For external images, try with a proxy or CORS-anywhere service
      try {
        // Try using a CORS proxy if available
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`
        const response = await fetch(proxyUrl, {
          mode: "cors",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
        })

        if (response.ok) {
          const blob = await response.blob()
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        }
      } catch (error) {
        console.error("Error fetching image via proxy:", error)
      }

      // If all attempts fail, return a placeholder image
      console.log("Using placeholder image for:", url)
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAABWklEQVR4nO2UO0sDQRDHf3O5BARjoUUECx/gq7ARTMRC0N7CT2Fnb2FjZ2FnI1gKfgCx00YsxFLFwkcpaiGKj7vdGYtEuNzlLgbBwj8s7Oz8Z2b/O7OwoP+uQEFnTeAYaAEGmAIjwHqsYAJYBPaBGjBt/TpwCMwBo8CyFewAFWAXGPB8FWADmLHiTWAVOLHiVWAZWABKwBGwZn0bwDwwB+wAh8A2cAMsAXnP9wDcAVfAJXAGnAIXwLMVvwGPwD1wC9wBLaDu5W0Cj8A9cApcAhfAM/AeCbSBd6BlRXXgCrgGnoAH4A64Bd7sXBNoAk2gYUVvQMPO1YEX4NXGfAJdoAMEkUAX6Nh5Y+c7QGDnP4Au0LPzPc/fBbqRQM/z9zx/L+YLYr4g5gv+RyAHlIEpYBwYA0aAYaAIFIB8IpEQkUQiISKJhIgkEiKSSIhIIiEiiYSIJBIikkiISCIhIomEiPRrfQEVnA7CFsZPFAAAAABJRU5ErkJggg=="
    } catch (error) {
      console.error("Error converting image to base64:", error)
      // Return a simple placeholder image on error
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAABWklEQVR4nO2UO0sDQRDHf3O5BARjoUUECx/gq7ARTMRC0N7CT2Fnb2FjZ2FjZ2FnI1gKfgCx00YsxFLFwkcpaiGKj7vdGYtEuNzlLgbBwj8s7Oz8Z2b/O7OwoP+uQEFnTeAYaAEGmAIjwHqsYAJYBPaBGjBt/TpwCMwBo8CyFewAFWAXGPB8FWADmLHiTWAVOLHiVWAZWABKwBGwZn0bwDwwB+wAh8A2cAMsAXnP9wDcAVfAJXAGnAIXwLMVvwGPwD1wC9wBLaDu5W0Cj8A9cApcAhfAM/AeCbSBd6BlRXXgCrgGnoAH4A64Bd7sXBNoAk2gYUVvQMPO1YEX4NXGfAJdoAMEkUAX6Nh5Y+c7QGDnP4Au0LPzPc/fBbqRQM/z9zx/L+YLYr4g5gv+RyAHlIEpYBwYA0aAYaAIFIB8IpEQkUQiISKJhIgkEiKSSIhIIiEiiYSIJBIikkiISCIhIomEiPRrfQEVnA7CFsZPFAAAAABJRU5ErkJggg=="
    }
  }

  // Export to PDF function
  const exportToPDF = async () => {
    setIsExportingPDF(true)
    try {
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: "portrait", // Changed from landscape to portrait
        unit: "mm",
        format: "a4",
      }) as JsPDFWithAutoTable

      // Set RTL mode if using Arabic
      if (isRTL || language.startsWith("ar")) {
        doc.setR2L(true)
        // Additional RTL configuration for better Arabic support
        doc.setLanguage("ar")
      }

      // Use standard font - we'll handle Arabic text differently
      doc.setFont("helvetica")

      // Add title
      doc.setFontSize(18)
      doc.text("Low Stock Products Report", 14, 22)

      // Add date
      doc.setFontSize(11)
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 30)

      // Add total count
      doc.text(`Total Products: ${filteredProducts.length}`, 14, 38)

      // Pre-process images - handle CORS issues by skipping problematic images
      const imagePromises = filteredProducts.map(async (product, index) => {
        if (product.image) {
          try {
            // Convert image URL to base64
            const base64Image = await getImageAsBase64Helper(product.image)
            return { index, base64Image }
          } catch (error) {
            console.error(`Error loading image for product ${product.name}:`, error)
            return { index, base64Image: null }
          }
        }
        return { index, base64Image: null }
      })

      // Wait for all images to load
      const imageResults = await Promise.all(imagePromises)

      // Create a map of product index to base64 image
      const imageMap = new Map<number, string | null>()
      imageResults.forEach((result) => {
        imageMap.set(result.index, result.base64Image)
      })

      // Prepare table data
      const tableColumn = [
        "Image",
        "Name",
        "Category",
        "Barcode",
        "Price",
        "Purchase Price",
        "Current Stock",
        "Min Stock",
        "Stock Needed",
      ]

      // Create table rows
      const tableRows = filteredProducts.map((product) => {
        const stockNeeded = product.min_stock - product.stock
        const categoryName = getCategoryName(product.category_id)
        const price = formatCurrency(product.price, currentCurrency, language)
        const purchasePrice = product.purchase_price
          ? formatCurrency(product.purchase_price, currentCurrency, language)
          : "N/A"

        return [
          "", // Empty first column for images
          product.name, // Keep original text without processing
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
      let imgWidth = 12
      let imgHeight = 12

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
            imgWidth = 8
            imgHeight = 8
          } else if (rowsPerPage > 20) {
            fontSize = 7
            cellPadding = 1.5
            imgWidth = 10
            imgHeight = 10
          }

          // For single page, make everything even smaller
          if (pageCount === 1 && filteredProducts.length > 40) {
            fontSize = 5
            cellPadding = 1
            imgWidth = 6
            imgHeight = 6
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
          0: { cellWidth: 15 }, // Image column
          1: { cellWidth: 35 }, // Name
          2: { cellWidth: 25 }, // Category
          3: { cellWidth: 22 }, // Barcode
          4: { cellWidth: 15 }, // Price
          5: { cellWidth: 20 }, // Purchase Price
          6: { cellWidth: 15 }, // Current Stock
          7: { cellWidth: 15 }, // Min Stock
          8: { cellWidth: 15 }, // Stock Needed
        },
        didDrawCell: (data: CellHookData) => {
          // Only add images in the first column (index 0) and in the body section (not header)
          if (data.column.index === 0 && data.section === "body" && data.row.index !== undefined) {
            const rowIndex = data.row.index

            // Make sure we have a valid row index
            if (rowIndex >= 0 && rowIndex < filteredProducts.length) {
              const base64Image = imageMap.get(rowIndex)

              if (base64Image) {
                try {
                  // Calculate cell dimensions
                  const cellWidth = data.cell.width
                  const cellHeight = data.cell.height

                  // Calculate position to center the image in the cell
                  const x = data.cell.x + (cellWidth - imgWidth) / 2
                  const y = data.cell.y + (cellHeight - imgHeight) / 2

                  // Add image to PDF - use PNG format
                  doc.addImage(base64Image, "PNG", x, y, imgWidth, imgHeight)

                  // Log successful image addition
                  console.log(`Successfully added image for product at index ${rowIndex}`)
                } catch (error) {
                  console.error(`Error adding image to PDF for product at index ${rowIndex}:`, error)
                }
              } else {
                console.log(`No base64Image available for product at index ${rowIndex}`)
              }
            }
          }
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
          {totalProductCount > 0 && (
            <div className="text-sm">
              <p className="text-muted-foreground">
                Showing {lowStockProducts.length} low stock items out of {totalProductCount} total products
              </p>
            </div>
          )}
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
              <Select value={exportPageCount} onValueChange={handleExportPageCountChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="PDF Pages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Default)</SelectItem>
                  <SelectItem value="1">Single Page</SelectItem>
                  <SelectItem value="2">Two Pages</SelectItem>
                  <SelectItem value="3">Three Pages</SelectItem>
                  <SelectItem value="5">Five Pages</SelectItem>
                </SelectContent>
              </Select>
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
                    {/* Added image column */}
                    <TableHead className="w-[60px]">{getAppTranslation("image", language)}</TableHead>
                    <TableHead>{getAppTranslation("name", language)}</TableHead>
                    <TableHead>{getAppTranslation("category", language)}</TableHead>
                    {/* Add barcode column */}
                    <TableHead>{getAppTranslation("barcode", language)}</TableHead>
                    <TableHead>{getAppTranslation("price", language)}</TableHead>
                    {/* Add purchase price column */}
                    <TableHead>{getAppTranslation("purchase_price", language)}</TableHead>
                    <TableHead className="text-center">{getAppTranslation("current_stock", language)}</TableHead>
                    <TableHead className="text-center">{getAppTranslation("min_stock", language)}</TableHead>
                    <TableHead className="text-right">{getAppTranslation("actions", language)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length > 0 ? (
                    getPaginatedProducts().map((product) => (
                      <TableRow key={product.id}>
                        {/* Image column */}
                        <TableCell>
                          <Avatar className="h-10 w-10">
                            {product.image ? (
                              <AvatarImage src={product.image} alt={product.name} />
                            ) : (
                              <AvatarFallback>
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCategoryName(product.category_id)}</Badge>
                        </TableCell>
                        {/* Barcode column */}
                        <TableCell>
                          {product.barcode ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono">{product.barcode}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(product.price, currentCurrency, language)}</TableCell>
                        {/* Purchase price column */}
                        <TableCell>
                          {product.purchase_price ? (
                            formatCurrency(product.purchase_price, currentCurrency, language)
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
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
                      <TableCell colSpan={9} className="text-center py-4">
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

