"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/format-currency"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// Properly extend the jsPDF types to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable
    lastAutoTable: {
      finalY: number
    }
  }
}

import {
  Minus,
  Plus,
  Loader2,
  Save,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Package,
  TrendingDown,
  RefreshCw,
  BarChart3,
  Edit,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react"

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
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Import components
import { useLastSaleDates } from "./optimized-last-sale-date"
import { ExportSettingsDialog, type ExportSettings } from "./export-settings-dialog"
import { preloadImage, getProxiedImageUrl } from "./image-utils"
import { ViewSelector } from "./view-selector"
import { ProductCardView } from "./product-grid-view"
import { ProductDetailView } from "./product-detail-view"
import { TableColumnSettingsDialog, type TableColumnSettings } from "./table-column-settings"

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

type ViewMode = "table" | "grid" | "split" | "cards"

interface JsPDFWithAutoTable extends jsPDF {
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

const AlertsPage: React.FC = () => {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
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

  // State variables
  const [currentCurrency, setCurrentCurrency] = useState<string>("USD")
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [adjustedStock, setAdjustedStock] = useState(0)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [totalProductCount, setTotalProductCount] = useState(0)
  const [exportPageCount, setExportPageCount] = useState<string>("auto")
  const [editedStockLevels, setEditedStockLevels] = useState<Record<string, number>>({})
  const [editedPrice, setEditedPrice] = useState<number | null>(null)
  const [editedPurchasePrice, setEditedPurchasePrice] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null)
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false)
  const [selectedBarcode, setSelectedBarcode] = useState<{ name: string; barcode: string | undefined }>({
    name: "",
    barcode: undefined,
  })
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [editedBarcode, setEditedBarcode] = useState<string | null>(null)
  const [editedProductName, setEditedProductName] = useState<string>("")
  const [editedMinStock, setEditedMinStock] = useState<number | null>(null)
  const [isExportSettingsOpen, setIsExportSettingsOpen] = useState(false)
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    columns: {
      name: true,
      category: true,
      barcode: true,
      price: true,
      purchasePrice: true,
      currentStock: true,
      minStock: true,
      stockNeeded: true,
      lastSaleDate: true,
    },
    includeImages: false,
    groupByCategory: false,
    imageSize: 25,
    includeHeader: true,
    includeFooter: true,
    pdfOrientation: "landscape" as "portrait" | "landscape",
    pdfFormat: "a4" as "a4" | "letter" | "legal",
  })
  const [exportType, setExportType] = useState<"csv" | "pdf">("pdf")
  const [tableColumnSettings, setTableColumnSettings] = useState<TableColumnSettings>({
    image: true,
    name: true,
    category: true,
    barcode: true,
    price: true,
    purchasePrice: false,
    stock: true,
    needed: true,
    lastSale: true,
    actions: true,
  })
  const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false)

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

  // Update product in state
  const updateProductInState = useCallback((updatedProduct: Product) => {
    setLowStockProducts((prevProducts) =>
      prevProducts.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)),
    )
    setFilteredProducts((prevProducts) =>
      prevProducts.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)),
    )
    setEditedStockLevels((prev) => ({
      ...prev,
      [updatedProduct.id]: updatedProduct.stock,
    }))
  }, [])

  // Check if product should be in low stock list
  const shouldProductBeInLowStockList = useCallback((product: Product) => {
    return product.stock <= product.min_stock
  }, [])

  // Remove product from state if not low stock
  const removeProductFromStateIfNotLowStock = useCallback(
    (productId: string, updatedProduct: Product) => {
      if (!shouldProductBeInLowStockList(updatedProduct)) {
        setLowStockProducts((prevProducts) => prevProducts.filter((product) => product.id !== productId))
        setFilteredProducts((prevProducts) => prevProducts.filter((product) => product.id !== productId))
        setEditedStockLevels((prev) => {
          const newLevels = { ...prev }
          delete newLevels[productId]
          return newLevels
        })
        toast({
          title: getAppTranslation("success", language),
          description: `${updatedProduct.name} is no longer low stock and has been removed from the list.`,
        })
      }
    },
    [shouldProductBeInLowStockList, toast, getAppTranslation, language],
  )

  // Fetch low stock products
  const fetchLowStockProducts = useCallback(async () => {
    try {
      setIsLoading(true)

      // Try RPC first
      try {
        console.log("Attempting to fetch low stock products via RPC...")
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_low_stock_products")

        if (!rpcError && rpcData) {
          console.log(`Successfully fetched ${rpcData.length} low stock products via RPC`)
          setLowStockProducts(rpcData)
          setFilteredProducts(rpcData)
          setTotalPages(Math.max(1, Math.ceil(rpcData.length / pageSize)))

          const initialStockLevels: Record<string, number> = {}
          rpcData.forEach((product: Product) => {
            initialStockLevels[product.id] = product.stock
          })
          setEditedStockLevels(initialStockLevels)
          return
        }
      } catch (rpcErr) {
        console.error("RPC method failed, falling back to direct query:", rpcErr)
      }

      // Fallback to direct query
      const { count: totalCount } = await supabase.from("products").select("*", { count: "exact", head: true })
      setTotalProductCount(totalCount || 0)

      let allProducts: Product[] = []
      let hasMore = true
      let page = 0
      const PAGE_SIZE = 1000

      while (hasMore) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (error) {
          console.error("Error fetching products:", error)
          throw error
        }

        if (data && data.length > 0) {
          allProducts = [...allProducts, ...data]
          page++
          hasMore = data.length === PAGE_SIZE
        } else {
          hasMore = false
        }
      }

      const lowStockProducts = allProducts.filter((product) => product.stock <= product.min_stock)
      setLowStockProducts(lowStockProducts)
      setFilteredProducts(lowStockProducts)
      setTotalPages(Math.max(1, Math.ceil(lowStockProducts.length / pageSize)))

      const initialStockLevels: Record<string, number> = {}
      lowStockProducts.forEach((product: Product) => {
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

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name")

      if (error) {
        throw error
      }

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

  // Initialize data
  useEffect(() => {
    fetchLowStockProducts()
    fetchCategories()
    fetchCurrency()
    fetchLastSaleDates()
  }, [fetchLowStockProducts, fetchCategories, fetchCurrency, fetchLastSaleDates])

  // Listen for storage events
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

  // Filter products
  useEffect(() => {
    let filtered = lowStockProducts.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      const barcodeMatch = product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
      return nameMatch || barcodeMatch
    })

    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter((product) => product.category_id === categoryFilter)
    }

    setFilteredProducts(filtered)

    if (searchTerm || categoryFilter) {
      setCurrentPage(1)
    }

    const newTotalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    setTotalPages(newTotalPages)

    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages)
    }
  }, [searchTerm, categoryFilter, lowStockProducts, pageSize, currentPage])

  // Helper functions
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value)
  }

  const handleShowBarcode = (product: Product) => {
    setSelectedBarcode({
      name: product.name,
      barcode: product.barcode,
    })
    setIsBarcodeDialogOpen(true)
  }

  const handleAdjustClick = (product: Product) => {
    setSelectedProduct(product)
    setAdjustedStock(product.stock)
    setEditedPrice(product.price)
    setEditedPurchasePrice(product.purchase_price || null)
    setSelectedCategory(product.category_id || "uncategorized")
    setEditedImageUrl(product.image || null)
    setEditedBarcode(product.barcode || null)
    setEditedProductName(product.name)
    setEditedMinStock(product.min_stock)
    setIsAdjustDialogOpen(true)
  }

  const getTranslation = (key: string): string => {
    try {
      // @ts-ignore
      const translated = getAppTranslation(key, language)
      if (translated === key) {
        return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
      }
      return translated
    } catch (error) {
      return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    }
  }

  const handleRestock = async (product: Product) => {
    try {
      const newStock = product.min_stock + 5
      const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", product.id)

      if (error) throw error

      toast({
        title: getAppTranslation("success", language),
        description: `${product.name} has been restocked to ${newStock} units.`,
      })

      const updatedProduct = { ...product, stock: newStock }

      if (shouldProductBeInLowStockList(updatedProduct)) {
        updateProductInState(updatedProduct)
      } else {
        removeProductFromStateIfNotLowStock(product.id, updatedProduct)
      }
    } catch (error) {
      console.error("Error restocking product:", error)
      toast({
        title: getAppTranslation("error", language),
        description: "Failed to restock product",
        variant: "destructive",
      })
    }
  }

  const handleStockAdjustment = async () => {
    if (!selectedProduct) return

    setIsAdjusting(true)
    try {
      const updateData: any = { stock: adjustedStock }

      if (editedPrice !== null && editedPrice !== selectedProduct.price) {
        updateData.price = editedPrice
      }

      if (editedPurchasePrice !== null && editedPurchasePrice !== selectedProduct.purchase_price) {
        updateData.purchase_price = editedPurchasePrice
      }

      if (selectedCategory !== selectedProduct.category_id) {
        updateData.category_id = selectedCategory === "uncategorized" ? null : selectedCategory
      }

      if (editedImageUrl !== selectedProduct.image) {
        updateData.image = editedImageUrl
      }

      if (editedBarcode !== selectedProduct.barcode) {
        updateData.barcode = editedBarcode
      }

      if (editedProductName !== selectedProduct.name) {
        updateData.name = editedProductName
      }

      if (editedMinStock !== null && editedMinStock !== selectedProduct.min_stock) {
        updateData.min_stock = editedMinStock
      }

      const { error } = await supabase.from("products").update(updateData).eq("id", selectedProduct.id)

      if (error) throw error

      toast({
        title: getAppTranslation("product_updated", language),
        description: `${selectedProduct.name} has been updated.`,
      })

      const updatedProduct: Product = {
        ...selectedProduct,
        ...updateData,
      }

      if (shouldProductBeInLowStockList(updatedProduct)) {
        updateProductInState(updatedProduct)
      } else {
        removeProductFromStateIfNotLowStock(selectedProduct.id, updatedProduct)
      }

      setIsAdjustDialogOpen(false)
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: getAppTranslation("error", language),
        description: "Failed to update product",
        variant: "destructive",
      })
    } finally {
      setIsAdjusting(false)
    }
  }

  const adjustStock = (amount: number) => {
    setAdjustedStock((prev) => Math.max(0, prev + amount))
  }

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return "Uncategorized"

    const category = categories.find((c) => c.id === categoryId)

    if (category) {
      if (/[ð¾§ðµ¸ðŸ¶]/.test(category.name)) {
        return "Category " + category.id.substring(0, 4)
      }
      return category.name
    }

    return "Uncategorized"
  }

  const handlePageSizeChange = (value: string) => {
    const newPageSize = Number.parseInt(value)
    setPageSize(newPageSize)
    const currentFirstItemIndex = (currentPage - 1) * pageSize
    const newCurrentPage = Math.floor(currentFirstItemIndex / newPageSize) + 1
    setCurrentPage(newCurrentPage)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getPaginatedProducts = () => {
    const sortedProducts = [...filteredProducts]

    if (sortField) {
      sortedProducts.sort((a, b) => {
        let valueA: any
        let valueB: any

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
          valueA = lastSaleDates[a.id] || ""
          valueB = lastSaleDates[b.id] || ""
        } else {
          valueA = a[sortField as keyof Product]
          valueB = b[sortField as keyof Product]
          valueA = valueA === null || valueA === undefined ? 0 : valueA
          valueB = valueB === null || valueB === undefined ? 0 : valueB
        }

        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedProducts.slice(startIndex, endIndex)
  }

  const openExportSettings = (exportType: "csv" | "pdf") => {
    setExportType(exportType)
    setIsExportSettingsOpen(true)
  }

  const exportToCSV = async () => {
    setIsExporting(true)
    try {
      const selectedColumns = Object.entries(exportSettings.columns)
        .filter(([_, selected]) => selected)
        .map(([column]) => column)

      const headers: string[] = []
      if (selectedColumns.includes("name")) headers.push("Name")
      if (selectedColumns.includes("category")) headers.push("Category")
      if (selectedColumns.includes("barcode")) headers.push("Barcode")
      if (selectedColumns.includes("price")) headers.push("Price")
      if (selectedColumns.includes("purchasePrice")) headers.push("Purchase Price")
      if (selectedColumns.includes("currentStock")) headers.push("Current Stock")
      if (selectedColumns.includes("minStock")) headers.push("Min Stock")
      if (selectedColumns.includes("stockNeeded")) headers.push("Stock Needed")
      if (selectedColumns.includes("lastSaleDate")) headers.push("Last Sale Date")

      const csvRows = [headers]

      const productsToExport = [...filteredProducts]
      if (exportSettings.groupByCategory) {
        productsToExport.sort((a, b) => {
          const catA = getCategoryName(a.category_id).toLowerCase()
          const catB = getCategoryName(b.category_id).toLowerCase()
          return catA.localeCompare(catB)
        })
      }

      productsToExport.forEach((product) => {
        const stockNeeded = product.min_stock - product.stock
        const categoryName = getCategoryName(product.category_id)

        const row: string[] = []
        if (selectedColumns.includes("name")) row.push(product.name)
        if (selectedColumns.includes("category")) row.push(categoryName)
        if (selectedColumns.includes("barcode")) row.push(product.barcode || "N/A")
        if (selectedColumns.includes("price")) row.push(product.price.toString())
        if (selectedColumns.includes("purchasePrice")) row.push(product.purchase_price?.toString() || "N/A")
        if (selectedColumns.includes("currentStock")) row.push(product.stock.toString())
        if (selectedColumns.includes("minStock")) row.push(product.min_stock.toString())
        if (selectedColumns.includes("stockNeeded")) row.push(stockNeeded.toString())
        if (selectedColumns.includes("lastSaleDate")) row.push(formatLastSaleDate(lastSaleDates[product.id]))

        csvRows.push(row)
      })

      const csvContent =
        "data:text/csv;charset=utf-8," + csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `low_stock_report_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Successful",
        description: `${productsToExport.length} products exported`,
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

  const exportToPDF = async () => {
    setIsExportingPDF(true)
    try {
      const doc = new jsPDF({
        orientation: exportSettings.pdfOrientation,
        unit: "mm",
        format: exportSettings.pdfFormat,
      }) as JsPDFWithAutoTable

      if (isRTL || language.startsWith("ar")) {
        doc.setR2L(true)
      }

      doc.setFont("helvetica")

      if (exportSettings.includeHeader) {
        doc.setFontSize(18)
        doc.text("Low Stock Products Report", 14, 15)
        doc.setFontSize(10)
        doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 22)
        doc.text(`Total Products: ${filteredProducts.length}`, 14, 28)
        doc.text(`Format: ${exportSettings.pdfFormat.toUpperCase()} ${exportSettings.pdfOrientation}`, 14, 34)
      }

      const selectedColumns = Object.entries(exportSettings.columns)
        .filter(([_, selected]) => selected)
        .map(([column]) => column)

      const headers: string[] = []
      if (selectedColumns.includes("name")) headers.push("Name")
      if (selectedColumns.includes("category")) headers.push("Category")
      if (selectedColumns.includes("barcode")) headers.push("Barcode")
      if (selectedColumns.includes("price")) headers.push("Price")
      if (selectedColumns.includes("purchasePrice")) headers.push("Purchase Price")
      if (selectedColumns.includes("currentStock")) headers.push("Current Stock")
      if (selectedColumns.includes("minStock")) headers.push("Min Stock")
      if (selectedColumns.includes("stockNeeded")) headers.push("Stock Needed")
      if (selectedColumns.includes("lastSaleDate")) headers.push("Last Sale Date")

      let productsToInclude = [...filteredProducts]
      if (exportSettings.groupByCategory) {
        productsToInclude.sort((a, b) => {
          const catA = getCategoryName(a.category_id).toLowerCase()
          const catB = getCategoryName(b.category_id).toLowerCase()
          return catA.localeCompare(catB)
        })
      }

      if (exportPageCount !== "auto" && exportPageCount !== "1") {
        const pageCount = Number.parseInt(exportPageCount, 10)
        if (!isNaN(pageCount) && pageCount > 0) {
          const rowsPerPage = Math.floor((297 - 40) / 10)
          const totalRowsAllowed = rowsPerPage * pageCount

          if (productsToInclude.length > totalRowsAllowed) {
            productsToInclude = productsToInclude.slice(0, totalRowsAllowed)
          }
        }
      }

      const tableRows = productsToInclude.map((product) => {
        const stockNeeded = product.min_stock - product.stock
        const price = formatCurrency(product.price, currentCurrency, language)
        const purchasePrice = product.purchase_price
          ? formatCurrency(product.purchase_price, currentCurrency, language)
          : "N/A"
        const categoryName = getCategoryName(product.category_id)
        const lastSaleDate = formatLastSaleDate(lastSaleDates[product.id])

        const row: any[] = []

        if (exportSettings.includeImages) {
          row.push("")
        }

        if (selectedColumns.includes("name")) row.push(product.name)
        if (selectedColumns.includes("category")) row.push(categoryName)
        if (selectedColumns.includes("barcode")) row.push(product.barcode || "N/A")
        if (selectedColumns.includes("price")) row.push(price)
        if (selectedColumns.includes("purchasePrice")) row.push(purchasePrice)
        if (selectedColumns.includes("currentStock")) row.push(product.stock.toString())
        if (selectedColumns.includes("minStock")) row.push(product.min_stock.toString())
        if (selectedColumns.includes("stockNeeded")) row.push(stockNeeded.toString())
        if (selectedColumns.includes("lastSaleDate")) row.push(lastSaleDate)

        return row
      })

      if (exportSettings.includeImages) {
        headers.unshift("Image")
      }

      const preloadImages = async (products: Product[]) => {
        const imagePromises = products
          .filter((product) => product.image && exportSettings.includeImages)
          .map(async (product) => {
            if (!product.image) return

            try {
              const img = await preloadImage(product.image)
              // Don't pre-scale the image - we'll scale it when drawing
              const canvas = document.createElement("canvas")
              canvas.width = img.naturalWidth
              canvas.height = img.naturalHeight
              const ctx = canvas.getContext("2d")
              if (!ctx) throw new Error("Could not get canvas context")

              ctx.fillStyle = "#FFFFFF"
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0)

              const base64 = canvas.toDataURL("image/jpeg", 0.95)
              // @ts-ignore
              product._imageBase64 = base64
              // @ts-ignore - Store original dimensions for proper scaling
              product._imageWidth = img.naturalWidth
              // @ts-ignore
              product._imageHeight = img.naturalHeight
            } catch (error) {
              console.error(`Error processing image for product ${product.name}:`, error)
            }
          })

        await Promise.all(imagePromises)
      }

      if (exportSettings.includeImages) {
        await preloadImages(productsToInclude)
      }

      const tableOptions = {
        head: [headers],
        body: tableRows,
        startY: exportSettings.includeHeader ? 40 : 15,
        theme: "striped" as const,
        headStyles: {
          fillColor: [41, 128, 185] as [number, number, number],
          textColor: [255, 255, 255] as [number, number, number],
          fontStyle: "bold" as const,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245] as [number, number, number],
        },
        didDrawCell: (data: any) => {
          // Add debugging to see if this callback is even being called
          console.log("didDrawCell called:", {
            columnIndex: data.column.index,
            rowIndex: data.row.index,
            section: data.section,
            includeImages: exportSettings.includeImages,
          })

          if (
            exportSettings.includeImages &&
            data.column.index === 0 &&
            data.row.index >= 0 &&
            data.section === "body"
          ) {
            console.log("Processing image cell!")
            const product = productsToInclude[data.row.index]
            console.log("Product:", product?.name)

            // @ts-ignore
            if (product && product._imageBase64) {
              console.log("Found image data for product:", product.name)
              try {
                const cellWidth = data.cell.width
                const cellHeight = data.cell.height
                console.log("Cell dimensions:", { cellWidth, cellHeight })

                // Use the exportSettings.imageSize to calculate the actual image size
                // Convert mm to points (1mm = 2.83465 points) and use as percentage of cell
                const sizeInPoints = exportSettings.imageSize * 2.83465
                const maxCellSize = Math.min(cellWidth, cellHeight)
                const imageSize = Math.min(sizeInPoints, maxCellSize * 0.95)

                console.log("Image size calculation:", {
                  settingMM: exportSettings.imageSize,
                  sizeInPoints,
                  maxCellSize,
                  finalImageSize: imageSize,
                })

                // Center the image in the cell
                const xPos = data.cell.x + (cellWidth - imageSize) / 2
                const yPos = data.cell.y + (cellHeight - imageSize) / 2
                console.log("Image position:", { xPos, yPos })

                // Draw the image
                doc.addImage(
                  // @ts-ignore
                  product._imageBase64,
                  "JPEG",
                  xPos,
                  yPos,
                  imageSize,
                  imageSize,
                )
                console.log("Image added successfully!")
              } catch (err) {
                console.error("Error adding image to PDF:", err)
              }
            } else {
              console.log("No image data found for product:", product?.name)
              // Draw a placeholder that also respects the size setting
              const cellWidth = data.cell.width
              const cellHeight = data.cell.height
              const sizeInPoints = exportSettings.imageSize * 2.83465
              const maxCellSize = Math.min(cellWidth, cellHeight)
              const size = Math.min(sizeInPoints, maxCellSize * 0.95)
              const xPos = data.cell.x + (cellWidth - size) / 2
              const yPos = data.cell.y + (cellHeight - size) / 2

              doc.setFillColor(200, 200, 200) // Gray
              doc.rect(xPos, yPos, size, size, "F")
              doc.setTextColor(100, 100, 100) // Dark gray text
              doc.setFontSize(Math.max(6, size / 10))
              doc.text("NO IMG", data.cell.x + cellWidth / 2, data.cell.y + cellHeight / 2, {
                align: "center",
                baseline: "middle",
              })
              console.log("Drew placeholder rectangle")
            }
          }
        },
        margin: { top: 20 },
        columnStyles: {
          // Make the image column size much more efficient - minimal padding for small images
          0: exportSettings.includeImages
            ? {
                cellWidth: Math.max(exportSettings.imageSize + 3, 15), // Minimal 3mm padding, minimum 15mm
              }
            : {},
        },
        // Make row height much more efficient - only add minimal padding
        styles: {
          minCellHeight: exportSettings.includeImages ? Math.max(exportSettings.imageSize + 3, 12) : 8,
          cellPadding: exportSettings.includeImages ? 1.5 : 3, // Reduce cell padding for image rows
        },
      }

      autoTable(doc, tableOptions)

      if (exportSettings.includeFooter) {
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          doc.setFontSize(8)
          const pageWidth = doc.internal.pageSize.getWidth()
          doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, {
            align: "center",
          })
        }
      }

      doc.save(`low_stock_report_${new Date().toISOString().split("T")[0]}.pdf`)

      toast({
        title: "Export Successful",
        description: `${productsToInclude.length} products exported to PDF (${exportSettings.pdfFormat.toUpperCase()} ${exportSettings.pdfOrientation})`,
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

  // Calculate statistics
  const totalLowStockProducts = filteredProducts.length
  const criticalStockProducts = filteredProducts.filter((p) => p.stock === 0).length
  const totalStockNeeded = filteredProducts.reduce((sum, p) => sum + Math.max(0, p.min_stock - p.stock), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Edit className="w-5 h-5" />
              {getTranslation("adjust_product")}
            </DialogTitle>
            <DialogDescription className="text-base">
              {selectedProduct ? `Update details for ${selectedProduct.name}` : "Update product details"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="stock" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="stock" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="stock" className="text-right font-medium">
                    Current Stock
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

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="min-stock" className="text-right font-medium">
                    Min Stock
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
                      <p className="text-xs text-amber-500 mt-1">Warning: Stock is below minimum level</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right font-medium">
                    Selling Price
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
                      placeholder="Enter selling price"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="purchase-price" className="text-right">
                    Purchase Price
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="purchase-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedPurchasePrice !== null ? editedPurchasePrice : ""}
                      onChange={(e) =>
                        setEditedPurchasePrice(e.target.value ? Number.parseFloat(e.target.value) : null)
                      }
                      className="w-full"
                      placeholder="Enter purchase price"
                    />
                  </div>
                </div>

                {editedPrice !== null && editedPurchasePrice !== null && editedPurchasePrice > 0 && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Profit Margin</Label>
                    <div className="col-span-3">
                      <Badge variant={editedPrice > editedPurchasePrice ? "default" : "destructive"}>
                        {editedPrice > editedPurchasePrice
                          ? `${(((editedPrice - editedPurchasePrice) / editedPrice) * 100).toFixed(2)}%`
                          : "Loss"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="product-name" className="text-right font-medium">
                    Product Name
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="product-name"
                      type="text"
                      value={editedProductName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedProductName(e.target.value)}
                      className="w-full font-medium"
                      placeholder="Enter product name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right font-medium">
                    Category
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

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="barcode" className="text-right font-medium">
                    Barcode
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

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="image" className="text-right font-medium">
                    Image URL
                  </Label>
                  <div className="col-span-3">
                    <div className="flex flex-col gap-2">
                      {editedImageUrl && (
                        <div className="relative w-16 h-16 mb-2 mx-auto">
                          <img
                            src={editedImageUrl || "/placeholder.svg?height=200&width=200"}
                            alt="Product preview"
                            className="w-full h-full object-cover rounded-md"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=200&width=200"
                              e.currentTarget.onerror = null
                            }}
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
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockAdjustment} disabled={isAdjusting}>
              {isAdjusting ? (
                <>
                  <Loader2 className={`${rtlEnabled ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} />
                  Saving...
                </>
              ) : (
                <>
                  <Save className={`${rtlEnabled ? "ml-2" : "mr-2"} h-4 w-4`} />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Settings Dialog */}
      <ExportSettingsDialog
        open={isExportSettingsOpen}
        onOpenChange={setIsExportSettingsOpen}
        settings={exportSettings}
        onSettingsChange={setExportSettings}
        onExport={(type) => {
          if (type === "csv") {
            exportToCSV()
          } else {
            exportToPDF()
          }
        }}
        isExporting={isExporting}
        isExportingPDF={isExportingPDF}
      />

      {/* Barcode Dialog */}
      <Dialog open={isBarcodeDialogOpen} onOpenChange={setIsBarcodeDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Package className="w-5 h-5" />
              Product Barcode
            </DialogTitle>
            <DialogDescription className="text-base">
              {selectedBarcode.name ? `Barcode for ${selectedBarcode.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="barcode" className="text-right font-medium">
                Barcode
              </Label>
              <div className="col-span-3">
                <Input
                  id="barcode"
                  type="text"
                  value={selectedBarcode.barcode || "No barcode"}
                  readOnly
                  className="w-full font-medium"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBarcodeDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Column Settings Dialog */}
      <TableColumnSettingsDialog
        open={isTableSettingsOpen}
        onOpenChange={setIsTableSettingsOpen}
        settings={tableColumnSettings}
        onSettingsChange={setTableColumnSettings}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                Low Stock Alerts
              </h1>
              <p className="text-muted-foreground text-lg">
                Monitor and manage products that are running low on inventory
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  fetchLowStockProducts()
                  fetchLastSaleDates()
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <ViewSelector viewMode={viewMode} onViewModeChange={setViewMode} />
              {viewMode === "table" && (
                <Button variant="outline" size="sm" onClick={() => setIsTableSettingsOpen(true)} title="Table Settings">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Low Stock</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{totalLowStockProducts}</div>
                <p className="text-xs text-muted-foreground">Products below minimum</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{criticalStockProducts}</div>
                <p className="text-xs text-muted-foreground">Out of stock items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Units Needed</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStockNeeded}</div>
                <p className="text-xs text-muted-foreground">Total units to restock</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-xs text-muted-foreground">Product categories</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters and Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters & Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search and Filter */}
              <div className="flex-1 space-y-4 lg:space-y-0 lg:flex lg:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    type="search"
                    placeholder="Search products by name or barcode..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={handleSearch}
                  />
                </div>

                <div className="flex gap-2">
                  <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
                    <SelectTrigger className="w-full lg:w-[200px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="5000">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Export Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openExportSettings("csv")} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  CSV
                </Button>

                <Button variant="outline" onClick={() => openExportSettings("pdf")} disabled={isExportingPDF}>
                  {isExportingPDF ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Display */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Package className="w-12 h-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">No Low Stock Products</h3>
                <p className="text-muted-foreground">
                  {searchTerm || categoryFilter !== "all"
                    ? "No products match your current filters"
                    : "All products are adequately stocked"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Products Grid/List */}
            {viewMode === "split" ? (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ProductCardView
                    products={getPaginatedProducts()}
                    lastSaleDates={lastSaleDates}
                    formatLastSaleDate={formatLastSaleDate}
                    getCategoryName={getCategoryName}
                    currency={currentCurrency}
                    language={language}
                    onAdjust={handleAdjustClick}
                    onRestock={handleRestock}
                    selectedProductId={selectedProductId}
                    onSelectProduct={setSelectedProductId}
                  />
                </div>
                <div className="lg:col-span-1">
                  <ProductDetailView
                    product={
                      selectedProductId ? filteredProducts.find((p) => p.id === selectedProductId) || null : null
                    }
                    lastSaleDate={selectedProductId ? lastSaleDates[selectedProductId] : undefined}
                    formatLastSaleDate={formatLastSaleDate}
                    getCategoryName={getCategoryName}
                    currency={currentCurrency}
                    language={language}
                    onAdjust={handleAdjustClick}
                    onRestock={handleRestock}
                  />
                </div>
              </div>
            ) : viewMode === "table" ? (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          {tableColumnSettings.image && <th className="text-left p-4 font-medium">Image</th>}
                          {tableColumnSettings.name && <th className="text-left p-4 font-medium">Product</th>}
                          {tableColumnSettings.category && <th className="text-left p-4 font-medium">Category</th>}
                          {tableColumnSettings.barcode && <th className="text-left p-4 font-medium">Barcode</th>}
                          {tableColumnSettings.price && <th className="text-left p-4 font-medium">Price</th>}
                          {tableColumnSettings.purchasePrice && <th className="text-left p-4 font-medium">Cost</th>}
                          {tableColumnSettings.stock && <th className="text-left p-4 font-medium">Stock</th>}
                          {tableColumnSettings.needed && <th className="text-left p-4 font-medium">Needed</th>}
                          {tableColumnSettings.lastSale && <th className="text-left p-4 font-medium">Last Sale</th>}
                          {tableColumnSettings.actions && <th className="text-right p-4 font-medium">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {getPaginatedProducts().map((product) => {
                          const stockNeeded = product.min_stock - product.stock
                          return (
                            <tr key={product.id} className="border-b hover:bg-muted/30">
                              {tableColumnSettings.image && (
                                <td className="p-4">
                                  <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden">
                                    <img
                                      src={
                                        product.image
                                          ? getProxiedImageUrl(product.image)
                                          : "/placeholder.svg?height=40&width=40"
                                      }
                                      alt={product.name}
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        e.currentTarget.src = "/placeholder.svg?height=40&width=40"
                                        e.currentTarget.onerror = null
                                      }}
                                    />
                                  </div>
                                </td>
                              )}
                              {tableColumnSettings.name && (
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    {!tableColumnSettings.image && (
                                      <div className="w-8 h-8 bg-muted rounded-lg overflow-hidden">
                                        <img
                                          src={
                                            product.image
                                              ? getProxiedImageUrl(product.image)
                                              : "/placeholder.svg?height=32&width=32"
                                          }
                                          alt={product.name}
                                          className="w-full h-full object-contain"
                                          onError={(e) => {
                                            e.currentTarget.src = "/placeholder.svg?height=32&width=32"
                                            e.currentTarget.onerror = null
                                          }}
                                        />
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-medium">{product.name}</div>
                                      {!tableColumnSettings.barcode && product.barcode && (
                                        <div className="text-xs text-muted-foreground">{product.barcode}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              )}
                              {tableColumnSettings.category && (
                                <td className="p-4 text-sm">{getCategoryName(product.category_id)}</td>
                              )}
                              {tableColumnSettings.barcode && (
                                <td className="p-4 text-sm font-mono">{product.barcode || "N/A"}</td>
                              )}
                              {tableColumnSettings.price && (
                                <td className="p-4 font-medium">
                                  {formatCurrency(product.price, currentCurrency, language)}
                                </td>
                              )}
                              {tableColumnSettings.purchasePrice && (
                                <td className="p-4 text-sm">
                                  {product.purchase_price
                                    ? formatCurrency(product.purchase_price, currentCurrency, language)
                                    : "N/A"}
                                </td>
                              )}
                              {tableColumnSettings.stock && (
                                <td className="p-4">
                                  <div className="text-sm">
                                    <span className="font-medium">{product.stock}</span>
                                    <span className="text-muted-foreground">/{product.min_stock}</span>
                                  </div>
                                </td>
                              )}
                              {tableColumnSettings.needed && (
                                <td className="p-4">
                                  {stockNeeded > 0 ? (
                                    <Badge variant="destructive">{stockNeeded}</Badge>
                                  ) : (
                                    <Badge variant="default">✓</Badge>
                                  )}
                                </td>
                              )}
                              {tableColumnSettings.lastSale && (
                                <td className="p-4 text-sm text-muted-foreground">
                                  {formatLastSaleDate(lastSaleDates[product.id])}
                                </td>
                              )}
                              {tableColumnSettings.actions && (
                                <td className="p-4">
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleAdjustClick(product)}>
                                      <Edit className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => handleRestock(product)}>
                                      <RotateCcw className="w-3 h-3 mr-1" />
                                      Restock
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ProductCardView
                products={getPaginatedProducts()}
                lastSaleDates={lastSaleDates}
                formatLastSaleDate={formatLastSaleDate}
                getCategoryName={getCategoryName}
                currency={currentCurrency}
                language={language}
                onAdjust={handleAdjustClick}
                onRestock={handleRestock}
                selectedProductId={selectedProductId}
                onSelectProduct={setSelectedProductId}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Card>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                    {Math.min(currentPage * pageSize, filteredProducts.length)} of {filteredProducts.length} products
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AlertsPage
