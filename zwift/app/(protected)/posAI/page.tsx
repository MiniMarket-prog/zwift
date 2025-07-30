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
  Barcode,
  Brain,
  TrendingUp,
  Lightbulb,
  Zap,
  Mic,
  MicOff,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { SaleConfirmationDialog } from "@/components/sale-confirmation-dialogAI"
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

interface PosCartItem extends Omit<CartItem, "product"> {
  product: Product & { purchase_price?: number }
  originalProfit: number
  profitAfterDiscount: number
}

// AI-powered suggestions interface
interface AISuggestion {
  type: "bundle" | "upsell" | "discount" | "reorder" | "alternative"
  title: string
  description: string
  products?: Product[]
  confidence: number
  potentialRevenue?: number
  action?: () => void
}

// AI Analytics interface
interface AIAnalytics {
  predictedDailyRevenue: number
  peakHour: string
  topSellingCategory: string
  profitMarginTrend: "up" | "down" | "stable"
  inventoryAlerts: Array<{
    product: Product
    daysUntilStockout: number
    recommendedReorder: number
  }>
}

// Enhanced search with AI
interface AISearchResult {
  products: Product[]
  suggestions: string[]
  corrections?: string
  confidence: number
}

// Add this function to play the beep sound after a successful scan
const playBeepSound = () => {
  const audio = new Audio("/beep.mp3")
  audio.play().catch((error) => {
    console.error("Error playing beep sound:", error)
  })
}

export default function AIEnhancedPOSPage() {
  // Existing state
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
  const [globalDiscount, setGlobalDiscount] = useState<number>(0)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")

  // AI-enhanced state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [aiAnalytics, setAiAnalytics] = useState<AIAnalytics | null>(null)
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false)
  const [aiSearchResults, setAiSearchResults] = useState<AISearchResult | null>(null)
  const [smartPricingEnabled, setSmartPricingEnabled] = useState(true)
  const [aiInsights, setAiInsights] = useState<string[]>([])
  const [isAiProcessing, setIsAiProcessing] = useState(false)

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const barcodeSearchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const barcodeTimeout = useRef<NodeJS.Timeout | null>(null)

  // Calculate cart totals (existing logic)
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0)
  const uniqueItemCount = cart.length
  const subtotal = cart.reduce((total, item) => total + item.subtotal, 0)
  const totalDiscount = cart.reduce((total, item) => total + (item.price * item.quantity * item.discount) / 100, 0)
  const tax = subtotal * settings.tax_rate
  const totalPurchaseCost = cart.reduce((total, item) => {
    const purchasePrice = item.product.purchase_price || 0
    return total + purchasePrice * item.quantity
  }, 0)

  const calculateItemProfit = (item: PosCartItem): number => {
    const purchasePrice = item.product.purchase_price || 0
    const priceAfterDiscount = item.price * (1 - item.discount / 100)
    const profitPerUnit = priceAfterDiscount - purchasePrice
    return profitPerUnit * item.quantity
  }

  const originalProfit = cart.reduce((total, item) => {
    const purchasePrice = item.product.purchase_price || 0
    return total + (item.price - purchasePrice) * item.quantity
  }, 0)

  const profitAfterDiscount = cart.reduce((total, item) => {
    return total + calculateItemProfit(item)
  }, 0)

  const total = subtotal + tax

  // AI-powered smart search with fuzzy matching and suggestions
  const performAISearch = async (query: string): Promise<AISearchResult> => {
    setIsAiProcessing(true)
    try {
      // Simulate AI-powered search API call
      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          context: {
            recentSales: recentSales.slice(0, 5),
            cartItems: cart,
            userFavorites: favoriteProducts.slice(0, 5),
          },
        }),
      })

      if (response.ok) {
        const aiResult = await response.json()
        return aiResult
      }
    } catch (error) {
      console.error("AI search error:", error)
    } finally {
      setIsAiProcessing(false)
    }

    // Fallback to regular search
    const products = await searchProducts(query)
    return {
      products,
      suggestions: [],
      confidence: 0.5,
    }
  }

  // AI-powered cart analysis and suggestions
  const generateAISuggestions = async (cartItems: PosCartItem[]) => {
    if (cartItems.length === 0) {
      setAiSuggestions([])
      return
    }

    setIsAiProcessing(true)
    try {
      const response = await fetch("/api/ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cartItems.map((item) => ({
            product_id: item.product_id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            category: item.product.category_id,
          })),
          recentSales: recentSales.slice(0, 10),
          timeOfDay: new Date().getHours(),
        }),
      })

      if (response.ok) {
        const suggestions = await response.json()
        setAiSuggestions(suggestions)
      }
    } catch (error) {
      console.error("AI suggestions error:", error)
    } finally {
      setIsAiProcessing(false)
    }
  }

  // AI analytics and insights
  const generateAIAnalytics = async () => {
    try {
      const response = await fetch("/api/ai-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recentSales,
          currentTime: new Date().toISOString(),
          products: [...recentlySoldProducts, ...favoriteProducts],
        }),
      })

      if (response.ok) {
        const analytics = await response.json()
        setAiAnalytics(analytics)
        setAiInsights(analytics.insights || [])
      }
    } catch (error) {
      console.error("AI analytics error:", error)
    }
  }

  // Voice search functionality
  const startVoiceSearch = () => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = "en-US"

      recognition.onstart = () => {
        setIsVoiceSearchActive(true)
      }

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript
        setSearchTerm(transcript)

        // Process voice command with AI
        const aiResult = await performAISearch(transcript)
        setAiSearchResults(aiResult)
        setProducts(aiResult.products)
        setActiveTab("recent")
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsVoiceSearchActive(false)
      }

      recognition.onend = () => {
        setIsVoiceSearchActive(false)
      }

      recognition.start()
    }
  }

  // Smart pricing suggestions
  const getSmartPricingSuggestion = (product: Product) => {
    if (!smartPricingEnabled) return null

    // Simulate AI pricing logic
    const currentHour = new Date().getHours()
    const isPeakHour = currentHour >= 11 && currentHour <= 14 // Lunch rush
    const demandMultiplier = isPeakHour ? 1.1 : 0.95

    const suggestedPrice = product.price * demandMultiplier
    const priceDifference = suggestedPrice - product.price

    if (Math.abs(priceDifference) > 0.1) {
      return {
        suggestedPrice,
        reason: isPeakHour ? "Peak hour demand" : "Off-peak optimization",
        confidence: 0.8,
      }
    }
    return null
  }

  // Enhanced search with AI
  const handleAISearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    searchTimeout.current = setTimeout(async () => {
      if (value.trim() !== "") {
        setIsSearching(true)
        const aiResult = await performAISearch(value)
        setAiSearchResults(aiResult)
        setProducts(aiResult.products)
        setActiveTab("recent")
        setIsSearching(false)
      } else {
        setProducts([])
        setAiSearchResults(null)
      }
    }, 300)
  }

  // Enhanced add to cart with AI suggestions
  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product_id === product.id)
      const purchasePrice = product.purchase_price || 0

      let newCart: PosCartItem[]

      if (existingItem) {
        const newQuantity = existingItem.quantity + 1
        const originalProfit = (existingItem.price - purchasePrice) * newQuantity
        const profitAfterDiscount = originalProfit * (1 - existingItem.discount / 100)

        newCart = prevCart.map((item) =>
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
        const originalProfit = (product.price - purchasePrice) * 1
        const profitAfterDiscount = originalProfit
        const newItem: PosCartItem = {
          id: `cart-${Date.now()}`,
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          discount: 0,
          subtotal: product.price,
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
        newCart = [newItem, ...prevCart]
      }

      // Generate AI suggestions based on new cart
      generateAISuggestions(newCart)
      return newCart
    })

    setLastAddedProduct(product.id)
    setTimeout(() => setLastAddedProduct(null), 1000)
  }

  // Apply AI suggestion
  const applyAISuggestion = (suggestion: AISuggestion) => {
    if (suggestion.action) {
      suggestion.action()
    } else if (suggestion.products) {
      // Add suggested products to cart
      suggestion.products.forEach((product) => addToCart(product))
    }
  }

  // Auto-focus barcode search input on page load
  useEffect(() => {
    if (barcodeSearchInputRef.current) {
      barcodeSearchInputRef.current.focus()
    }
  }, [])

  // Generate AI analytics on component mount and when sales change
  useEffect(() => {
    generateAIAnalytics()
  }, [recentSales])

  // Generate AI suggestions when cart changes
  useEffect(() => {
    if (cart.length > 0) {
      generateAISuggestions(cart)
    }
  }, [cart])

  // Existing useEffect hooks (keeping your original logic)
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setIsLoadingRecentSales(true)
        const settingsData = await getSettings()
        setSettings(settingsData)
        const recentSalesData = await getRecentSales(10)
        setRecentSales(recentSalesData)

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

  // Get current user
  useEffect(() => {
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

  // Fetch user favorites
  useEffect(() => {
    async function fetchUserFavorites() {
      if (userId) {
        try {
          const favorites = await getUserFavorites(userId)
          setFavoriteProducts(favorites)
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

  // Toggle favorite
  const toggleFavorite = async (product: Product, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!userId) return
    try {
      const isFavorite = productFavorites[product.id]
      if (isFavorite) {
        await removeFromFavorites(userId, product.id)
        setProductFavorites((prev) => ({ ...prev, [product.id]: false }))
        setFavoriteProducts((prev) => prev.filter((p) => p.id !== product.id))
      } else {
        await addToFavorites(userId, product.id)
        setProductFavorites((prev) => ({ ...prev, [product.id]: true }))
        setFavoriteProducts((prev) => [product, ...prev])
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  // Refresh recent sales
  const refreshRecentSales = async () => {
    try {
      setIsLoadingRecentSales(true)
      const recentSalesData = await getRecentSales(10)
      setRecentSales(recentSalesData)

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

  // Update quantity
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

  // Update discount
  const updateDiscount = (itemId: string, discount: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === itemId) {
          const purchasePrice = item.product.purchase_price || 0
          const originalProfit = (item.price - purchasePrice) * item.quantity
          const priceAfterDiscount = item.price * (1 - discount / 100)
          const profitPerUnit = priceAfterDiscount - purchasePrice
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

  // Apply global discount
  const applyGlobalDiscount = (discountPercent: number) => {
    setGlobalDiscount(discountPercent)
    setCart((prevCart) =>
      prevCart.map((item) => {
        const purchasePrice = item.product.purchase_price || 0
        const originalProfit = (item.price - purchasePrice) * item.quantity
        const priceAfterDiscount = item.price * (1 - discountPercent / 100)
        const profitPerUnit = priceAfterDiscount - purchasePrice
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

  // Calculate max discount
  const calculateMaxDiscount = (price: number, purchasePrice: number) => {
    if (!purchasePrice || purchasePrice <= 0) return 100
    const profitMargin = ((price - purchasePrice) / price) * 100
    return Math.floor(profitMargin)
  }

  // Check global discount impact
  const checkGlobalDiscountImpact = (discountPercent: number) => {
    return cart.some((item) => {
      const purchasePrice = item.product.purchase_price || 0
      if (!purchasePrice) return false
      const maxDiscount = calculateMaxDiscount(item.price, purchasePrice)
      return discountPercent > maxDiscount
    })
  }

  // Remove from cart
  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId))
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
    setGlobalDiscount(0)
    setAiSuggestions([])
  }

  // Handle checkout
  const handleCheckout = () => {
    setIsCheckoutOpen(true)
  }

  // Handle sale confirmation
  const handleConfirmSale = async (shouldPrint?: boolean) => {
    setIsProcessing(true)
    try {
      const saleData: Sale = {
        total: total,
        tax: tax,
        payment_method: paymentMethod,
      }

      const saleItems: SaleItem[] = cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
      }))

      const { data, error } = await createSale(saleData, saleItems)
      if (error) {
        console.error("Error creating sale:", error)
        throw error
      }

      clearCart()
      await refreshRecentSales()

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

  // Format currency
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

  // Handle barcode search
  const handleBarcodeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBarcodeSearchTerm(value)

    if (barcodeTimeout.current) {
      clearTimeout(barcodeTimeout.current)
    }

    barcodeTimeout.current = setTimeout(async () => {
      if (value.trim() !== "") {
        setIsSearching(true)
        try {
          const results = await searchProducts(value)
          if (results.length === 1) {
            addToCart(results[0])
            setBarcodeSearchTerm("")
            playBeepSound()
            setRecentlyScannedProducts((prev) => {
              const filtered = prev.filter((p) => p.id !== results[0].id)
              return [results[0], ...filtered].slice(0, 10)
            })
          } else if (results.length > 1) {
            setProducts(results)
            setActiveTab("recent")
          } else {
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

  // Handle barcode search keydown
  const handleBarcodeSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeSearchTerm.trim() !== "") {
      e.preventDefault()
      const processBarcode = async () => {
        setIsSearching(true)
        try {
          const results = await searchProducts(barcodeSearchTerm)
          if (results.length === 1) {
            addToCart(results[0])
            setBarcodeSearchTerm("")
            playBeepSound()
            setRecentlyScannedProducts((prev) => {
              const filtered = prev.filter((p) => p.id !== results[0].id)
              return [results[0], ...filtered].slice(0, 10)
            })
          } else if (results.length > 1) {
            setProducts(results)
            setActiveTab("recent")
          } else {
            setProducts([])
          }
        } catch (error) {
          console.error("Error processing barcode:", error)
        } finally {
          setIsSearching(false)
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
        {/* Products Section */}
        <div className="w-full md:w-2/3 p-4 overflow-auto">
          {/* AI Analytics Dashboard */}
          {aiAnalytics && (
            <Card className="mb-4 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Business Insights
                  {isAiProcessing && (
                    <div className="animate-spin">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(aiAnalytics.predictedDailyRevenue)}
                    </div>
                    <div className="text-xs text-muted-foreground">Predicted Daily Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{aiAnalytics.peakHour}</div>
                    <div className="text-xs text-muted-foreground">Peak Hour</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{aiAnalytics.topSellingCategory}</div>
                    <div className="text-xs text-muted-foreground">Top Category</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center">
                      <TrendingUp
                        className={cn(
                          "h-6 w-6",
                          aiAnalytics.profitMarginTrend === "up"
                            ? "text-green-500"
                            : aiAnalytics.profitMarginTrend === "down"
                              ? "text-red-500"
                              : "text-yellow-500",
                        )}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">Profit Trend</div>
                  </div>
                </div>
                {aiInsights.length > 0 && (
                  <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI Insights</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{aiInsights[0]}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Enhanced Search Section */}
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* AI-powered product search */}
              <div className="relative flex items-center">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="AI-powered search (try 'red drinks' or 'snacks under $5')..."
                  className="pl-10 pr-20 h-12 text-lg rounded-full border-primary/20 focus-visible:ring-primary/30"
                  value={searchTerm}
                  onChange={handleAISearch}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={startVoiceSearch}
                    disabled={isVoiceSearchActive}
                  >
                    {isVoiceSearchActive ? (
                      <Mic className="h-4 w-4 text-red-500 animate-pulse" />
                    ) : (
                      <MicOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  {searchTerm && (
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSearchTerm("")
                        setAiSearchResults(null)
                        if (searchInputRef.current) {
                          searchInputRef.current.focus()
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Barcode search */}
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

            {/* AI Search Results Info */}
            {aiSearchResults && (
              <div className="mt-2 p-2 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4 text-primary" />
                  <span>AI found {aiSearchResults.products.length} results</span>
                  {aiSearchResults.confidence > 0.8 && (
                    <Badge variant="secondary" className="text-xs">
                      High Confidence
                    </Badge>
                  )}
                  {aiSearchResults.corrections && (
                    <span className="text-muted-foreground">
                      • Did you mean: <em>{aiSearchResults.corrections}</em>?
                    </span>
                  )}
                </div>
                {aiSearchResults.suggestions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {aiSearchResults.suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs bg-transparent"
                        onClick={() => setSearchTerm(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Tabs with AI indicators */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger
                value="recent"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Clock className="mr-2 h-4 w-4" />
                Recent Sales
                {aiAnalytics && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    AI
                  </Badge>
                )}
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
                AI Search Results
                {isAiProcessing && (
                  <div className="ml-2 animate-spin">
                    <Sparkles className="h-3 w-3" />
                  </div>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="mt-0">
              <div className="grid grid-cols-1 gap-4">
                {/* Search Results Section */}
                {searchTerm && products.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium flex items-center">
                        <Brain className="mr-2 h-5 w-5 text-primary" />
                        AI Search Results for "{searchTerm}"
                      </h3>
                      {smartPricingEnabled && (
                        <Badge variant="outline" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          Smart Pricing Active
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {products.map((product) => {
                        const pricingSuggestion = getSmartPricingSuggestion(product)
                        return (
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
                                pricingSuggestion && "border-blue-200",
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
                              {pricingSuggestion && (
                                <div className="absolute top-1 left-1 z-10">
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                        <Zap className="h-3 w-3 mr-1" />
                                        AI Price
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Suggested: {formatCurrency(pricingSuggestion.suggestedPrice)}</p>
                                      <p className="text-xs">{pricingSuggestion.reason}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
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
                                    {pricingSuggestion && (
                                      <div className="text-xs text-blue-600">
                                        AI: {formatCurrency(pricingSuggestion.suggestedPrice)}
                                      </div>
                                    )}
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
                              </CardContent>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </div>
                    <Separator className="my-4" />
                  </>
                )}

                {/* Favorite Products Section */}
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

                {/* Last 10 Products Sold */}
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

                {/* Recent Sales History */}
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

        {/* Enhanced Cart Section with AI Suggestions */}
        <div className="w-full md:w-1/3 border-l bg-card flex flex-col h-full">
          <div className="p-4 border-b flex justify-between items-center bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold">Smart Cart</h2>
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

          {/* AI Suggestions Panel */}
          {aiSuggestions.length > 0 && (
            <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Suggestions</span>
                {isAiProcessing && (
                  <div className="animate-spin">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                )}
              </div>
              <ScrollArea className="max-h-32">
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card
                        className="p-2 cursor-pointer hover:bg-primary/5 transition-colors"
                        onClick={() => applyAISuggestion(suggestion)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-xs font-medium">{suggestion.title}</div>
                            <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {Math.round(suggestion.confidence * 100)}%
                            </Badge>
                            {suggestion.potentialRevenue && (
                              <Badge variant="secondary" className="text-xs">
                                +{formatCurrency(suggestion.potentialRevenue)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

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
                  <p className="text-lg mb-2">Your smart cart is empty</p>
                  <p className="text-sm text-center max-w-xs">
                    Search for products or scan barcodes to get AI-powered suggestions
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
                                <div className="text-xs mt-0.5">
                                  Stock:{" "}
                                  <span className={item.product.stock <= 0 ? "text-red-500 font-bold" : ""}>
                                    {item.product.stock}
                                  </span>
                                </div>
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
                                      className="h-6 w-6 bg-transparent"
                                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    >
                                      <Minus className="h-2.5 w-2.5" />
                                    </Button>
                                    <span className="w-5 text-center text-xs">{item.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6 bg-transparent"
                                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                    </Button>
                                  </div>
                                </div>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Global Discount</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Applies to all items in cart</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={globalDiscount}
                    onChange={(e) => applyGlobalDiscount(Number(e.target.value) || 0)}
                    className={cn(
                      "w-16 h-7 text-sm px-2 text-right",
                      checkGlobalDiscountImpact(globalDiscount) && "border-red-500 text-red-500",
                    )}
                    placeholder="0%"
                  />
                  <span className="ml-1 text-sm text-muted-foreground">%</span>
                  {globalDiscount > 0 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => applyGlobalDiscount(0)}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
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
                <Brain className="mr-2 h-4 w-4" />
                Smart Checkout
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        </div>

        {/* Enhanced Sale Confirmation Dialog */}
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
