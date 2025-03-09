"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
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
} from "lucide-react"
import Image from "next/image"
import type { Database } from "@/types/supabase"
import { createSale, getLowStockProducts } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

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

// Helper function to format currency
const formatCurrency = (amount: number, currency: string) => {
  console.log(`Formatting amount ${amount} with currency ${currency}`) // Debug log

  // Basic currency formatting based on currency code
  const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CAD: "C$",
    AUD: "A$",
    INR: "₹",
    CNY: "¥",
    BRL: "R$",
    MAD: "DH",
  }

  // Default to the currency code if no symbol is found
  const symbol = currencySymbols[currency] || currency

  // For MAD (Moroccan Dirham), the symbol comes after the amount
  if (currency === "MAD") {
    return `${amount.toFixed(2)} ${symbol}`
  }

  // For other currencies, the symbol comes before the amount
  return `${symbol}${amount.toFixed(2)}`
}

const POSPage = () => {
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
  const searchInputRef = useRef<HTMLInputElement>(null) // Ref for search input to focus after adding
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  // Track the last notification to prevent duplicates
  const lastNotificationRef = useRef<{ productId: string; timestamp: number }>({ productId: "", timestamp: 0 })

  // Add a new state for recently sold products after the other state declarations
  const [recentSales, setRecentSales] = useState<Product[]>([])

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

  // Fetch products and settings
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch products - limit to 10 products for better performance
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .order("name")
        .limit(10) // Limit to 10 products

      if (productsError) throw productsError

      // Fetch settings - handle this differently since the table might not exist
      try {
        console.log("Fetching settings...")

        // Fetch system settings
        const { data: settingsData, error: settingsError } = await supabase
          .from("settings")
          .select("*")
          .eq("type", "system")
          .single()

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
                : 0,
            store_name: settingsData.store_name || "My Store",
            currency:
              settingsData.settings &&
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
        setProducts(productsData as Product[])
        setFilteredProducts(productsData as Product[])
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
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, toast])

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

  // Add this effect to refresh settings when the page gets focus
  useEffect(() => {
    // Function to refresh settings
    const refreshSettings = async () => {
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from("settings")
          .select("*")
          .eq("type", "global") // Change from "system" to "global" to match the currency selector
          .single()

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
    }

    // Refresh settings when the page gets focus
    window.addEventListener("focus", refreshSettings)

    // Initial refresh
    refreshSettings()

    // Cleanup
    return () => {
      window.removeEventListener("focus", refreshSettings)
    }
  }, [supabase])

  // Filter products based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      // When no search term, don't show any products in search results
      setFilteredProducts([])
    } else {
      const term = searchTerm.toLowerCase()
      // Filter products and limit to 10 results
      const filtered = products
        .filter((product) => product.name.toLowerCase().includes(term) || product.barcode.toLowerCase().includes(term))
        .slice(0, 10) // Limit to 10 results
      setFilteredProducts(filtered)
    }
  }, [searchTerm, products])

  // Handle search input change with barcode auto-add functionality
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    // If auto-add is enabled, check for exact barcode match
    if (autoAddOnBarcode && value.trim() !== "") {
      const exactBarcodeMatch = products.find((product) => product.barcode.toLowerCase() === value.toLowerCase())

      if (exactBarcodeMatch) {
        // Add product to cart with notification
        addToCart(exactBarcodeMatch, true)

        // Set last added product for beep sound
        setLastAddedProduct(exactBarcodeMatch)

        // Clear search field
        setSearchTerm("")
        // Focus the search input again for the next scan
        if (searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }
    }
  }

  // Handle search input keydown for Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && autoAddOnBarcode && searchTerm.trim() !== "") {
      const exactBarcodeMatch = products.find((product) => product.barcode.toLowerCase() === searchTerm.toLowerCase())

      if (exactBarcodeMatch) {
        // Add product to cart with notification
        addToCart(exactBarcodeMatch, true)

        // Set last added product for beep sound
        setLastAddedProduct(exactBarcodeMatch)

        // Clear search field
        setSearchTerm("")
        // Prevent form submission
        e.preventDefault()
      }
    }
  }

  // Add product to cart
  const addToCart = (product: Product, showNotification = true): boolean => {
    if (product.stock <= 0) {
      toast({
        title: "Out of stock",
        description: `${product.name} is out of stock.`,
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
          title: "Stock limit reached",
          description: `Only ${product.stock} units of ${product.name} available.`,
          variant: "destructive",
        })
        return false
      }

      // Show notification for adding another unit
      if (shouldShowNotification) {
        toast({
          title: "Product updated",
          description: `Added another ${product.name} to cart (${existingItem.quantity + 1})`,
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
          title: "Product added",
          description: `${product.name} has been added to cart`,
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
        title: "Product removed",
        description: `${itemToRemove.product.name} has been removed from cart`,
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
              title: "Stock limit reached",
              description: `Only ${item.product.stock} units of ${item.product.name} available.`,
              variant: "destructive",
            })
            return item
          }

          // Show notification for quantity update
          toast({
            title: "Quantity updated",
            description: `${item.product.name} quantity changed to ${newQuantity}`,
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
        title: "Stock updated",
        description: "Product stock levels have been updated successfully.",
      })

      // Refresh data
      await fetchData()

      // Close dialog
      setShowLowStockDialog(false)
    } catch (error) {
      console.error("Error updating stock levels:", error)
      toast({
        title: "Error",
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
        title: "Payment method required",
        description: "Please select a payment method first.",
        variant: "destructive",
      })
      return
    }

    if (cart.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to the cart before checkout.",
        variant: "destructive",
      })
      return
    }

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
      const { error } = await createSale(sale, saleItems)

      if (error) {
        throw error
      }

      toast({
        title: "Sale completed",
        description: `Total: ${formatCurrency(calculateTotal(), settings.currency)}`,
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
                <span className="font-medium text-red-700 dark:text-red-400">Low Stock Alert</span>
              </div>
              <Badge variant="destructive">{lowStockProducts.length}</Badge>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Low Stock Products</DialogTitle>
              <DialogDescription>Adjust stock levels directly or add products to cart.</DialogDescription>
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
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Add to Cart
                      </Button>
                    </div>
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <Label htmlFor={`stock-${product.id}`} className="text-sm">
                          Current Stock
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
                        <p className="text-xs text-muted-foreground mb-1">Min Stock</p>
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Stock Levels
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex flex-col lg:flex-row h-full gap-4">
        {/* Cart section - now on the left */}
        <div className="lg:w-1/3 flex flex-col border rounded-lg overflow-hidden h-full">
          <CardHeader className="bg-muted py-3">
            <CardTitle className="flex justify-between items-center text-lg">
              <span>Shopping Cart</span>
              <span>{cart.length} items</span>
            </CardTitle>
          </CardHeader>

          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 border-b pb-3">
                    <div className="h-16 w-16 relative bg-muted rounded overflow-hidden flex-shrink-0">
                      {item.product.image ? (
                        <Image
                          src={item.product.image || "/placeholder.svg"}
                          alt={item.product.name}
                          fill
                          className="object-cover"
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
                        {formatCurrency(item.price, settings.currency)} each
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
                      <p className="font-medium">{formatCurrency(item.price * item.quantity, settings.currency)}</p>
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
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(calculateSubtotal(), settings.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({settings.tax_rate}%)</span>
                <span>{formatCurrency(calculateTax(), settings.currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(calculateTotal(), settings.currency)}</span>
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
                  <Banknote className="mr-2 h-4 w-4" />
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => selectPaymentMethod("card")}
                  disabled={isProcessing || cart.length === 0}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Card
                </Button>
              </div>

              <Button
                className="w-full h-12 text-lg"
                onClick={completeSale}
                disabled={isProcessing || cart.length === 0 || !paymentMethod}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Complete Sale
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search products by name or barcode..."
                value={searchTerm}
                onChange={handleSearch}
                onKeyDown={handleSearchKeyDown}
                className="pl-10"
                autoComplete="off"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                <Switch id="barcode-mode" checked={autoAddOnBarcode} onCheckedChange={setAutoAddOnBarcode} />
                <Label htmlFor="barcode-mode" className="text-sm flex items-center cursor-pointer">
                  <Barcode className="h-4 w-4 mr-1" />
                  Auto-add on exact barcode match
                </Label>
              </div>
            </div>
          </div>

          {/* Recent Sales Section */}
          {recentSales.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Recently Sold Products</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {recentSales.map((product) => (
                  <Card
                    key={`recent-${product.id}`}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4">
                      <div className="aspect-square relative mb-2 bg-muted rounded-md overflow-hidden">
                        {product.image ? (
                          <Image
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        {product.stock <= 0 && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <p className="text-destructive font-semibold">Out of Stock</p>
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium line-clamp-1">{product.name}</h3>
                      <div className="flex justify-between items-center mt-1">
                        <p className="font-bold">{formatCurrency(product.price, settings.currency)}</p>
                        <p className="text-sm text-muted-foreground">Stock: {product.stock}</p>
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
                <h3 className="text-lg font-medium mb-3">Search Results</h3>
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No products found matching &quot;{searchTerm}&quot;</p>
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
                              <Image
                                src={product.image || "/placeholder.svg"}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            {product.stock <= 0 && (
                              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                <p className="text-destructive font-semibold">Out of Stock</p>
                              </div>
                            )}
                          </div>
                          <h3 className="font-medium line-clamp-1">{product.name}</h3>
                          <div className="flex justify-between items-center mt-1">
                            <p className="font-bold">{formatCurrency(product.price, settings.currency)}</p>
                            <p className="text-sm text-muted-foreground">Stock: {product.stock}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">Barcode: {product.barcode}</p>
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

