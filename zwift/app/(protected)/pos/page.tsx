"use client"

import type React from "react"

import { DialogTrigger } from "@/components/ui/dialog"
import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import {
  Loader2,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Save,
  Barcode,
  Printer,
} from "lucide-react"
import { createSale, getLowStockProducts } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { useLanguage, isRTL } from "@/hooks/use-language"
import { getPOSTranslation } from "@/lib/pos-translations"
import { formatCurrency } from "@/lib/format-currency"

// Define types
type Product = {
  id: string
  name: string
  price: number
  barcode: string
  stock: number
  min_stock: number
  category_id?: string | null
  image?: string | null
  purchase_price?: number | null
}

type CartItem = {
  id: string
  product: Product
  quantity: number
  price: number
}

type Settings = {
  id: string
  tax_rate: number
  store_name: string
  currency: string
}

type CompletedSaleData = {
  id: string
  items: CartItem[]
  total: number
  tax: number
  subtotal: number
  payment_method: string
  date: string
}

const POSPage = () => {
  const { language, getTranslation } = useLanguage()
  const rtlEnabled = isRTL(language)

  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [editedStockLevels, setEditedStockLevels] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSavingStock, setIsSavingStock] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>("cash") // Default to cash
  const [showLowStockDialog, setShowLowStockDialog] = useState(false)
  const [autoAddOnBarcode, setAutoAddOnBarcode] = useState(true) // Auto-add feature enabled by default
  const [settings, setSettings] = useState<Settings>({
    id: "1",
    tax_rate: 0,
    store_name: "My Store",
    currency: "USD",
  })
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null)
  const [completedSaleData, setCompletedSaleData] = useState<CompletedSaleData | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null) // Ref for search input to focus after adding
  const receiptRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast() // Using the correct import
  const supabase = createClient()
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const barcodeBuffer = useRef<string>("")
  const lastKeyTime = useRef<number>(0)
  const processingBarcode = useRef<boolean>(false)

  // Track the last notification to prevent duplicates
  const lastNotificationRef = useRef<{ productId: string; timestamp: number }>({ productId: "", timestamp: 0 })

  // Add a new state for recently sold products after the other state declarations
  const [recentSales, setRecentSales] = useState<Product[]>([])
  const [viewingSaleDetails, setViewingSaleDetails] = useState<CompletedSaleData | null>(null)

  // Play beep sound when a product is added via barcode
  useEffect(() => {
    if (lastAddedProduct && autoAddOnBarcode) {
      try {
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        const audioContext = new AudioContextClass()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)

        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.3)
      } catch (e) {
        console.error("Audio play failed:", e)
      }

      // Reset the last added product
      setLastAddedProduct(null)
    }
  }, [lastAddedProduct, autoAddOnBarcode])

  // Global keyboard listener for barcode scanner
  useEffect(() => {
    if (!autoAddOnBarcode) return

    const BARCODE_SCAN_TIMEOUT = 100 // Increased timeout for more reliable scanning
    const MIN_BARCODE_LENGTH = 3 // Minimum barcode length to process

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if we're not in an input field (except our search input)
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" &&
        target !== searchInputRef.current &&
        !target.classList.contains("barcode-input")
      ) {
        return
      }

      const currentTime = new Date().getTime()

      // If there's a significant delay between keystrokes, reset the buffer
      if (currentTime - lastKeyTime.current > BARCODE_SCAN_TIMEOUT && barcodeBuffer.current.length > 0) {
        console.log("Resetting barcode buffer due to timeout")
        barcodeBuffer.current = ""
      }

      lastKeyTime.current = currentTime

      // Handle Enter key as the end of barcode input
      if (e.key === "Enter" && barcodeBuffer.current.length >= MIN_BARCODE_LENGTH) {
        e.preventDefault()

        if (processingBarcode.current) {
          console.log("Already processing a barcode, ignoring this one")
          return
        }

        processingBarcode.current = true
        console.log("Processing barcode from global listener:", barcodeBuffer.current)

        // Process the barcode
        const barcodeToProcess = barcodeBuffer.current
        barcodeBuffer.current = "" // Reset buffer immediately

        // Use setTimeout to ensure the UI is updated before processing
        setTimeout(() => {
          processBarcode(barcodeToProcess)
        }, 10)

        return
      }

      // Add character to buffer if it's a valid barcode character
      if (e.key.length === 1 && /[\w\d]/.test(e.key)) {
        barcodeBuffer.current += e.key
        console.log("Added to barcode buffer:", e.key, "Current buffer:", barcodeBuffer.current)
      }
    }

    // Add the global event listener
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [autoAddOnBarcode, products])

  // Process a barcode and add the product to cart
  const processBarcode = (barcode: string) => {
    console.log("Processing barcode:", barcode)

    try {
      if (!barcode || barcode.trim() === "") {
        console.log("Empty barcode, ignoring")
        return
      }

      const trimmedBarcode = barcode.trim()

      // Find the product with this barcode
      const exactBarcodeMatch = products.find(
        (product) => product.barcode && product.barcode.toLowerCase() === trimmedBarcode.toLowerCase(),
      )

      if (exactBarcodeMatch) {
        console.log("Found exact barcode match:", exactBarcodeMatch.name)

        // Add product to cart with notification
        const wasAdded = addToCart(exactBarcodeMatch, true)

        if (wasAdded) {
          console.log("Product added to cart successfully")

          // Set last added product for beep sound
          setLastAddedProduct(exactBarcodeMatch)

          // Clear search field and focus it for the next scan
          setSearchTerm("")
          if (searchInputRef.current) {
            searchInputRef.current.focus()
          }
        }
      } else {
        console.log("No product found with barcode:", trimmedBarcode)
        toast({
          title: "Product Not Found",
          description: `No product found with barcode: ${trimmedBarcode}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error processing barcode:", error)
    } finally {
      // Always reset the processing flag
      setTimeout(() => {
        processingBarcode.current = false
      }, 300)
    }
  }

  // Fetch products and settings
  const fetchData = useCallback(
    async (searchQuery = "") => {
      setIsLoading(true)
      try {
        // Build the query for products
        let query = supabase.from("products").select("*").order("name")

        // If there's a search query, filter on the server side
        if (searchQuery.trim() !== "") {
          // Use ilike for case-insensitive search
          query = query.or(`name.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`)
        } else {
          // If no search, just get all products for better barcode matching
          query = query.limit(1000)
        }

        const { data: productsData, error: productsError } = await query

        if (productsError) throw productsError

        // Rest of your existing code for settings...
        try {
          console.log("Fetching settings...")

          // Try to fetch global settings first
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
            setSettings({
              id: settingsData.id,
              tax_rate:
                settingsData.settings &&
                typeof settingsData.settings === "object" &&
                settingsData.settings !== null &&
                "taxRate" in settingsData.settings &&
                typeof settingsData.settings.taxRate === "number"
                  ? settingsData.settings.taxRate
                  : typeof settingsData.tax_rate === "number"
                    ? settingsData.tax_rate
                    : 0,
              store_name: settingsData.store_name || "My Store",
              currency:
                settingsData.currency && typeof settingsData.currency === "string"
                  ? settingsData.currency
                  : settingsData.settings &&
                      typeof settingsData.settings === "object" &&
                      settingsData.settings !== null &&
                      "currency" in settingsData.settings &&
                      typeof settingsData.settings.currency === "string"
                    ? settingsData.settings.currency
                    : "USD",
            })
          } else {
            console.error("Settings error or no data:", settingsError)
          }
        } catch (settingsError) {
          console.error("Error fetching settings:", settingsError)
          // Keep using default settings
        }

        // Set products state with proper typing
        if (productsData) {
          console.log("Loaded products:", productsData.length)
          setProducts(productsData as Product[])

          // If this was a search query, update filtered products too
          if (searchQuery.trim() !== "") {
            setFilteredProducts(productsData as Product[])
          } else {
            setFilteredProducts([])
          }
        }

        // Fetch low stock products
        const lowStock = await getLowStockProducts()
        setLowStockProducts(lowStock as Product[])

        // Initialize edited stock levels
        const initialStockLevels: Record<string, number> = {}
        lowStock.forEach((product: Product) => {
          initialStockLevels[product.id] = product.stock
        })
        setEditedStockLevels(initialStockLevels)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: getPOSTranslation("errorFetchingProducts", language),
          description: "Failed to load products",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [supabase, toast, language],
  )

  // Add this right after the fetchData function in your POS page
  useEffect(() => {
    // Debug effect to log low stock products
    console.log("Current lowStockProducts:", lowStockProducts)

    // Add a direct check to test the getLowStockProducts function
    const testLowStock = async () => {
      try {
        console.log("Testing getLowStockProducts function directly...")
        const lowStock = await getLowStockProducts()
        console.log("Direct test result:", lowStock)
      } catch (error) {
        console.error("Error testing getLowStockProducts:", error)
      }
    }

    testLowStock()
  }, [lowStockProducts])

  // Add a function to fetch recent sales after the fetchData function
  const fetchRecentSales = useCallback(async () => {
    try {
      // Fetch the 10 most recent sales with their items and products
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
        id, 
        created_at,
        sale_items(
          id,
          product_id,
          quantity,
          products(*)
        )
      `)
        .order("created_at", { ascending: false })
        .limit(10)

      if (salesError) throw salesError

      // Extract unique products from the sales data
      const recentProducts: Product[] = []
      const productIds = new Set<string>()

      // Define a proper type for sale_items
      interface SaleItem {
        id: string
        product_id: string
        quantity: number
        products: Product
      }

      salesData?.forEach((sale) => {
        if (sale.sale_items) {
          sale.sale_items.forEach((item: SaleItem) => {
            if (item.products && !productIds.has(item.products.id)) {
              productIds.add(item.products.id)
              recentProducts.push(item.products as Product)

              // Limit to 10 products
              if (recentProducts.length >= 10) {
                return
              }
            }
          })
        }
      })

      setRecentSales(recentProducts)
    } catch (error) {
      console.error("Error fetching recent sales:", error)
    }
  }, [supabase])

  // Update the useEffect to also call fetchRecentSales
  useEffect(() => {
    fetchData()
    fetchRecentSales()
  }, [fetchData, fetchRecentSales])

  // Define refreshSettings using useCallback so it can be used in multiple places
  const refreshSettings = useCallback(async () => {
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
        console.log("Refreshed settings:", settingsData)

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
          id: settingsData.id,
          tax_rate: taxRateValue,
          store_name: settingsData.store_name || "My Store",
          currency: currencyValue,
        })
      }
    } catch (error) {
      console.error("Error refreshing settings:", error)
    }
  }, [supabase])

  // Add this effect to refresh settings when the page gets focus
  useEffect(() => {
    // Refresh settings when the page gets focus
    window.addEventListener("focus", refreshSettings)

    // Initial refresh
    refreshSettings()

    // Cleanup
    return () => {
      window.removeEventListener("focus", refreshSettings)
    }
  }, [refreshSettings])

  // Listen for storage events (which we trigger when settings are updated)
  useEffect(() => {
    const handleStorageChange = () => {
      console.log("Storage event detected, refreshing settings")
      refreshSettings()
    }

    // Add event listener
    window.addEventListener("storage", handleStorageChange)

    // Clean up
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [refreshSettings])

  // Auto-focus the search input when the page loads
  useEffect(() => {
    // Short timeout to ensure the DOM is fully loaded
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
        console.log("Search input auto-focused")
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Filter products based on search term
  useEffect(() => {
    // We're now doing server-side filtering in fetchData, so this is only a backup
    if (searchTerm.trim() === "") {
      // When no search term, don't show any products in search results
      setFilteredProducts([])
    }
  }, [searchTerm])

  // Handle search input change with barcode auto-add functionality
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    // Debug log to help troubleshoot
    console.log("Search value:", value, "Auto-add enabled:", autoAddOnBarcode)

    // If auto-add is enabled, check for exact barcode match
    if (autoAddOnBarcode && value.trim() !== "") {
      // Clear any pending search timeout
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
        searchTimeout.current = null
      }

      // Check if this might be a barcode (typically barcodes are numeric or alphanumeric)
      const mightBeBarcode = /^[A-Za-z0-9]+$/.test(value.trim())

      if (mightBeBarcode) {
        // Log the current products array length to debug
        console.log("Checking barcode match among", products.length, "products")

        const exactBarcodeMatch = products.find(
          (product) => product.barcode && product.barcode.toLowerCase() === value.toLowerCase(),
        )

        if (exactBarcodeMatch) {
          console.log("Found exact barcode match in search:", exactBarcodeMatch.name)

          // Add product to cart with notification
          const wasAdded = addToCart(exactBarcodeMatch, true)

          if (wasAdded) {
            console.log("Product added to cart successfully from search")

            // Set last added product for beep sound
            setLastAddedProduct(exactBarcodeMatch)

            // Clear search field
            setSearchTerm("")

            // Focus the search input again for the next scan
            if (searchInputRef.current) {
              searchInputRef.current.focus()
            }

            // Return early to prevent the debounced search
            return
          }
        } else {
          console.log("No exact barcode match found in search")
        }
      }
    }

    // Debounce search to avoid too many requests
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    searchTimeout.current = setTimeout(() => {
      if (value.trim() !== "") {
        fetchData(value)
      } else {
        setFilteredProducts([])
      }
    }, 300)
  }

  // Handle search input keydown for Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && autoAddOnBarcode && searchTerm.trim() !== "") {
      console.log("Enter key pressed, checking for barcode match")

      const exactBarcodeMatch = products.find(
        (product) => product.barcode && product.barcode.toLowerCase() === searchTerm.toLowerCase(),
      )

      if (exactBarcodeMatch) {
        console.log("Found exact barcode match on Enter:", exactBarcodeMatch.name)

        // Add product to cart with notification
        const wasAdded = addToCart(exactBarcodeMatch, true)

        if (wasAdded) {
          // Set last added product for beep sound
          setLastAddedProduct(exactBarcodeMatch)

          // Clear search field
          setSearchTerm("")

          // Prevent form submission
          e.preventDefault()

          // Focus the search input again for the next scan
          if (searchInputRef.current) {
            searchInputRef.current.focus()
          }
        }
      }
    }
  }

  // Add product to cart
  const addToCart = (product: Product, showNotification = true): boolean => {
    if (product.stock <= 0) {
      toast({
        title: getPOSTranslation("outOfStock", language),
        description: `${product.name} ${getPOSTranslation("outOfStock", language).toLowerCase()}.`,
        variant: "destructive",
      })
      return false
    }

    let wasAdded = false
    const now = Date.now()

    // Check if we should show a notification (debounce)
    const shouldShowNotification =
      showNotification &&
      (lastNotificationRef.current.productId !== product.id || now - lastNotificationRef.current.timestamp > 500)

    // Find if the product already exists in the cart before updating state
    const existingItem = cart.find((item) => item.product.id === product.id)

    if (existingItem) {
      // Check if we have enough stock
      if (existingItem.quantity >= product.stock) {
        toast({
          title: getPOSTranslation("stockLimitReached", language),
          description: `${getPOSTranslation("stockLimitReached", language)}: ${product.stock} ${product.name}`,
          variant: "destructive",
        })
        return false
      }

      // Show notification for adding another unit
      if (shouldShowNotification) {
        toast({
          title: getPOSTranslation("productUpdated", language),
          description: `${getPOSTranslation("productUpdated", language)}: ${product.name} (${existingItem.quantity + 1})`,
        })

        // Update the last notification reference
        lastNotificationRef.current = {
          productId: product.id,
          timestamp: now,
        }
      }

      // Update cart with increased quantity
      setCart((prevCart) =>
        prevCart.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)),
      )

      wasAdded = true
    } else {
      // Show notification for adding new product
      if (shouldShowNotification) {
        toast({
          title: getPOSTranslation("productAdded", language),
          description: `${product.name} ${getPOSTranslation("productAdded", language).toLowerCase()}`,
        })

        // Update the last notification reference
        lastNotificationRef.current = {
          productId: product.id,
          timestamp: now,
        }
      }

      // Add new product to cart
      setCart((prevCart) => [
        ...prevCart,
        {
          id: product.id,
          product,
          quantity: 1,
          price: product.price,
        },
      ])

      wasAdded = true
    }

    return wasAdded
  }

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    // Find the item before removing it to show in notification
    const itemToRemove = cart.find((item) => item.id === itemId)

    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId))

    // Show notification for removing product
    if (itemToRemove) {
      toast({
        title: getPOSTranslation("productRemoved", language),
        description: `${itemToRemove.product.name} ${getPOSTranslation("productRemoved", language).toLowerCase()}`,
      })
    }
  }

  // Update item quantity
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === itemId) {
          // Check stock limit
          if (newQuantity > item.product.stock) {
            toast({
              title: getPOSTranslation("stockLimitReached", language),
              description: `${getPOSTranslation("stockLimitReached", language)}: ${item.product.stock} ${item.product.name}`,
              variant: "destructive",
            })
            return item
          }

          // Show notification for quantity update
          toast({
            title: getPOSTranslation("quantityUpdated", language),
            description: `${item.product.name} ${getPOSTranslation("quantityUpdated", language).toLowerCase()} ${newQuantity}`,
          })

          return { ...item, quantity: newQuantity }
        }
        return item
      }),
    )
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

  // Save updated stock levels
  const saveStockLevels = async () => {
    setIsSavingStock(true)
    try {
      // Create an array of updates to perform
      const updates = Object.entries(editedStockLevels).map(([productId, stock]) => {
        return supabase.from("products").update({ stock }).eq("id", productId)
      })

      // Execute all updates
      await Promise.all(updates)

      toast({
        title: getPOSTranslation("stockLevelsUpdated", language),
        description: getPOSTranslation("stockLevelsUpdatedSuccessfully", language),
      })

      // Refresh data
      await fetchData()

      // Close dialog
      setShowLowStockDialog(false)
    } catch (error) {
      console.error("Error updating stock levels:", error)
      toast({
        title: getPOSTranslation("errorUpdatingStockLevels", language),
        description: "Failed to update stock levels",
        variant: "destructive",
      })
    } finally {
      setIsSavingStock(false)
    }
  }

  // Calculate subtotal
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  // Calculate tax
  const calculateTax = () => {
    return calculateSubtotal() * (settings.tax_rate / 100)
  }

  // Calculate total
  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  // Select payment method
  const selectPaymentMethod = (method: string) => {
    setPaymentMethod(method)
  }

  // Process payment
  const completeSale = async () => {
    if (!paymentMethod) {
      toast({
        title: getPOSTranslation("paymentMethodRequired", language),
        description: getPOSTranslation("paymentMethodRequired", language),
        variant: "destructive",
      })
      return
    }

    if (cart.length === 0) {
      toast({
        title: getPOSTranslation("emptyCart", language),
        description: getPOSTranslation("emptyCartError", language),
        variant: "destructive",
      })
      return
    }

    // Process payment directly
    setIsProcessing(true)

    try {
      // Create sale object
      const sale = {
        total: calculateTotal(),
        tax: calculateTax(),
        payment_method: paymentMethod,
      }

      // Create sale items
      const saleItems = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.price,
      }))

      // Call createSale function to save the sale to the database
      const { data, error } = await createSale(sale, saleItems)

      if (error) {
        throw error
      }

      // Store the sale ID for receipt printing
      setCompletedSaleData({
        id: data?.id || "unknown",
        items: cart,
        total: calculateTotal(),
        tax: calculateTax(),
        subtotal: calculateSubtotal(),
        payment_method: paymentMethod,
        date: new Date().toISOString(),
      })

      // Fixed toast notification - explicitly set variant to default
      toast({
        title: getPOSTranslation("saleCompleted", language),
        description: `${getPOSTranslation("total", language)}: ${formatCurrency(calculateTotal(), settings.currency, language)}`,
        variant: "default", // Explicitly set variant to ensure visibility
      })

      // Clear cart and reset payment method to cash (default)
      setCart([])
      setPaymentMethod("cash")

      // Refresh products to update stock levels
      fetchData()
      // Add this line at the end of the try block in completeSale, after fetchData()
      fetchRecentSales()
    } catch (error) {
      console.error("Error processing payment:", error)
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Add a function to print the receipt
  const printReceipt = useCallback(() => {
    if (!receiptRef.current || !completedSaleData) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your popup settings.",
        variant: "destructive",
      })
      return
    }

    const receiptContent = receiptRef.current.innerHTML

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              max-width: 300px;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 20px;
            }
            .receipt-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
            }
            .receipt-total {
              margin-top: 12px;
              border-top: 1px dashed #000;
              padding-top: 8px;
              font-weight: bold;
            }
            .receipt-footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
            }
            @media print {
              body {
                width: 80mm;
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${receiptContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `)

    printWindow.document.close()
  }, [completedSaleData, toast])

  // Function to view sale details
  const viewSaleDetails = (sale: CompletedSaleData) => {
    setViewingSaleDetails(sale)
  }

  // Add this useEffect after the fetchData function
  useEffect(() => {
    // Preload all products for better barcode matching
    const preloadAllProducts = async () => {
      try {
        console.log("Preloading all products for barcode scanning...")
        const { data, error } = await supabase
          .from("products")
          .select("id, name, barcode, price, stock, min_stock, image")
          .order("name")
          .limit(2000) // Increase limit to get more products

        if (error) throw error

        if (data) {
          console.log("Preloaded", data.length, "products for barcode scanning")
          setProducts(data as Product[])
        }
      } catch (error) {
        console.error("Error preloading products:", error)
      }
    }

    preloadAllProducts()
  }, [supabase])

  // Add this useEffect after the other useEffects
  useEffect(() => {
    // Periodically check if search input should be focused
    const focusInterval = setInterval(() => {
      // Only focus if no other input is active
      if (
        document.activeElement &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA" &&
        searchInputRef.current
      ) {
        searchInputRef.current.focus()
        console.log("Search input re-focused")
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(focusInterval)
  }, [])

  // Now modify the return statement to swap the order of cart and products sections
  // and add a recent products section
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Low stock alert banner */}
      {lowStockProducts.length > 0 && (
        <Dialog open={showLowStockDialog} onOpenChange={setShowLowStockDialog}>
          <DialogTrigger asChild>
            <div className="flex items-center justify-between p-3 mb-2 border border-red-500 bg-red-50 dark:bg-red-950/20 rounded-md cursor-pointer">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <span className="font-medium text-red-700 dark:text-red-400">
                  {getPOSTranslation("lowStockAlert", language)}
                </span>
              </div>
              <Badge variant="destructive">{lowStockProducts.length}</Badge>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{getPOSTranslation("lowStockAlert", language)}</DialogTitle>
              <DialogDescription>{getPOSTranslation("adjustStockLevelsDescription", language)}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto">
              <div className="space-y-3 mt-4">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="p-3 border rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-medium">{product.name}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          addToCart(product)
                          setShowLowStockDialog(false)
                        }}
                      >
                        <ShoppingCart className={`h-4 w-4 ${rtlEnabled ? "ml-1" : "mr-1"}`} />
                        {getPOSTranslation("addToCart", language)}
                      </Button>
                    </div>
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <Label htmlFor={`stock-${product.id}`} className="text-sm">
                          {getPOSTranslation("currentStock", language)}
                        </Label>
                        <div className="flex items-center mt-1">
                          <Input
                            id={`stock-${product.id}`}
                            type="number"
                            min="0"
                            value={editedStockLevels[product.id] || 0}
                            onChange={(e) => handleStockChange(product.id, e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{getPOSTranslation("minStock", language)}</p>
                        <Badge variant="outline">{product.min_stock}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={saveStockLevels} disabled={isSavingStock}>
                {isSavingStock ? (
                  <>
                    <Loader2 className={`${rtlEnabled ? "ml-2" : "mr-2"} h-4 w-4 animate-spin`} />
                    {getPOSTranslation("saving", language)}
                  </>
                ) : (
                  <>
                    <Save className={`${rtlEnabled ? "ml-2" : "mr-2"} h-4 w-4`} />
                    {getPOSTranslation("adjustStockLevels", language)}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Receipt Template (hidden) */}
      {completedSaleData && (
        <div className="hidden">
          <div ref={receiptRef}>
            <div className="receipt-header">
              <h2>{settings.store_name}</h2>
              <p>{new Date(completedSaleData.date).toLocaleString()}</p>
              <p>Receipt #{completedSaleData.id}</p>
            </div>

            <div className="receipt-items">
              {completedSaleData.items.map((item) => (
                <div key={item.id} className="receipt-item">
                  <div>
                    <p>
                      {item.product.name} × {item.quantity}
                    </p>
                    <p>{formatCurrency(item.price, settings.currency, language)} each</p>
                  </div>
                  <p>{formatCurrency(item.price * item.quantity, settings.currency, language)}</p>
                </div>
              ))}
            </div>

            <div className="receipt-summary">
              <div className="receipt-item">
                <span>{getPOSTranslation("subtotal", language)}</span>
                <span>{formatCurrency(completedSaleData.subtotal, settings.currency, language)}</span>
              </div>
              <div className="receipt-item">
                <span>
                  {getPOSTranslation("tax", language)} ({settings.tax_rate}%)
                </span>
                <span>{formatCurrency(completedSaleData.tax, settings.currency, language)}</span>
              </div>
              <div className="receipt-total">
                <span>{getPOSTranslation("total", language)}</span>
                <span>{formatCurrency(completedSaleData.total, settings.currency, language)}</span>
              </div>
              <div className="receipt-item">
                <span>Payment Method</span>
                <span className="capitalize">{completedSaleData.payment_method}</span>
              </div>
            </div>

            <div className="receipt-footer">
              <p>Thank you for your purchase!</p>
            </div>
          </div>
        </div>
      )}

      {/* Print Receipt Dialog */}
      {completedSaleData && (
        <Dialog open={!!completedSaleData} onOpenChange={(open) => !open && setCompletedSaleData(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{getPOSTranslation("saleCompleted", language)}</DialogTitle>
              <DialogDescription>Your sale has been completed successfully.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Receipt #{completedSaleData.id}</span>
                <span>{formatCurrency(completedSaleData.total, settings.currency, language)}</span>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setCompletedSaleData(null)}>
                {"Close"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  viewSaleDetails(completedSaleData)
                  setCompletedSaleData(null)
                }}
              >
                {"View Details"}
              </Button>
              <Button onClick={printReceipt}>
                <Printer className="mr-2 h-4 w-4" />
                {"Print Receipt"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Detailed Sale View Dialog */}
      {viewingSaleDetails && (
        <Dialog open={!!viewingSaleDetails} onOpenChange={(open) => !open && setViewingSaleDetails(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex justify-between items-center">
                <span>Sale Details</span>
                <span className="text-muted-foreground text-sm">
                  {new Date(viewingSaleDetails.date).toLocaleString()}
                </span>
              </DialogTitle>
              <DialogDescription>Receipt #{viewingSaleDetails.id}</DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-6">
              {/* Customer Information (if available) */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Payment Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Payment Method</p>
                    <p className="font-medium capitalize">{viewingSaleDetails.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(viewingSaleDetails.date).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-medium mb-2">Items</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted text-muted-foreground text-sm">
                      <tr>
                        <th className="p-2 text-left">Product</th>
                        <th className="p-2 text-right">Price</th>
                        <th className="p-2 text-right">Quantity</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewingSaleDetails.items.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30">
                          <td className="p-2">
                            <div className="font-medium">{item.product.name}</div>
                            <div className="text-xs text-muted-foreground">{item.product.barcode}</div>
                          </td>
                          <td className="p-2 text-right">{formatCurrency(item.price, settings.currency, language)}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right font-medium">
                            {formatCurrency(item.price * item.quantity, settings.currency, language)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{getPOSTranslation("subtotal", language)}</span>
                  <span>{formatCurrency(viewingSaleDetails.subtotal, settings.currency, language)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {getPOSTranslation("tax", language)} ({settings.tax_rate}%)
                  </span>
                  <span>{formatCurrency(viewingSaleDetails.tax, settings.currency, language)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>{getPOSTranslation("total", language)}</span>
                  <span>{formatCurrency(viewingSaleDetails.total, settings.currency, language)}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setViewingSaleDetails(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  // Store the current sale data in completedSaleData for printing
                  setCompletedSaleData(viewingSaleDetails)
                  // Use setTimeout to ensure the data is set before printing
                  setTimeout(() => {
                    printReceipt()
                  }, 100)
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex flex-col lg:flex-row h-full gap-4">
        {/* Cart section - now on the left */}
        <div className="lg:w-1/3 flex flex-col border rounded-lg overflow-hidden h-full">
          <CardHeader className="bg-muted py-3">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>{getPOSTranslation("shoppingCart", language)}</span>
              <span>
                {cart.length} {getPOSTranslation("items", language)}
              </span>
            </CardTitle>
          </CardHeader>

          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">{getPOSTranslation("emptyCart", language)}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 border-b pb-3">
                    <div className="h-16 w-16 relative bg-muted rounded overflow-hidden flex-shrink-0">
                      {item.product.image ? (
                        <img
                          src={item.product.image || "/placeholder.svg"}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1">{item.product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.price, settings.currency, language)} {getPOSTranslation("each", language)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateQuantity(item.id, item.quantity - 1)
                          }}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateQuantity(item.id, item.quantity + 1)
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(item.price * item.quantity, settings.currency, language)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFromCart(item.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <CardFooter className="flex-col border-t p-4">
            <div className="w-full space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{getPOSTranslation("subtotal", language)}</span>
                <span>{formatCurrency(calculateSubtotal(), settings.currency, language)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {getPOSTranslation("tax", language)} ({settings.tax_rate}%)
                </span>
                <span>{formatCurrency(calculateTax(), settings.currency, language)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>{getPOSTranslation("total", language)}</span>
                <span>{formatCurrency(calculateTotal(), settings.currency, language)}</span>
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => selectPaymentMethod("cash")}
                  disabled={isProcessing || cart.length === 0}
                >
                  <Banknote className={`${rtlEnabled ? "ml-2" : "mr-2"} h-4 w-4`} />
                  {getPOSTranslation("cash", language)}
                </Button>
                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => selectPaymentMethod("card")}
                  disabled={isProcessing || cart.length === 0}
                >
                  <CreditCard className={`${rtlEnabled ? "ml-2" : "mr-2"} h-4 w-4`} />
                  {getPOSTranslation("card", language)}
                </Button>
              </div>

              <Button
                className="w-full h-12 text-lg"
                onClick={completeSale}
                disabled={isProcessing || cart.length === 0 || !paymentMethod}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className={`${rtlEnabled ? "ml-2" : "mr-2"} h-5 w-5 animate-spin`} />
                    {getPOSTranslation("processing", language)}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className={`${rtlEnabled ? "ml-2" : "mr-2"} h-5 w-5`} />
                    {getPOSTranslation("completeSale", language)}
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </div>

        {/* Products section - now on the right */}
        <div className="lg:w-2/3 overflow-auto">
          <div className="mb-4 sticky top-0 z-10 bg-background pt-2 pb-4">
            <div className="relative">
              <Search
                className={`absolute ${rtlEnabled ? "right-3" : "left-3"} top-1/2 transform -translate-y-1/2 text-muted-foreground`}
              />
              <Input
                ref={searchInputRef}
                placeholder={getPOSTranslation("searchProducts", language)}
                value={searchTerm}
                onChange={handleSearch}
                onKeyDown={handleSearchKeyDown}
                className={`barcode-input ${rtlEnabled ? "pr-10" : "pl-10"}`}
                autoComplete="off"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                <Switch id="barcode-mode" checked={autoAddOnBarcode} onCheckedChange={setAutoAddOnBarcode} />
                <Label htmlFor="barcode-mode" className="text-sm flex items-center cursor-pointer">
                  <Barcode className={`h-4 w-4 ${rtlEnabled ? "ml-1" : "mr-1"}`} />
                  {getPOSTranslation("barcodeModeLabel", language)}
                </Label>
              </div>
            </div>
          </div>

          {/* Recent Sales Section */}
          {recentSales.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">{getPOSTranslation("recentlySold", language)}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {recentSales.map((product) => (
                  <Card
                    key={`recent-${product.id}`}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4">
                      <div className="h-24 w-24 relative mb-2 bg-muted rounded-md overflow-hidden mx-auto">
                        {product.image ? (
                          <img
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error("Image failed to load:", product.image)
                              e.currentTarget.src = "/placeholder.svg"
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <ShoppingCart className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                        {product.stock <= 0 && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <p className="text-destructive font-semibold">
                              {getPOSTranslation("outOfStock", language)}
                            </p>
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium line-clamp-1">{product.name}</h3>
                      <div className="flex justify-between items-center mt-1">
                        <p className="font-bold">{formatCurrency(product.price, settings.currency, language)}</p>
                        <p className="text-sm text-muted-foreground">
                          {getPOSTranslation("stock", language)}: {product.stock}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="border-b mb-6"></div>
            </div>
          )}

          {/* Search Results Section */}
          <div>
            {searchTerm.trim() !== "" && (
              <>
                <h3 className="text-lg font-medium mb-3">{getPOSTranslation("searchResults", language)}</h3>
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">
                      {getPOSTranslation("noProductsFound", language)} &quot;{searchTerm}&quot;
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map((product) => (
                      <Card
                        key={product.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-4">
                          <div className="aspect-square relative mb-2 bg-muted rounded-md overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image || "/placeholder.svg"}
                                alt={product.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  console.error("Image failed to load:", product.image)
                                  e.currentTarget.src = "/placeholder.svg"
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            {product.stock <= 0 && (
                              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                <p className="text-destructive font-semibold">
                                  {getPOSTranslation("outOfStock", language)}
                                </p>
                              </div>
                            )}
                          </div>
                          <h3 className="font-medium line-clamp-1">{product.name}</h3>
                          <div className="flex justify-between items-center mt-1">
                            <p className="font-bold">{formatCurrency(product.price, settings.currency, language)}</p>
                            <p className="text-sm text-muted-foreground">
                              {getPOSTranslation("stock", language)}: {product.stock}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {getPOSTranslation("barcode", language)}: {product.barcode}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default POSPage

