"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getProducts, addProduct, updateProduct, deleteProduct, getCategories, addCategory } from "@/lib/supabase"
import {
  Loader2,
  Search,
  Plus,
  Package,
  Barcode,
  Pencil,
  Trash2,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FolderPlus,
  RefreshCw,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MobileCameraScanner } from "@/components/inventory/mobile-camera-scanner"
import { useLanguage } from "@/hooks/use-language"
import { formatCurrency } from "@/lib/format-currency"
import { supabase } from "@/lib/supabaseClient"

// Define the Product type to match the database schema
type Product = {
  id: string
  name: string
  price: number
  barcode: string
  stock: number
  min_stock: number
  image: string | null
  category_id: string | null
  purchase_price: number | null
  created_at?: string | null
}

// Define the Category type
type Category = {
  id: string
  name: string
}

// Define the form data type
interface FormDataState {
  name: string
  price: string
  barcode: string
  stock: string
  min_stock: string
  image: string
  category_id: string
  purchase_price: string
}

// Function to generate a unique EAN-13 barcode
function generateEAN13Barcode(): string {
  // Start with a prefix (e.g., 200 for in-store products)
  const prefix = "200"

  // Add timestamp component (last 6 digits of current timestamp)
  const timestamp = Date.now().toString().slice(-6)

  // Add 3 random digits
  const randomDigits = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")

  // Combine to form the first 12 digits
  const digits = prefix + timestamp + randomDigits

  // Calculate check digit (EAN-13 algorithm)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number.parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10

  // Return complete EAN-13 barcode
  return digits + checkDigit
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isBarcodePreviewOpen, setIsBarcodePreviewOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<FormDataState>({
    name: "",
    price: "",
    barcode: "",
    stock: "",
    min_stock: "5",
    image: "",
    category_id: "",
    purchase_price: "",
  })

  // Category state
  const [categories, setCategories] = useState<Category[]>([])
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isSavingCategory, setIsSavingCategory] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [totalPages, setTotalPages] = useState(1)
  const [paginatedProducts, setPaginatedProducts] = useState<Product[]>([])

  // Add this with the other state declarations
  const [settings, setSettings] = useState({
    currency: "USD",
    tax_rate: 0,
    store_name: "My Store",
  })

  // Add this with the other state declarations
  const [currentCurrency, setCurrentCurrency] = useState<string>("USD")

  const { toast } = useToast()
  const printFrameRef = useRef<HTMLIFrameElement>(null)
  const barcodePreviewRef = useRef<HTMLDivElement>(null)
  const { getAppTranslation, language, isRTL } = useLanguage()

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updatePaginatedProducts = useCallback(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    setPaginatedProducts(filteredProducts.slice(startIndex, endIndex))
  }, [currentPage, pageSize, filteredProducts])

  // Filter products when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts(products)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = products.filter(
        (product) => product.name.toLowerCase().includes(term) || product.barcode.toLowerCase().includes(term),
      )
      setFilteredProducts(filtered)
    }
    // Reset to first page when search changes
    setCurrentPage(1)
  }, [searchTerm, products])

  // Update pagination when filtered products change
  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredProducts.length / pageSize)))
    updatePaginatedProducts()
  }, [filteredProducts, pageSize, currentPage, updatePaginatedProducts])

  // Add this after other useCallback functions
  const fetchSettings = useCallback(async () => {
    try {
      // First try to get global settings
      let { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("*")
        .eq("type", "global")
        .single()

      // If no global settings, try system settings
      if (settingsError || !settingsData) {
        const { data: systemData, error: systemError } = await supabase
          .from("settings")
          .select("*")
          .eq("type", "system")
          .single()

        if (!systemError && systemData) {
          settingsData = systemData
          settingsError = null
        }
      }

      if (!settingsError && settingsData) {
        console.log("Loaded settings:", settingsData)

        // First check if settings.settings exists and has currency
        let currencyValue = "USD"
        let taxRateValue = 0

        if (settingsData.settings && typeof settingsData.settings === "object" && settingsData.settings !== null) {
          // Check for currency in settings.settings
          if ("currency" in settingsData.settings && typeof settingsData.settings.currency === "string") {
            currencyValue = settingsData.settings.currency
          }

          // Check for taxRate in settings.settings
          if ("taxRate" in settingsData.settings && typeof settingsData.settings.taxRate === "number") {
            taxRateValue = settingsData.settings.taxRate
          }
        }

        // Fallback to top-level currency field if it exists
        if (settingsData.currency && typeof settingsData.currency === "string") {
          currencyValue = settingsData.currency
        }

        // Fallback to top-level tax_rate field if it exists
        if (typeof settingsData.tax_rate === "number") {
          taxRateValue = settingsData.tax_rate
        }

        setSettings({
          currency: currencyValue,
          tax_rate: taxRateValue,
          store_name: settingsData.store_name || "My Store",
        })
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    }
  }, [supabase])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      const productsData = await getProducts()

      // Ensure all products have the required fields and proper data types
      const productsArray = Array.isArray(productsData)
        ? productsData.map((product) => ({
            ...product,
            // Ensure numeric values are properly typed
            price: typeof product.price === "number" ? product.price : Number.parseFloat(String(product.price)) || 0,
            stock: typeof product.stock === "number" ? product.stock : Number.parseInt(String(product.stock), 10) || 0,
            min_stock:
              typeof product.min_stock === "number"
                ? product.min_stock
                : Number.parseInt(String(product.min_stock), 10) || 0,
            purchase_price: product.purchase_price
              ? typeof product.purchase_price === "number"
                ? product.purchase_price
                : Number.parseFloat(String(product.purchase_price)) || null
              : null,
          }))
        : []

      setProducts(productsArray)
      setFilteredProducts(productsArray)
    } catch (error) {
      console.error("Error loading products:", error)
      toast({
        title: getAppTranslation("error"),
        description: getAppTranslation("failed_to_load_products"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const refreshProducts = async () => {
    setIsRefreshing(true)
    await loadProducts()
  }

  const loadCategories = async () => {
    try {
      const categoriesData = await getCategories()
      setCategories(categoriesData as Category[])
    } catch (error) {
      console.error("Error loading categories:", error)
      toast({
        title: getAppTranslation("error"),
        description: getAppTranslation("failed_to_load_categories"),
        variant: "destructive",
      })
    }
  }

  // Add this after other useEffect hooks
  useEffect(() => {
    // Function to fetch currency setting
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

    fetchCurrency()

    // Listen for storage events (triggered when settings are updated)
    const handleStorageChange = () => {
      fetchCurrency()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("focus", fetchCurrency)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", fetchCurrency)
    }
  }, [supabase])

  // Add this after other useEffect hooks
  useEffect(() => {
    fetchSettings()

    // Listen for storage events (which we trigger when settings are updated)
    const handleStorageChange = () => {
      console.log("Storage event detected, refreshing settings")
      fetchSettings()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("focus", fetchSettings)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", fetchSettings)
    }
  }, [fetchSettings])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleGenerateBarcode = () => {
    const newBarcode = generateEAN13Barcode()
    setFormData((prev) => ({
      ...prev,
      barcode: newBarcode,
    }))

    toast({
      title: getAppTranslation("barcode_generated"),
      description: `${getAppTranslation("new_barcode")}: ${newBarcode}`,
    })
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await addProduct(formData)

      // Reset form and close dialog
      setFormData({
        name: "",
        price: "",
        barcode: "",
        stock: "",
        min_stock: "0",
        image: "",
        category_id: "",
        purchase_price: "",
      })
      setIsAddDialogOpen(false)

      // Refresh products list
      await loadProducts()

      toast({
        title: getAppTranslation("product_added"),
        description: getAppTranslation("product_added_successfully"),
      })
    } catch (error) {
      console.error("Error adding product:", error)
      toast({
        title: getAppTranslation("error"),
        description: getAppTranslation("failed_to_add_product"),
        variant: "destructive",
      })
    }
  }

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      barcode: product.barcode,
      stock: product.stock.toString(),
      min_stock: product.min_stock.toString(),
      image: product.image || "",
      category_id: product.category_id || "",
      purchase_price: product.purchase_price?.toString() || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return

    try {
      // Ensure numeric values are properly converted
      const processedFormData = {
        ...formData,
        stock: formData.stock.trim() ? Number.parseInt(formData.stock, 10) : 0,
        min_stock: formData.min_stock.trim() ? Number.parseInt(formData.min_stock, 10) : 0,
        price: formData.price.trim() ? Number.parseFloat(formData.price) : 0,
        purchase_price: formData.purchase_price.trim() ? Number.parseFloat(formData.purchase_price) : null,
      }

      await updateProduct(selectedProduct.id, formData)
      setIsEditDialogOpen(false)

      // Force a complete refresh of products after update
      await loadProducts()

      toast({
        title: getAppTranslation("product_updated"),
        description: getAppTranslation("product_updated_successfully"),
      })
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: getAppTranslation("error"),
        description: getAppTranslation("failed_to_update_product"),
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return

    try {
      await deleteProduct(selectedProduct.id)
      setIsDeleteDialogOpen(false)
      await loadProducts()

      toast({
        title: getAppTranslation("product_deleted"),
        description: getAppTranslation("product_deleted_successfully"),
      })
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: getAppTranslation("error"),
        description: getAppTranslation("failed_to_delete_product"),
        variant: "destructive",
      })
    }
  }

  const handleBarcodePreviewClick = (product: Product) => {
    setSelectedProduct(product)
    setIsBarcodePreviewOpen(true)
  }

  const handlePrintBarcode = () => {
    if (!selectedProduct) return

    // Create a printable document with the barcode
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${getAppTranslation("barcode")}: ${selectedProduct.barcode}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .barcode-container {
            text-align: center;
            margin: 20px auto;
            page-break-inside: avoid;
          }
          .product-name {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .barcode {
            font-family: 'Libre Barcode 39', cursive;
            font-size: 60px;
            margin: 10px 0;
          }
          .barcode-number {
            font-size: 12px;
            letter-spacing: 3px;
          }
          .price {
            font-size: 16px;
            font-weight: bold;
            margin-top: 5px;
          }
          @media print {
            @page {
              size: 2.25in 1.25in;
              margin: 0;
            }
            body {
              padding: 0.125in;
            }
          }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
      </head>
      <body>
        <div class="barcode-container">
          <div class="product-name">${selectedProduct.name}</div>
          <div class="barcode">*${selectedProduct.barcode}*</div>
          <div class="barcode-number">${selectedProduct.barcode}</div>
          <div class="price">${formatCurrency(selectedProduct.price, currentCurrency, language)}</div>
        </div>
      </body>
      </html>
    `

    // Use an iframe for printing
    if (printFrameRef.current) {
      const iframe = printFrameRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write(printContent)
        iframeDoc.close()

        // Wait for content to load before printing
        setTimeout(() => {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        }, 500)
      }
    }

    // Close the preview dialog
    setIsBarcodePreviewOpen(false)

    toast({
      title: getAppTranslation("printing_barcode"),
      description: `${getAppTranslation("barcode_for")} ${selectedProduct.name} ${getAppTranslation("sent_to_printer")}.`,
    })
  }

  // Handle adding a new category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newCategoryName.trim()) {
      toast({
        title: getAppTranslation("validation_error"),
        description: getAppTranslation("please_enter_category_name"),
        variant: "destructive",
      })
      return
    }

    setIsSavingCategory(true)

    try {
      const newCategory = await addCategory(newCategoryName)

      // Refresh categories
      await loadCategories()

      // Reset form and close dialog
      setNewCategoryName("")
      setIsAddCategoryDialogOpen(false)

      // Set the newly created category as the selected one in the product form
      if (newCategory && newCategory.id) {
        setFormData((prev) => ({
          ...prev,
          category_id: newCategory.id,
        }))
      }

      toast({
        title: getAppTranslation("category_added"),
        description: getAppTranslation("category_added_successfully"),
      })
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: getAppTranslation("error"),
        description: getAppTranslation("failed_to_add_category"),
        variant: "destructive",
      })
    } finally {
      setIsSavingCategory(false)
    }
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number.parseInt(value))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Hidden iframe for printing */}
      <iframe ref={printFrameRef} style={{ display: "none" }} title="Print Frame"></iframe>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">{getAppTranslation("inventory")}</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className={`absolute ${isRTL ? "right-2" : "left-2"} top-2.5 h-4 w-4 text-muted-foreground`} />
            <Input
              placeholder={getAppTranslation("search_by_name_or_barcode")}
              className={isRTL ? "pr-8" : "pl-8"}
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <Button variant="outline" onClick={refreshProducts} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4`} />
                {getAppTranslation("add_product")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{getAppTranslation("add_new_product")}</DialogTitle>
                <DialogDescription>{getAppTranslation("add_product_description")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddProduct}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      {getAppTranslation("name")}
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="barcode" className="text-right">
                      {getAppTranslation("barcode")}
                    </Label>
                    <div className="col-span-3 flex gap-2">
                      <Input
                        id="barcode"
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleFormChange}
                        className="flex-1"
                        required
                      />
                      <Button type="button" variant="outline" onClick={handleGenerateBarcode} size="sm">
                        <Barcode className={`h-4 w-4 ${isRTL ? "ml-1" : "mr-1"}`} />
                        {getAppTranslation("generate")}
                      </Button>
                      <MobileCameraScanner
                        onBarcodeDetected={(barcode: string) => {
                          setFormData((prev) => ({
                            ...prev,
                            barcode: barcode,
                          }))
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">
                      {getAppTranslation("price")}
                    </Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={handleFormChange}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="purchase_price" className="text-right">
                      {getAppTranslation("purchase_price")}
                    </Label>
                    <Input
                      id="purchase_price"
                      name="purchase_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.purchase_price}
                      onChange={handleFormChange}
                      className="col-span-3"
                      placeholder={getAppTranslation("optional")}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="stock" className="text-right">
                      {getAppTranslation("stock")}
                    </Label>
                    <Input
                      id="stock"
                      name="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={handleFormChange}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="min_stock" className="text-right">
                      {getAppTranslation("min_stock")}
                    </Label>
                    <Input
                      id="min_stock"
                      name="min_stock"
                      type="number"
                      min="0"
                      value={formData.min_stock ?? 5}
                      onChange={handleFormChange}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="image" className="text-right">
                      {getAppTranslation("image_url")}
                    </Label>
                    <Input
                      id="image"
                      name="image"
                      type="url"
                      value={formData.image}
                      onChange={handleFormChange}
                      className="col-span-3"
                      placeholder={getAppTranslation("optional")}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category_id" className="text-right">
                      {getAppTranslation("category")}
                    </Label>
                    <div className="col-span-3 flex gap-2">
                      <Select
                        name="category_id"
                        value={formData.category_id}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={getAppTranslation("select_category_optional")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{getAppTranslation("none")}</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsAddCategoryDialogOpen(true)}
                        title={getAppTranslation("add_new_category")}
                      >
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    {getAppTranslation("cancel")}
                  </Button>
                  <Button type="submit">{getAppTranslation("add_product")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">{getAppTranslation("no_products_found")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{getAppTranslation("products")}</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="pageSize">{getAppTranslation("show")}</Label>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger id="pageSize" className="w-[80px]">
                  <SelectValue placeholder={pageSize.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{getAppTranslation("entries")}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">{getAppTranslation("image")}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">{getAppTranslation("name")}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">{getAppTranslation("barcode")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">{getAppTranslation("price")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">{getAppTranslation("purchase_price")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">{getAppTranslation("stock")}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">{getAppTranslation("min_stock")}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">{getAppTranslation("category")}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">{getAppTranslation("created_at")}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">{getAppTranslation("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3">
                        <div className="h-10 w-10 relative rounded-md overflow-hidden bg-muted">
                          {product.image ? (
                            <Image
                              src={product.image || "/placeholder.svg"}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-sm">{product.barcode}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatCurrency(product.price, currentCurrency, language)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {product.purchase_price
                          ? formatCurrency(product.purchase_price, currentCurrency, language)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{product.stock}</td>
                      <td className="px-4 py-3 text-sm text-right">{product.min_stock}</td>
                      <td className="px-4 py-3 text-sm">
                        {product.category_id ? categories.find((c) => c.id === product.category_id)?.name || "-" : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {product.created_at ? format(new Date(product.created_at), "PPp") : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(product)}
                            title={getAppTranslation("edit_product")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(product)}
                            title={getAppTranslation("delete_product")}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleBarcodePreviewClick(product)}
                            title={getAppTranslation("print_barcode")}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {getAppTranslation("showing")} {Math.min(filteredProducts.length, (currentPage - 1) * pageSize + 1)}{" "}
                {getAppTranslation("to")} {Math.min(filteredProducts.length, currentPage * pageSize)}{" "}
                {getAppTranslation("of")} {filteredProducts.length} {getAppTranslation("entries")}
              </div>
              <div className="flex items-center space-x-2">
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
                <span className="text-sm">
                  {getAppTranslation("page")} {currentPage} {getAppTranslation("of")} {totalPages}
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
          </CardContent>
        </Card>
      )}

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("edit_product")}</DialogTitle>
            <DialogDescription>{getAppTranslation("edit_product_description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProduct}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  {getAppTranslation("name")}
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-barcode" className="text-right">
                  {getAppTranslation("barcode")}
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="edit-barcode"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleFormChange}
                    className="flex-1"
                    required
                  />
                  <Button type="button" variant="outline" onClick={handleGenerateBarcode} size="sm">
                    <Barcode className={`h-4 w-4 ${isRTL ? "ml-1" : "mr-1"}`} />
                    {getAppTranslation("generate")}
                  </Button>
                  <MobileCameraScanner
                    onBarcodeDetected={(barcode: string) => {
                      setFormData((prev) => ({
                        ...prev,
                        barcode: barcode,
                      }))
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-price" className="text-right">
                  {getAppTranslation("price")}
                </Label>
                <Input
                  id="edit-price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-purchase_price" className="text-right">
                  {getAppTranslation("purchase_price")}
                </Label>
                <Input
                  id="edit-purchase_price"
                  name="purchase_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchase_price}
                  onChange={handleFormChange}
                  className="col-span-3"
                  placeholder={getAppTranslation("optional")}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-stock" className="text-right">
                  {getAppTranslation("stock")}
                </Label>
                <Input
                  id="edit-stock"
                  name="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={handleFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-min_stock" className="text-right">
                  {getAppTranslation("min_stock")}
                </Label>
                <Input
                  id="edit-min_stock"
                  name="min_stock"
                  type="number"
                  min="0"
                  value={formData.min_stock}
                  onChange={handleFormChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-image" className="text-right">
                  {getAppTranslation("image_url")}
                </Label>
                <Input
                  id="edit-image"
                  name="image"
                  type="url"
                  value={formData.image}
                  onChange={handleFormChange}
                  className="col-span-3"
                  placeholder={getAppTranslation("optional")}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category_id" className="text-right">
                  {getAppTranslation("category")}
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Select
                    name="category_id"
                    value={formData.category_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={getAppTranslation("select_category_optional")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{getAppTranslation("none")}</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsAddCategoryDialogOpen(true)}
                    title={getAppTranslation("add_new_category")}
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {getAppTranslation("cancel")}
              </Button>
              <Button type="submit">{getAppTranslation("save_changes")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getAppTranslation("are_you_sure")}</DialogTitle>
            <DialogDescription>
              {getAppTranslation("delete_product_confirmation")} &quot;{selectedProduct?.name}&quot;.{" "}
              {getAppTranslation("action_cannot_be_undone")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {getAppTranslation("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              {getAppTranslation("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("add_new_category")}</DialogTitle>
            <DialogDescription>{getAppTranslation("add_category_description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCategory}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category-name" className="text-right">
                  {getAppTranslation("name")}
                </Label>
                <Input
                  id="category-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="col-span-3"
                  placeholder={getAppTranslation("enter_category_name")}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)}>
                {getAppTranslation("cancel")}
              </Button>
              <Button type="submit" disabled={isSavingCategory}>
                {isSavingCategory ? (
                  <>
                    <Loader2 className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} />
                    {getAppTranslation("saving")}...
                  </>
                ) : (
                  getAppTranslation("add_category")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barcode Preview Dialog */}
      <Dialog open={isBarcodePreviewOpen} onOpenChange={setIsBarcodePreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("barcode_preview")}</DialogTitle>
            <DialogDescription>{getAppTranslation("barcode_preview_description")}</DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="py-4">
              <div ref={barcodePreviewRef} className="border rounded-md p-6 bg-white">
                <div className="text-center">
                  <div className="text-sm font-medium mb-2">{selectedProduct.name}</div>
                  <div className="flex justify-center mb-2">
                    {/* Display barcode image */}
                    <svg className="h-16" viewBox="0 0 200 100">
                      {/* Simple barcode visualization */}
                      <text x="100" y="40" fontFamily="'Libre Barcode 39', cursive" fontSize="60" textAnchor="middle">
                        *{selectedProduct.barcode}*
                      </text>
                    </svg>
                  </div>
                  <div className="text-xs tracking-wider mb-2">{selectedProduct.barcode}</div>
                  <div className="text-base font-bold">
                    {formatCurrency(selectedProduct.price, currentCurrency, language)}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setIsBarcodePreviewOpen(false)}>
                  {getAppTranslation("cancel")}
                </Button>
                <Button onClick={handlePrintBarcode}>
                  <Printer className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4`} />
                  {getAppTranslation("print_barcode")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

