"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShoppingCart,
  Search,
  Tag,
  Scan,
  X,
  Trash2,
  CreditCard,
  Clock,
  ChevronRight,
  ReceiptText,
  AlertCircle,
  Star,
  StarOff,
  Barcode,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { SaleConfirmationDialog } from "@/components/sale-confirmation-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { LowStockAlert } from "@/components/low-stock-alert"
import { StockHealthMonitor } from "@/components/stock-health-monitor"
import {
  createSale,
  getSettings,
  getRecentSales,
  searchProducts,
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  getLowStockProducts,
  getProducts,
  type Product,
  type CartItem,
  type Sale,
  type SaleItem,
  createClient,
} from "@/lib/supabase-client4"
import { useEffect as useEffectOriginal } from "react"
import { CartItemQuantity } from "@/components/cart-item-quantity"

interface PosCartItem extends Omit<CartItem, "product"> {
  product: Product & { purchase_price?: number }
  originalProfit: number
  profitAfterDiscount: number
}

// Add this function to play the beep sound after a successful scan
const playBeepSound = () => {
  const audio = new Audio("/beep.mp3")
  audio.play().catch((error) => {
    console.error("Error playing beep sound:", error)
  })
}

export default function POSPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [recentlyScannedProducts, setRecentlyScannedProducts] = useState<Product[]>([])
  const [recentlySoldProducts, setRecentlySoldProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<PosCartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [barcodeSearchTerm, setBarcodeSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState({
    tax_rate: 0.08,
    currency: "USD",
    store_name: "My Store",
  })
  const [recentSales, setRecentSales] = useState<any[]>([])
  const [isLoadingRecentSales, setIsLoadingRecentSales] = useState(true)
  const [activeTab, setActiveTab] = useState("recent")
  const [isSearching, setIsSearching] = useState(false)
  const [lastAddedProduct, setLastAddedProduct] = useState<string | null>(null)
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [productFavorites, setProductFavorites] = useState<Record<string, boolean>>({})
  const [lastSearchLength, setLastSearchLength] = useState(0)
  const [globalDiscount, setGlobalDiscount] = useState<number>(0)
  const [lowStockItems, setLowStockItems] = useState<
    Array<{ id: string; name: string; stock: number; min_stock: number }>
  >([])
  const [showLowStockAlert, setShowLowStockAlert] = useState(false)
  const [hasCheckedStock, setHasCheckedStock] = useState(false)
  // New state for the stock health monitor
  const [showStockMonitor, setShowStockMonitor] = useState(false)
  // Store all products in a map for quick lookup by ID
  const [productMap, setProductMap] = useState<Map<string, Product>>(new Map())

  // Checkout dialog state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const barcodeSearchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const barcodeTimeout = useRef<NodeJS.Timeout | null>(null)

  // Calculate cart totals
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0)
  const uniqueItemCount = cart.length // Number of unique items in cart
  const subtotal = cart.reduce((total, item) => total + item.subtotal, 0)
  const totalDiscount = cart.reduce((total, item) => total + (item.price * item.quantity * item.discount) / 100, 0)

  // Tax calculation using settings
  const tax = subtotal * settings.tax_rate
  const totalPurchaseCost = cart.reduce((total, item) => {
    const purchasePrice = item.product.purchase_price || 0
    return total + purchasePrice * item.quantity
  }, 0)

  // Add this function before the originalProfit and profitAfterDiscount calculations
  const calculateItemProfit = (item: PosCartItem): number => {
    const purchasePrice = item.product.purchase_price || 0
    // Calculate the discounted price per unit
    const priceAfterDiscount = item.price * (1 - item.discount / 100)
    // Calculate profit per unit (can be negative if discount makes price lower than cost)
    const profitPerUnit = priceAfterDiscount - purchasePrice
    // Calculate total profit for this item quantity
    return profitPerUnit * item.quantity
  }

  // Then use it in the calculations
  const originalProfit = cart.reduce((total, item) => {
    const purchasePrice = item.product.purchase_price || 0
    return total + (item.price - purchasePrice) * item.quantity
  }, 0)

  const profitAfterDiscount = cart.reduce((total, item) => {
    return total + calculateItemProfit(item)
  }, 0)
  const total = subtotal + tax

  // Auto-focus barcode search input on page load
  useEffect(() => {
    if (barcodeSearchInputRef.current) {
      barcodeSearchInputRef.current.focus()
    }
  }, [])

  // Fetch low stock products
  useEffect(() => {
    async function fetchLowStockProducts() {
      try {
        // Only check once per session to avoid annoying the user
        if (hasCheckedStock) return

        const lowStockData = await getLowStockProducts()

        if (lowStockData && lowStockData.length > 0) {
          setLowStockItems(lowStockData)

          // Only show the alert if there are actually low stock items
          // Delay showing the alert to avoid overwhelming the user when the page first loads
          setTimeout(() => {
            // Show the more impressive stock monitor instead of the simple alert
            setShowStockMonitor(true)
            setHasCheckedStock(true)
          }, 2000)
        }
      } catch (error) {
        console.error("Error fetching low stock products:", error)
      }
    }

    fetchLowStockProducts()
  }, [hasCheckedStock])

  // Fetch products, settings, and recent sales from Supabase
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setIsLoadingRecentSales(true)

        // Fetch settings
        const settingsData = await getSettings()
        setSettings(settingsData)

        // Fetch all products to build the product map
        const allProducts = await getProducts()
        const newProductMap = new Map<string, Product>()
        allProducts.forEach((product) => {
          newProductMap.set(product.id, product)
        })
        setProductMap(newProductMap)

        // Fetch recent sales
        const recentSalesData = await getRecentSales(10)
        setRecentSales(recentSalesData)

        // Extract recently sold products
        const soldProductsMap = new Map<string, Product>()
        recentSalesData.forEach((sale) => {
          sale.items?.forEach((item: any) => {
            if (item.product && !soldProductsMap.has(item.product_id)) {
              soldProductsMap.set(item.product_id, {
                id: item.product_id,
                name: item.product.name,
                price: item.price,
                stock: item.product.stock || 0,
                image: item.product.image,
                purchase_price: item.product.purchase_price || 0,
              })
            }
          })
        })

        setRecentlySoldProducts(Array.from(soldProductsMap.values()))
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
        setIsLoadingRecentSales(false)
      }
    }

    fetchData()
  }, [])

  useEffectOriginal(() => {
    async function getCurrentUser() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }

    getCurrentUser()
  }, [])

  // Add this function to fetch user favorites after the getCurrentUser function
  useEffect(() => {
    async function fetchUserFavorites() {
      if (userId) {
        try {
          const favorites = await getUserFavorites(userId)
          setFavoriteProducts(favorites)

          // Create a map of product IDs to favorite status
          const favMap: Record<string, boolean> = {}
          favorites.forEach((product) => {
            favMap[product.id] = true
          })
          setProductFavorites(favMap)
        } catch (error) {
          console.error("Error fetching user favorites:", error)
        }
      }
    }

    if (userId) {
      fetchUserFavorites()
    }
  }, [userId])

  // Add these functions to handle adding/removing favorites
  const toggleFavorite = async (product: Product, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent the card click from triggering

    if (!userId) return

    try {
      const isFavorite = productFavorites[product.id]

      if (isFavorite) {
        await removeFromFavorites(userId, product.id)

        // Update state
        setProductFavorites((prev) => ({
          ...prev,
          [product.id]: false,
        }))

        // Remove from favorites list
        setFavoriteProducts((prev) => prev.filter((p) => p.id !== product.id))
      } else {
        await addToFavorites(userId, product.id)

        // Update state
        setProductFavorites((prev) => ({
          ...prev,
          [product.id]: true,
        }))

        // Add to favorites list
        setFavoriteProducts((prev) => [product, ...prev])
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  // Function to update product stock in all relevant state variables
  const updateProductStockInState = (productId: string, newStock: number) => {
    // Update in product map
    setProductMap((prevMap) => {
      const newMap = new Map(prevMap)
      const product = newMap.get(productId)
      if (product) {
        newMap.set(productId, { ...product, stock: newStock })
      }
      return newMap
    })

    // Update in products list (search results)
    setProducts((prevProducts) =>
      prevProducts.map((product) => (product.id === productId ? { ...product, stock: newStock } : product)),
    )

    // Update in recently scanned products
    setRecentlyScannedProducts((prevProducts) =>
      prevProducts.map((product) => (product.id === productId ? { ...product, stock: newStock } : product)),
    )

    // Update in recently sold products
    setRecentlySoldProducts((prevProducts) =>
      prevProducts.map((product) => (product.id === productId ? { ...product, stock: newStock } : product)),
    )

    // Update in favorite products
    setFavoriteProducts((prevProducts) =>
      prevProducts.map((product) => (product.id === productId ? { ...product, stock: newStock } : product)),
    )
  }

  // Refresh recent sales after a new sale
  const refreshRecentSales = async () => {
    try {
      setIsLoadingRecentSales(true)
      const recentSalesData = await getRecentSales(10)
      setRecentSales(recentSalesData)

      // Update recently sold products
      const soldProductsMap = new Map<string, Product>()
      recentSalesData.forEach((sale) => {
        sale.items?.forEach((item: any) => {
          if (item.product && !soldProductsMap.has(item.product_id)) {
            soldProductsMap.set(item.product_id, {
              id: item.product_id,
              name: item.product.name,
              price: item.price,
              stock: item.product.stock || 0,
              image: item.product.image,
              purchase_price: item.product.purchase_price || 0,
            })
          }
        })
      })

      setRecentlySoldProducts(Array.from(soldProductsMap.values()))
    } catch (error) {
      console.error("Error refreshing recent sales:", error)
    } finally {
      setIsLoadingRecentSales(false)
    }
  }

  // Add product to cart
  const addToCart = (product: Product) => {
    // Check if product is out of stock
    if (product.stock <= 0) {
      toast({
        title: "Cannot add to cart",
        description: `${product.name} is out of stock.`,
        variant: "destructive",
      })
      return
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product_id === product.id)
      const purchasePrice = product.purchase_price || 0

      if (existingItem) {
        // Check if adding one more would exceed available stock
        if (existingItem.quantity >= product.stock) {
          toast({
            title: "Stock limit reached",
            description: `Cannot add more ${product.name}. Only ${product.stock} available in stock.`,
            variant: "destructive",
          })
          return prevCart
        }

        // Update quantity if item already in cart
        const newQuantity = existingItem.quantity + 1
        const originalProfit = (existingItem.price - purchasePrice) * newQuantity
        const profitAfterDiscount = originalProfit * (1 - existingItem.discount / 100)

        return prevCart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: calculateSubtotal(newQuantity, item.price, item.discount),
                originalProfit,
                profitAfterDiscount,
              }
            : item,
        )
      } else {
        // Add new item to cart at the beginning of the array
        const originalProfit = (product.price - purchasePrice) * 1 // For 1 quantity
        const profitAfterDiscount = originalProfit // No discount initially

        const newItem: PosCartItem = {
          id: `cart-${Date.now()}`,
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          discount: 0, // Initial discount is 0%
          subtotal: product.price, // Initial subtotal is just the price
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            purchase_price: purchasePrice,
            stock: product.stock,
          },
          originalProfit,
          profitAfterDiscount,
        }
        return [newItem, ...prevCart] // Add new item at the beginning
      }
    })

    // Set last added product for animation
    setLastAddedProduct(product.id)
    setTimeout(() => setLastAddedProduct(null), 1000)
  }

  // Update item quantity
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setCart((prevCart) => {
      const item = prevCart.find((item) => item.id === itemId)

      // Check if we have enough stock for the requested quantity
      if (item && newQuantity > item.product.stock) {
        toast({
          title: "Stock limit reached",
          description: `Only ${item.product.stock} units of ${item.name} available in stock.`,
          variant: "destructive",
        })
        newQuantity = item.product.stock // Limit to available stock
      }

      return prevCart.map((item) => {
        if (item.id === itemId) {
          const purchasePrice = item.product.purchase_price || 0
          const originalProfit = (item.price - purchasePrice) * newQuantity
          const profitAfterDiscount = originalProfit * (1 - item.discount / 100)

          return {
            ...item,
            quantity: newQuantity,
            subtotal: calculateSubtotal(newQuantity, item.price, item.discount),
            originalProfit,
            profitAfterDiscount,
          }
        }
        return item
      })
    })
  }

  // Update item discount
  const updateDiscount = (itemId: string, discount: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === itemId) {
          const purchasePrice = item.product.purchase_price || 0
          const originalProfit = (item.price - purchasePrice) * item.quantity

          // Calculate the discounted price per unit
          const priceAfterDiscount = item.price * (1 - discount / 100)
          // Calculate profit per unit after discount
          const profitPerUnit = priceAfterDiscount - purchasePrice
          // Calculate total profit for this item quantity
          const profitAfterDiscount = profitPerUnit * item.quantity

          return {
            ...item,
            discount,
            subtotal: calculateSubtotal(item.quantity, item.price, discount),
            originalProfit,
            profitAfterDiscount,
          }
        }
        return item
      }),
    )
  }

  // Apply global discount to all items
  const applyGlobalDiscount = (discountPercent: number) => {
    setGlobalDiscount(discountPercent)

    // Apply the discount to each item in the cart
    setCart((prevCart) =>
      prevCart.map((item) => {
        const purchasePrice = item.product.purchase_price || 0
        const originalProfit = (item.price - purchasePrice) * item.quantity

        // Calculate the discounted price per unit
        const priceAfterDiscount = item.price * (1 - discountPercent / 100)
        // Calculate profit per unit after discount
        const profitPerUnit = priceAfterDiscount - purchasePrice
        // Calculate total profit for this item quantity
        const profitAfterDiscount = profitPerUnit * item.quantity

        return {
          ...item,
          discount: discountPercent,
          subtotal: calculateSubtotal(item.quantity, item.price, discountPercent),
          originalProfit,
          profitAfterDiscount,
        }
      }),
    )
  }

  // Calculate subtotal
  const calculateSubtotal = (quantity: number, price: number, discount: number) => {
    return quantity * price * (1 - discount / 100)
  }

  // Calculate max discount before profit becomes negative
  const calculateMaxDiscount = (price: number, purchasePrice: number) => {
    if (!purchasePrice || purchasePrice <= 0) return 100
    const profitMargin = ((price - purchasePrice) / price) * 100
    return Math.floor(profitMargin)
  }

  // Check if global discount would cause any items to be sold at a loss
  const checkGlobalDiscountImpact = (discountPercent: number) => {
    return cart.some((item) => {
      const purchasePrice = item.product.purchase_price || 0
      if (!purchasePrice) return false

      const maxDiscount = calculateMaxDiscount(item.price, purchasePrice)
      return discountPercent > maxDiscount
    })
  }

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId))
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
    setGlobalDiscount(0)
  }

  // Process checkout
  const handleCheckout = () => {
    // Check if any item in the cart has insufficient stock
    const insufficientStockItems = cart.filter((item) => item.quantity > item.product.stock)

    if (insufficientStockItems.length > 0) {
      const itemNames = insufficientStockItems
        .map((item) => `${item.name} (requested: ${item.quantity}, available: ${item.product.stock})`)
        .join(", ")

      toast({
        title: "Cannot checkout",
        description: `Some items have insufficient stock: ${itemNames}`,
        variant: "destructive",
      })

      return
    }

    // If all stock checks pass, proceed with checkout
    setIsCheckoutOpen(true)
  }

  // Handle sale confirmation
  const handleConfirmSale = async (shouldPrint?: boolean) => {
    setIsProcessing(true)

    try {
      // Format sale data for Supabase
      const saleData: Sale = {
        total: total,
        tax: tax,
        payment_method: paymentMethod,
      }

      // Format sale items for Supabase
      const saleItems: SaleItem[] = cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount, // Include the discount percentage
      }))

      // Create sale in Supabase
      const { data, error } = await createSale(saleData, saleItems)

      if (error) {
        console.error("Error creating sale:", error)
        throw error
      }

      // Update local product stock levels immediately
      cart.forEach((item) => {
        const currentStock = item.product.stock
        const newStock = Math.max(0, currentStock - item.quantity)

        // Update stock in all relevant state variables
        updateProductStockInState(item.product_id, newStock)
      })

      // Clear cart after successful sale
      clearCart()

      // Show success message
      toast({
        title: "Sale completed",
        description: `Sale of ${formatCurrency(total)} has been processed successfully.`,
        variant: "default",
      })

      // Refresh recent sales
      await refreshRecentSales()

      // After a successful sale, check if we need to show the stock monitor again
      // This is important because the sale might have reduced stock levels
      const lowStockData = await getLowStockProducts()
      if (lowStockData && lowStockData.length > 0) {
        setLowStockItems(lowStockData)
        // Only show if there are new items that are low in stock
        if (lowStockData.some((item) => item.stock === 0)) {
          setShowStockMonitor(true)
        }
      }

      // Handle printing if needed
      if (shouldPrint) {
        console.log("Printing receipt for sale:", data)
      }
    } catch (error) {
      console.error("Error processing sale:", error)
      toast({
        title: "Error processing sale",
        description: "There was an error processing your sale. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setIsCheckoutOpen(false)
    }
  }

  // Format currency based on settings
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: settings.currency,
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // Handle search input change
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    // Clear any pending search timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    // Debounce search to avoid too many requests
    searchTimeout.current = setTimeout(async () => {
      if (value.trim() !== "") {
        setIsSearching(true)
        try {
          const results = await searchProducts(value)
          setProducts(results)
          setActiveTab("recent") // Show on main tab
        } catch (error) {
          console.error("Error searching products:", error)
        } finally {
          setIsSearching(false)
        }
      } else {
        setProducts([])
      }
    }, 300)
  }

  // Handle barcode search input change
  const handleBarcodeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBarcodeSearchTerm(value)

    // Clear any pending barcode timeout
    if (barcodeTimeout.current) {
      clearTimeout(barcodeTimeout.current)
    }

    // If the input is likely from a barcode scanner (fast input)
    // we'll automatically search after a short delay
    barcodeTimeout.current = setTimeout(async () => {
      if (value.trim() !== "") {
        setIsSearching(true)
        try {
          const results = await searchProducts(value)
          console.log("Barcode search results:", results)

          if (results.length === 1) {
            // Check if product is in stock before adding to cart
            if (results[0].stock <= 0) {
              toast({
                title: "Cannot add to cart",
                description: `${results[0].name} is out of stock.`,
                variant: "destructive",
              })
            } else {
              // If product is in stock, add it to cart
              addToCart(results[0])

              // Play beep sound for successful scan
              playBeepSound()

              // Add to recently scanned products
              setRecentlyScannedProducts((prev) => {
                const filtered = prev.filter((p) => p.id !== results[0].id)
                return [results[0], ...filtered].slice(0, 10)
              })
            }

            setBarcodeSearchTerm("") // Clear search field regardless
          } else if (results.length > 1) {
            // If multiple products found, show them
            setProducts(results)
            setActiveTab("recent") // Show on main tab
          } else {
            // No products found
            setProducts([])
          }
        } catch (error) {
          console.error("Error searching products:", error)
        } finally {
          setIsSearching(false)
        }
      }
    }, 300)
  }

  // Handle barcode search keydown for Enter key
  const handleBarcodeSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeSearchTerm.trim() !== "") {
      e.preventDefault() // Prevent form submission

      // Process the barcode search immediately
      const processBarcode = async () => {
        setIsSearching(true)
        try {
          const results = await searchProducts(barcodeSearchTerm)

          if (results.length === 1) {
            // Check if product is in stock before adding to cart
            if (results[0].stock <= 0) {
              toast({
                title: "Cannot add to cart",
                description: `${results[0].name} is out of stock.`,
                variant: "destructive",
              })
            } else {
              // If product is in stock, add it to cart
              addToCart(results[0])

              // Play beep sound for successful scan
              playBeepSound()

              // Add to recently scanned products
              setRecentlyScannedProducts((prev) => {
                const filtered = prev.filter((p) => p.id !== results[0].id)
                return [results[0], ...filtered].slice(0, 10)
              })
            }

            setBarcodeSearchTerm("") // Clear search field regardless
          } else if (results.length > 1) {
            // If multiple products found, show them
            setProducts(results)
            setActiveTab("recent") // Show on main tab
          } else {
            // No products found
            setProducts([])
          }
        } catch (error) {
          console.error("Error processing barcode:", error)
        } finally {
          setIsSearching(false)

          // Refocus the barcode input for the next scan
          if (barcodeSearchInputRef.current) {
            barcodeSearchInputRef.current.focus()
          }
        }
      }

      processBarcode()
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-background to-background/90">
        {/* Stock Health Monitor - more impressive than the simple alert */}
        {showStockMonitor && lowStockItems.length > 0 && (
          <StockHealthMonitor
            lowStockItems={lowStockItems}
            onClose={() => setShowStockMonitor(false)}
            formatCurrency={formatCurrency}
            position="left" // Add this prop to position it on the left
          />
        )}

        {/* Low Stock Alert - keep as fallback */}
        {showLowStockAlert && !showStockMonitor && lowStockItems.length > 0 && (
          <LowStockAlert lowStockItems={lowStockItems} onClose={() => setShowLowStockAlert(false)} />
        )}

        {/* Products Section */}
        <div className="w-full md:w-2/3 p-4 overflow-auto">
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Product search input */}
              <div className="relative flex items-center">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search products by name..."
                  className="pl-10 pr-10 h-12 text-lg rounded-full border-primary/20 focus-visible:ring-primary/30"
                  value={searchTerm}
                  onChange={handleSearch}
                />
                {searchTerm && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearchTerm("")
                      if (searchInputRef.current) {
                        searchInputRef.current.focus()
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Barcode search input */}
              <div className="relative flex items-center">
                <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={barcodeSearchInputRef}
                  type="search"
                  placeholder="Scan barcode..."
                  className="pl-10 pr-10 h-12 text-lg rounded-full border-primary/20 focus-visible:ring-primary/30"
                  value={barcodeSearchTerm}
                  onChange={handleBarcodeSearch}
                  onKeyDown={handleBarcodeSearchKeyDown}
                />
                {barcodeSearchTerm && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setBarcodeSearchTerm("")
                      if (barcodeSearchInputRef.current) {
                        barcodeSearchInputRef.current.focus()
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger
                value="recent"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Clock className="mr-2 h-4 w-4" />
                Recent Sales
              </TabsTrigger>
              <TabsTrigger
                value="scanned"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Scan className="mr-2 h-4 w-4" />
                Recently Scanned
              </TabsTrigger>
              <TabsTrigger
                value="search"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Search className="mr-2 h-4 w-4" />
                Search Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="mt-0">
              <div className="grid grid-cols-1 gap-4">
                {/* 1. Search Results Section - First priority */}
                {searchTerm && products.length > 0 && (
                  <>
                    <h3 className="text-lg font-medium flex items-center">
                      <Search className="mr-2 h-5 w-5" />
                      Search Results for "{searchTerm}"
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {products && products.length > 0
                        ? products.map((product) => (
                            <motion.div
                              key={product.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Card
                                className={cn(
                                  "cursor-pointer hover:border-primary hover:shadow-md transition-all duration-300 relative",
                                  lastAddedProduct === product.id && "border-primary ring-2 ring-primary/30",
                                  product.stock <= 0 && "opacity-60 cursor-not-allowed hover:border-destructive",
                                )}
                                onClick={() => (product.stock > 0 ? addToCart(product) : null)}
                              >
                                {userId && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 h-7 w-7 z-10 bg-background/80 hover:bg-background"
                                    onClick={(e) => toggleFavorite(product, e)}
                                  >
                                    {productFavorites[product.id] ? (
                                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                    ) : (
                                      <StarOff className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                )}
                                <CardContent className="p-2">
                                  <div className="aspect-square bg-muted rounded-md mb-2 overflow-hidden">
                                    {product.image ? (
                                      <img
                                        src={product.image || "/placeholder.svg"}
                                        alt={product.name}
                                        className="h-full w-full object-cover transition-transform hover:scale-105"
                                      />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                        <span className="text-lg font-bold text-primary/40">
                                          {product.name.charAt(0)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="font-medium text-sm line-clamp-1">{product.name}</div>
                                  <div className="flex justify-between items-center mt-1">
                                    <div className="font-bold text-primary text-sm">
                                      {formatCurrency(product.price)}
                                    </div>
                                    <Badge variant={product.stock > 0 ? "outline" : "destructive"} className="text-xs">
                                      Stock: {product.stock}
                                    </Badge>
                                  </div>
                                  {product.purchase_price && (
                                    <div className="mt-1 text-xs text-blue-600">
                                      Profit: {formatCurrency(product.price - product.purchase_price)}
                                    </div>
                                  )}
                                  {product.stock <= 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                                      <Badge variant="destructive" className="text-xs">
                                        Out of Stock
                                      </Badge>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))
                        : null}
                    </div>
                    <Separator className="my-4" />
                  </>
                )}

                {/* 2. Favorite Products Section - Second priority */}
                {userId && favoriteProducts.length > 0 && (
                  <>
                    <h3 className="text-lg font-medium flex items-center">
                      <Star className="mr-2 h-5 w-5 fill-yellow-500 text-yellow-500" />
                      Your Favorite Products
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {favoriteProducts.map((product) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card
                            className={cn(
                              "cursor-pointer hover:border-primary hover:shadow-md transition-all duration-300 relative",
                              lastAddedProduct === product.id && "border-primary ring-2 ring-primary/30",
                              product.stock <= 0 && "opacity-60 cursor-not-allowed hover:border-destructive",
                            )}
                            onClick={() => (product.stock > 0 ? addToCart(product) : null)}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-7 w-7 z-10 bg-background/80 hover:bg-background"
                              onClick={(e) => toggleFavorite(product, e)}
                            >
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            </Button>
                            <CardContent className="p-2">
                              <div className="aspect-square bg-muted rounded-md mb-2 overflow-hidden">
                                {product.image ? (
                                  <img
                                    src={product.image || "/placeholder.svg"}
                                    alt={product.name}
                                    className="h-full w-full object-cover transition-transform hover:scale-105"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                    <span className="text-lg font-bold text-primary/40">{product.name.charAt(0)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="font-medium text-sm line-clamp-1">{product.name}</div>
                              <div className="flex justify-between items-center mt-1">
                                <div className="font-bold text-primary text-sm">{formatCurrency(product.price)}</div>
                                <Badge variant={product.stock > 0 ? "outline" : "destructive"} className="text-xs">
                                  Stock: {product.stock}
                                </Badge>
                              </div>
                              {product.purchase_price && (
                                <div className="mt-1 text-xs text-blue-600">
                                  Profit: {formatCurrency(product.price - product.purchase_price)}
                                </div>
                              )}
                              {product.stock <= 0 && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                                  <Badge variant="destructive" className="text-xs">
                                    Out of Stock
                                  </Badge>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                    <Separator className="my-4" />
                  </>
                )}

                {/* 3. Last 10 Products Sold - Third priority */}
                <h3 className="text-lg font-medium flex items-center">
                  <ReceiptText className="mr-2 h-5 w-5" />
                  Last 10 Products Sold
                </h3>

                {isLoadingRecentSales ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-primary/20 mb-2"></div>
                      <div className="h-4 w-32 bg-primary/20 rounded"></div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {recentlySoldProducts && recentlySoldProducts.length > 0 ? (
                      recentlySoldProducts.map((product) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card
                            className={cn(
                              "cursor-pointer hover:border-primary hover:shadow-md transition-all duration-300 relative",
                              lastAddedProduct === product.id && "border-primary ring-2 ring-primary/30",
                              product.stock <= 0 && "opacity-60 cursor-not-allowed hover:border-destructive",
                            )}
                            onClick={() => (product.stock > 0 ? addToCart(product) : null)}
                          >
                            {userId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1 right-1 h-7 w-7 z-10 bg-background/80 hover:bg-background"
                                onClick={(e) => toggleFavorite(product, e)}
                              >
                                {productFavorites[product.id] ? (
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                ) : (
                                  <StarOff className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            )}
                            <CardContent className="p-2">
                              <div className="aspect-square bg-muted rounded-md mb-2 overflow-hidden">
                                {product.image ? (
                                  <img
                                    src={product.image || "/placeholder.svg"}
                                    alt={product.name}
                                    className="h-full w-full object-cover transition-transform hover:scale-105"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                    <span className="text-lg font-bold text-primary/40">{product.name.charAt(0)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="font-medium text-sm line-clamp-1">{product.name}</div>
                              <div className="flex justify-between items-center mt-1">
                                <div className="font-bold text-primary text-sm">{formatCurrency(product.price)}</div>
                                <Badge variant={product.stock > 0 ? "outline" : "destructive"} className="text-xs">
                                  Stock: {product.stock}
                                </Badge>
                              </div>
                              {product.purchase_price && (
                                <div className="mt-1 text-xs text-blue-600">
                                  Profit: {formatCurrency(product.price - product.purchase_price)}
                                </div>
                              )}
                              {product.stock <= 0 && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                                  <Badge variant="destructive" className="text-xs">
                                    Out of Stock
                                  </Badge>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-full text-center text-muted-foreground py-10">No products sold yet</div>
                    )}
                  </div>
                )}

                <h3 className="text-lg font-medium flex items-center mt-8">
                  <Clock className="mr-2 h-5 w-5" />
                  Recent Sales History
                </h3>

                <ScrollArea className="h-[300px] rounded-lg border p-4">
                  <div className="space-y-4">
                    {recentSales && recentSales.length > 0 ? (
                      recentSales.map((sale) => (
                        <motion.div
                          key={sale.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card className="overflow-hidden">
                            <CardContent className="p-0">
                              <div className="bg-primary/5 p-3 flex justify-between items-center">
                                <div className="flex items-center">
                                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                                    <ReceiptText className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{formatDate(sale.created_at)}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {sale.items?.length || 0} items · {sale.payment_method}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold">{formatCurrency(sale.total)}</div>
                                  <div className="text-xs flex items-center justify-end text-muted-foreground">
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    {sale.payment_method}
                                  </div>
                                </div>
                              </div>

                              <div className="p-3">
                                <div className="flex flex-wrap gap-2">
                                  {sale.items?.slice(0, 5).map((item: any) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1"
                                    >
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={item.product?.image || ""} alt={item.product?.name || ""} />
                                        <AvatarFallback className="text-xs">
                                          {item.product?.name?.charAt(0) || "P"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs">
                                        {item.quantity}× {item.product?.name || "Product"}
                                      </span>
                                    </div>
                                  ))}
                                  {sale.items && sale.items.length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{sale.items.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-10">No recent sales</div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="scanned" className="mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {recentlyScannedProducts && recentlyScannedProducts.length > 0 ? (
                  recentlyScannedProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card
                        className={cn(
                          "cursor-pointer hover:border-primary hover:shadow-md transition-all duration-300",
                          lastAddedProduct === product.id && "border-primary ring-2 ring-primary/30",
                          product.stock <= 0 && "opacity-60 cursor-not-allowed hover:border-destructive",
                        )}
                        onClick={() => (product.stock > 0 ? addToCart(product) : null)}
                      >
                        <CardContent className="p-2">
                          <div className="aspect-square bg-muted rounded-md mb-2 overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image || "/placeholder.svg"}
                                alt={product.name}
                                className="h-full w-full object-cover transition-transform hover:scale-105"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                <span className="text-lg font-bold text-primary/40">{product.name.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          <div className="font-medium text-sm line-clamp-1">{product.name}</div>
                          <div className="flex justify-between items-center mt-1">
                            <div className="font-bold text-primary text-sm">{formatCurrency(product.price)}</div>
                            <Badge variant={product.stock > 0 ? "outline" : "destructive"} className="text-xs">
                              Stock: {product.stock}
                            </Badge>
                          </div>
                          {product.purchase_price && (
                            <div className="mt-1 text-xs text-blue-600">
                              Profit: {formatCurrency(product.price - product.purchase_price)}
                            </div>
                          )}
                          {product.stock <= 0 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                              <Badge variant="destructive" className="text-xs">
                                Out of Stock
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full text-center text-muted-foreground py-10">
                    No recently scanned products
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="search" className="mt-0">
              {isSearching ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-primary/20 mb-2"></div>
                    <div className="h-4 w-32 bg-primary/20 rounded"></div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {products && products.length > 0 ? (
                    products.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card
                          className={cn(
                            "cursor-pointer hover:border-primary hover:shadow-md transition-all duration-300",
                            lastAddedProduct === product.id && "border-primary ring-2 ring-primary/30",
                            product.stock <= 0 && "opacity-60 cursor-not-allowed hover:border-destructive",
                          )}
                          onClick={() => (product.stock > 0 ? addToCart(product) : null)}
                        >
                          <CardContent className="p-2">
                            <div className="aspect-square bg-muted rounded-md mb-2 overflow-hidden">
                              {product.image ? (
                                <img
                                  src={product.image || "/placeholder.svg"}
                                  alt={product.name}
                                  className="h-full w-full object-cover transition-transform hover:scale-105"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                  <span className="text-lg font-bold text-primary/40">{product.name.charAt(0)}</span>
                                </div>
                              )}
                            </div>
                            <div className="font-medium text-sm line-clamp-1">{product.name}</div>
                            <div className="flex justify-between items-center mt-1">
                              <div className="font-bold text-primary text-sm">{formatCurrency(product.price)}</div>
                              <Badge variant={product.stock > 0 ? "outline" : "destructive"} className="text-xs">
                                Stock: {product.stock}
                              </Badge>
                            </div>
                            {product.purchase_price && (
                              <div className="mt-1 text-xs text-blue-600">
                                Profit: {formatCurrency(product.price - product.purchase_price)}
                              </div>
                            )}
                            {product.stock <= 0 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                                <Badge variant="destructive" className="text-xs">
                                  Out of Stock
                                </Badge>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full text-center text-muted-foreground py-10">No products found</div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Cart Section */}
        <div className="w-full md:w-1/3 border-l bg-card flex flex-col h-full">
          <div className="p-4 border-b flex justify-between items-center bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold">Cart</h2>

              {/* Cart Counter */}
              {cartItemCount > 0 && (
                <div className="flex gap-1">
                  <Badge className="bg-primary text-primary-foreground">{cartItemCount} items</Badge>
                  <Badge variant="outline">{uniqueItemCount} unique</Badge>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="text-muted-foreground hover:text-destructive"
            >
              Clear
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <AnimatePresence mode="sync">
              {cart.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-muted-foreground py-10"
                >
                  <div className="bg-primary/5 p-6 rounded-full mb-4">
                    <ShoppingCart className="h-12 w-12 text-primary/40" />
                  </div>
                  <p className="text-lg mb-2">Your cart is empty</p>
                  <p className="text-sm text-center max-w-xs">
                    Search for products or scan barcodes to add items to your cart
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => {
                    const maxDiscount = calculateMaxDiscount(item.price, item.product.purchase_price || 0)
                    const isDiscountTooHigh = item.discount > maxDiscount
                    const discountPercentOfMax = maxDiscount > 0 ? (item.discount / maxDiscount) * 100 : 0

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card
                          className={cn(
                            "overflow-hidden",
                            lastAddedProduct === item.product_id && "border-primary",
                            isDiscountTooHigh && "border-red-500",
                          )}
                        >
                          <CardContent className="p-2">
                            <div className="flex gap-2">
                              <div className="h-14 w-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                {item.product.image ? (
                                  <img
                                    src={item.product.image || "/placeholder.svg"}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-primary/10">
                                    <span className="text-lg font-bold text-primary/40">{item.name.charAt(0)}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between">
                                  <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-destructive -mr-1 -mt-1"
                                    onClick={() => removeFromCart(item.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>

                                <div className="flex justify-between items-center mt-0.5">
                                  <div className="text-xs text-muted-foreground">
                                    {formatCurrency(item.price)} × {item.quantity}
                                  </div>
                                  <CartItemQuantity
                                    itemId={item.id}
                                    quantity={item.quantity}
                                    onQuantityChange={updateQuantity}
                                    maxQuantity={item.product.stock}
                                  />
                                </div>

                                {/* Stock display */}
                                <div className="text-xs mt-0.5">
                                  Stock:{" "}
                                  <span className={item.product.stock <= 0 ? "text-destructive" : "text-green-500"}>
                                    {item.product.stock}
                                  </span>
                                </div>

                                {/* Profit display */}
                                <div className="flex justify-between items-center mt-1">
                                  <div className="text-xs">
                                    <span className="text-blue-600">Profit:</span>
                                    <span
                                      className={cn(
                                        "ml-1",
                                        item.profitAfterDiscount < 0 ? "text-red-500 font-bold" : "text-blue-600",
                                      )}
                                    >
                                      {formatCurrency(item.profitAfterDiscount)}
                                    </span>
                                    {item.discount > 0 && (
                                      <span className="text-muted-foreground ml-1">
                                        (was {formatCurrency(item.originalProfit)})
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Item Discount with max discount indicator */}
                                <div className="flex items-center gap-1 mt-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center">
                                        <Tag className="h-3 w-3 text-muted-foreground" />
                                        <div className="flex items-center">
                                          <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={item.discount}
                                            onChange={(e) => updateDiscount(item.id, Number(e.target.value) || 0)}
                                            className={cn(
                                              "w-12 h-6 text-xs px-1",
                                              isDiscountTooHigh && "border-red-500 text-red-500",
                                            )}
                                            placeholder="0%"
                                          />
                                          <span className="ml-0.5 text-xs text-muted-foreground">%</span>
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Max discount before loss: {maxDiscount}%</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  {isDiscountTooHigh && <AlertCircle className="h-4 w-4 text-red-500" />}
                                </div>
                              </div>
                            </div>

                            {isDiscountTooHigh && (
                              <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 rounded-md">
                                <Badge variant="destructive" className="text-xs">
                                  Discount too high
                                </Badge>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>

          <div className="p-4 border-t">
            {/* Global Discount */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Global Discount</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <div className="flex items-center">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={globalDiscount}
                          onChange={(e) => applyGlobalDiscount(Number(e.target.value) || 0)}
                          className={cn("w-12 h-8 text-sm px-1")}
                          placeholder="0%"
                        />
                        <span className="ml-0.5 text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Apply discount to all items</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {checkGlobalDiscountImpact(globalDiscount) && (
                <div className="text-xs text-red-500 mt-1">
                  <AlertCircle className="inline-block h-3 w-3 mr-1 align-middle" />
                  Warning: This discount may cause some items to be sold at a loss.
                </div>
              )}
            </div>

            {/* Cart Summary */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <p className="text-sm">Subtotal</p>
                <p className="font-medium text-sm">{formatCurrency(subtotal)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm">Discount</p>
                <p className="font-medium text-sm">- {formatCurrency(totalDiscount)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm">Tax ({settings.tax_rate * 100}%)</p>
                <p className="font-medium text-sm">{formatCurrency(tax)}</p>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <p className="text-sm">Total</p>
                <p className="text-lg">{formatCurrency(total)}</p>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              className="w-full mt-4"
              size="lg"
              onClick={handleCheckout}
              disabled={cart.length === 0 || isLoading}
            >
              {isLoading ? (
                <>
                  Processing...
                  <Progress className="w-5/6 mx-auto mt-2" value={80} />
                </>
              ) : (
                <>
                  Checkout
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sale Confirmation Dialog */}
        <SaleConfirmationDialog
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cartItems={cart}
          onConfirm={handleConfirmSale}
          subtotal={subtotal}
          tax={tax}
          total={total}
          paymentMethod={paymentMethod}
          currency={settings.currency}
          language="en"
          isProcessing={isProcessing}
          onCancel={() => setIsCheckoutOpen(false)}
        />
      </div>
    </TooltipProvider>
  )
}
