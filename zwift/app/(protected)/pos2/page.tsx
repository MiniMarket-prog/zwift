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
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Clock,
  ChevronRight,
  ReceiptText,
  AlertCircle,
  Star,
  StarOff,
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
import {
  createSale,
  getSettings,
  getRecentSales,
  searchProducts,
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  type Product,
  type CartItem,
  type Sale,
  type SaleItem,
  createClient,
} from "@/lib/supabase-client2"
import { useEffect as useEffectOriginal } from "react"

interface PosCartItem extends Omit<CartItem, "product"> {
  product: Product & { purchase_price?: number }
  originalProfit: number
  profitAfterDiscount: number
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [recentlyScannedProducts, setRecentlyScannedProducts] = useState<Product[]>([])
  const [recentlySoldProducts, setRecentlySoldProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<PosCartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
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

  // Checkout dialog state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const barcodeTimeoutRef = useRef<any>(null)

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
    // Calculate profit per unit after discount
    const priceAfterDiscount = item.price * (1 - item.discount / 100)
    // Calculate total profit for this item quantity
    return (priceAfterDiscount - purchasePrice) * item.quantity
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

  // Auto-focus search input on page load
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  // Fetch products, settings, and recent sales from Supabase
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setIsLoadingRecentSales(true)

        // Fetch settings
        const settingsData = await getSettings()
        setSettings(settingsData)

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
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product_id === product.id)
      const purchasePrice = product.purchase_price || 0

      if (existingItem) {
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
        // Add new item to cart
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
        return [...prevCart, newItem]
      }
    })

    // Reset search field after adding product
    setSearchTerm("")

    // Set last added product for animation
    setLastAddedProduct(product.id)
    setTimeout(() => setLastAddedProduct(null), 1000)

    // Refocus search input
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  // Update item quantity
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setCart((prevCart) =>
      prevCart.map((item) => {
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
      }),
    )
  }

  // Update item discount
  const updateDiscount = (itemId: string, discount: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === itemId) {
          const purchasePrice = item.product.purchase_price || 0
          const originalProfit = (item.price - purchasePrice) * item.quantity
          const profitAfterDiscount = originalProfit * (1 - discount / 100)

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

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId))
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
  }

  // Process checkout
  const handleCheckout = () => {
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

      // Clear cart after successful sale
      clearCart()

      // Refresh recent sales
      await refreshRecentSales()

      // Handle printing if needed
      if (shouldPrint) {
        console.log("Printing receipt for sale:", data)
      }
    } catch (error) {
      console.error("Error processing sale:", error)
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

  // Handle search input change with barcode scanner detection
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    // Clear any existing timeout
    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current)
    }

    // Store the last scan time to prevent duplicate scans
    const now = Date.now()
    const lastScanTime = barcodeTimeoutRef.current ? Number(barcodeTimeoutRef.current) || 0 : 0

    // If this is a barcode scan (fast input within 100ms of last scan), ignore it
    if (now - lastScanTime < 100 && value.length > lastSearchLength) {
      console.log("Ignoring potential duplicate scan")
      return
    }

    // If the input is likely from a barcode scanner (fast input)
    // we'll automatically search after a short delay
    barcodeTimeoutRef.current = setTimeout(async () => {
      if (value.length > 5) {
        // Most barcodes are longer than 5 characters
        setIsSearching(true)
        try {
          const results = await searchProducts(value)
          console.log("Search results:", results) // Log to check stock values
          if (results.length === 1) {
            // If exactly one product found, add it to cart
            addToCart(results[0])
            setSearchTerm("") // Clear search field

            // Add to recently scanned products
            setRecentlyScannedProducts((prev) => {
              const filtered = prev.filter((p) => p.id !== results[0].id)
              return [results[0], ...filtered].slice(0, 10)
            })
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
    }, 300) // 300ms delay to detect if it's a barcode scanner

    // For regular typing search (not barcode), search after a short delay
    if (value.length > 0) {
      barcodeTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true)
        try {
          const results = await searchProducts(value)
          console.log("Search results:", results) // Log to check stock values
          setProducts(results)
          setActiveTab("recent") // Show on main tab
        } catch (error) {
          console.error("Error searching products:", error)
        } finally {
          setIsSearching(false)
        }
      }, 500) // 500ms delay for regular typing
    }
  }

  // Add this effect to track the search term length
  useEffect(() => {
    setLastSearchLength(searchTerm.length)
  }, [searchTerm])

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-background to-background/90">
        {/* Products Section */}
        <div className="w-full md:w-2/3 p-4 overflow-auto">
          <div className="mb-4">
            <div className="relative flex items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search products or scan barcode..."
                  className="pl-10 pr-10 h-12 text-lg rounded-full border-primary/20 focus-visible:ring-primary/30"
                  value={searchTerm}
                  onChange={handleSearchChange}
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
              <Button variant="ghost" size="icon" className="ml-2 rounded-full" onClick={() => {}}>
                <Scan className="h-5 w-5" />
              </Button>
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
                      {products.map((product) => (
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
                            )}
                            onClick={() => addToCart(product)}
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
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
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
                            )}
                            onClick={() => addToCart(product)}
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
                    {recentlySoldProducts.length > 0 ? (
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
                            )}
                            onClick={() => addToCart(product)}
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
                    {recentSales.length > 0 ? (
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
                {recentlyScannedProducts.length > 0 ? (
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
                        )}
                        onClick={() => addToCart(product)}
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
                  {products.length > 0 ? (
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
                          )}
                          onClick={() => addToCart(product)}
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
            <AnimatePresence>
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

                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {formatCurrency(item.price)} × {item.quantity}
                                </div>

                                {/* Stock display */}
                                <div className="text-xs mt-0.5">
                                  Stock:{" "}
                                  <span className={item.product.stock <= 0 ? "text-red-500 font-bold" : ""}>
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

                                  <div className="flex items-center gap-1 ml-auto">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    >
                                      <Minus className="h-2.5 w-2.5" />
                                    </Button>
                                    <span className="w-5 text-center text-xs">{item.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Discount progress bar */}
                                {maxDiscount > 0 && (
                                  <div className="mt-1">
                                    <Progress
                                      value={discountPercentOfMax}
                                      className={cn("h-1", discountPercentOfMax < 75 ? "bg-blue-100" : "bg-red-100")}
                                      indicatorClassName={cn(
                                        discountPercentOfMax < 75
                                          ? "bg-blue-500"
                                          : discountPercentOfMax < 100
                                            ? "bg-yellow-500"
                                            : "bg-red-500",
                                      )}
                                    />
                                  </div>
                                )}

                                <div className="flex justify-end mt-1">
                                  {item.discount > 0 && (
                                    <span className="text-xs line-through text-muted-foreground mr-2">
                                      {formatCurrency(item.price * item.quantity)}
                                    </span>
                                  )}
                                  <span
                                    className={cn("text-sm font-medium", item.discount > 0 ? "text-green-600" : "")}
                                  >
                                    {formatCurrency(item.subtotal)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>

          <div className="border-t p-4 bg-card">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({(settings.tax_rate * 100).toFixed(0)}%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600 flex items-center">
                  Profit
                  {profitAfterDiscount < 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3 w-3 ml-1 text-red-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Warning: You're selling at a loss!</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </span>
                <div>
                  {originalProfit !== profitAfterDiscount && (
                    <span className="text-xs line-through text-muted-foreground mr-2">
                      {formatCurrency(originalProfit)}
                    </span>
                  )}
                  <span className={cn(profitAfterDiscount < 0 ? "text-red-500 font-bold" : "text-blue-600")}>
                    {formatCurrency(profitAfterDiscount)}
                  </span>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              className="w-full relative overflow-hidden group"
              size="lg"
              disabled={cart.length === 0}
              onClick={handleCheckout}
            >
              <span className="relative z-10 flex items-center">
                Checkout
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        </div>

        {/* Sale Confirmation Dialog */}
        <SaleConfirmationDialog
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onConfirm={handleConfirmSale}
          cartItems={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          paymentMethod={paymentMethod}
          currency={settings.currency}
          language="en-US"
          isProcessing={isProcessing}
          onCancel={() => setIsCheckoutOpen(false)}
        />
      </div>
    </TooltipProvider>
  )
}

