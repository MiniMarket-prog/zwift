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
  Package,
  TrendingUp,
  DollarSign,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

// Sound functions
const playBeepSound = () => {
  const audio = new Audio("/beep.mp3")
  audio.play().catch((error) => {
    console.error("Error playing beep sound:", error)
  })
}

const playAlertSound = () => {
  const audio = new Audio("/alert.mp3")
  audio.play().catch((error) => {
    console.error("Error playing alert sound:", error)
  })
}

// Stock adjustment dialog component
const StockAdjustmentDialog = ({
  isOpen,
  onClose,
  product,
  onStockUpdate,
  message,
  type = "warning",
}: {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onStockUpdate: (productId: string, newStock: number) => Promise<void>
  message: string
  type?: "warning" | "error"
}) => {
  const [newStock, setNewStock] = useState(1)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdateStock = async () => {
    if (!product) return

    setIsUpdating(true)
    try {
      await onStockUpdate(product.id, newStock)
      onClose()
    } catch (error) {
      console.error("Error updating stock:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className={`h-5 w-5 ${type === "error" ? "text-red-500" : "text-orange-500"}`} />
            Stock Issue
          </DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-4">
            <Button variant="outline" size="icon" onClick={() => setNewStock(Math.max(1, newStock - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min="1"
              value={newStock}
              onChange={(e) => setNewStock(Math.max(1, Number.parseInt(e.target.value) || 1))}
              className="w-20 text-center"
            />
            <Button variant="outline" size="icon" onClick={() => setNewStock(newStock + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">Current stock: {product?.stock || 0}</div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleUpdateStock} disabled={isUpdating} className="w-full sm:w-auto">
            {isUpdating ? "Updating..." : "Update Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Function to update product stock in the database
const updateProductStock = async (productId: string, newStock: number): Promise<void> => {
  const supabase = createClient()
  const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", productId)
  if (error) {
    console.error("Error updating product stock:", error)
    throw error
  }
}

// Calculate subtotal
const calculateSubtotal = (quantity: number, price: number, discount: number) => {
  return quantity * price * (1 - discount / 100)
}

// Add product to cart with improved stock management
const addToCart = (
  product: Product,
  setCart: React.Dispatch<React.SetStateAction<PosCartItem[]>>,
  setLastAddedProduct: React.Dispatch<React.SetStateAction<string | null>>,
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  setRecentlyScannedProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  setRecentlySoldProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  setFavoriteProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  setStockDialog: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean
      product: Product | null
      message: string
      type: "warning" | "error"
      onUpdate?: (productId: string, newStock: number) => Promise<void>
    }>
  >,
) => {
  // Check if product has 0 stock
  if (product.stock <= 0) {
    playAlertSound()
    setStockDialog({
      isOpen: true,
      product,
      message: `Cannot sell product with 0 stock! Product: ${product.name}`,
      type: "error",
      onUpdate: async (productId: string, newStock: number) => {
        await updateProductStock(productId, newStock)
        // Update local state
        const updatedProduct = { ...product, stock: newStock }
        setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)))
        setRecentlyScannedProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)))
        setRecentlySoldProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)))
        setFavoriteProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)))
        // Add to cart after stock update
        addToCart(
          updatedProduct,
          setCart,
          setLastAddedProduct,
          setProducts,
          setRecentlyScannedProducts,
          setRecentlySoldProducts,
          setFavoriteProducts,
          setStockDialog,
        )
      },
    })
    return
  }

  setCart((prevCart) => {
    const existingItem = prevCart.find((item) => item.product_id === product.id)
    const purchasePrice = product.purchase_price || 0

    if (existingItem) {
      const newQuantity = existingItem.quantity + 1

      // Check if adding one more would exceed stock
      if (newQuantity > product.stock) {
        playAlertSound()
        setStockDialog({
          isOpen: true,
          product,
          message: `Cannot add more! Only ${product.stock} items available in stock.`,
          type: "warning",
          onUpdate: async (productId: string, newStock: number) => {
            await updateProductStock(productId, newStock)
            // Update local state
            const updatedProduct = { ...product, stock: newStock }
            setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)))
            setRecentlyScannedProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)))
            setRecentlySoldProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)))
            setFavoriteProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)))
          },
        })
        return prevCart
      }

      // Update quantity if stock allows
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
      return [newItem, ...prevCart]
    }
  })

  // Set last added product for animation
  setLastAddedProduct(product.id)
  setTimeout(() => setLastAddedProduct(null), 1000)
}

// Function to calculate the maximum discount percentage before selling at a loss
const calculateMaxDiscount = (price: number, purchasePrice: number): number => {
  if (purchasePrice >= price) return 0
  const maxDiscount = ((price - purchasePrice) / price) * 100
  return Math.max(0, Math.min(100, maxDiscount))
}

export default function POSPage() {
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
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCartCollapsed, setIsCartCollapsed] = useState(false)

  // Stock dialog state
  const [stockDialog, setStockDialog] = useState<{
    isOpen: boolean
    product: Product | null
    message: string
    type: "warning" | "error"
    onUpdate?: (productId: string, newStock: number) => Promise<void>
  }>({
    isOpen: false,
    product: null,
    message: "",
    type: "warning",
  })

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
  const uniqueItemCount = cart.length
  const subtotal = cart.reduce((total, item) => total + item.subtotal, 0)
  const totalDiscount = cart.reduce((total, item) => total + (item.price * item.quantity * item.discount) / 100, 0)
  const tax = subtotal * settings.tax_rate
  const total = subtotal + tax

  // Calculate profits
  const originalProfit = cart.reduce((total, item) => {
    const purchasePrice = item.product.purchase_price || 0
    return total + (item.price - purchasePrice) * item.quantity
  }, 0)

  const profitAfterDiscount = cart.reduce((total, item) => {
    const purchasePrice = item.product.purchase_price || 0
    const priceAfterDiscount = item.price * (1 - item.discount / 100)
    const profitPerUnit = priceAfterDiscount - purchasePrice
    return total + profitPerUnit * item.quantity
  }, 0)

  // Calculate today's sales and profit with proper timezone handling
  const getTodaysStats = () => {
    // Get today's date range in local timezone
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    console.log("Today range:", { todayStart, todayEnd }) // Debug log
    console.log("Recent sales data:", recentSales) // Debug log

    const todaysSalesData = recentSales.filter((sale) => {
      const saleDate = new Date(sale.created_at)
      const isToday = saleDate >= todayStart && saleDate <= todayEnd

      if (isToday) {
        console.log("Today sale found:", { saleDate, sale }) // Debug log
      }

      return isToday
    })

    console.log("Filtered today sales:", todaysSalesData) // Debug log

    const totalSales = todaysSalesData.reduce((total, sale) => total + sale.total, 0)

    const totalProfit = todaysSalesData.reduce((total, sale) => {
      // Check both possible data structures
      const saleItems = sale.items || sale.sale_items || []

      const saleProfit = saleItems.reduce((itemTotal: number, item: any) => {
        const purchasePrice = item.product?.purchase_price || item.products?.purchase_price || 0
        const discount = item.discount || 0
        const priceAfterDiscount = item.price * (1 - discount / 100)
        const profitPerUnit = priceAfterDiscount - purchasePrice
        return itemTotal + profitPerUnit * item.quantity
      }, 0)

      return total + saleProfit
    }, 0)

    return { totalSales, totalProfit }
  }

  const { totalSales: todaysSales, totalProfit: todaysProfit } = getTodaysStats()

  // Auto-focus barcode search input on page load
  useEffect(() => {
    if (barcodeSearchInputRef.current) {
      barcodeSearchInputRef.current.focus()
    }
  }, [])

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setIsLoadingRecentSales(true)

        const settingsData = await getSettings()
        setSettings(settingsData)

        const recentSalesData = await getRecentSales(50)
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

  // Update item quantity with stock validation
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === itemId) {
          if (newQuantity > item.product.stock) {
            playAlertSound()
            setStockDialog({
              isOpen: true,
              product: item.product,
              message: `Cannot set quantity to ${newQuantity}! Only ${item.product.stock} items available in stock.`,
              type: "warning",
              onUpdate: async (productId: string, newStock: number) => {
                await updateProductStock(productId, newStock)
                // Update local state
                setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)))
                setRecentlyScannedProducts((prev) =>
                  prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)),
                )
                setRecentlySoldProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)))
                setFavoriteProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)))
                // Update cart item stock
                setCart((prevCart) =>
                  prevCart.map((cartItem) =>
                    cartItem.product_id === productId
                      ? { ...cartItem, product: { ...cartItem.product, stock: newStock } }
                      : cartItem,
                  ),
                )
              },
            })
            return item
          }

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

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId))
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
    setGlobalDiscount(0)
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
      if (error) throw error

      // Update stock for all sold products
      const stockUpdates = cart.map(async (item) => {
        const newStock = item.product.stock - item.quantity
        try {
          await updateProductStock(item.product_id, newStock)
          return { productId: item.product_id, newStock }
        } catch (error) {
          console.error(`Error updating stock for product ${item.product_id}:`, error)
          return null
        }
      })

      const stockUpdateResults = await Promise.all(stockUpdates)

      // Update local state
      stockUpdateResults.forEach((result) => {
        if (result) {
          const { productId, newStock } = result
          setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)))
          setRecentlyScannedProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)))
          setRecentlySoldProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)))
          setFavoriteProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)))
        }
      })

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

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    searchTimeout.current = setTimeout(async () => {
      if (value.trim() !== "") {
        setIsSearching(true)
        try {
          const results = await searchProducts(value)
          setProducts(results)
          setActiveTab("recent")
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
            addToCart(
              results[0],
              setCart,
              setLastAddedProduct,
              setProducts,
              setRecentlyScannedProducts,
              setRecentlySoldProducts,
              setFavoriteProducts,
              setStockDialog,
            )
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
            addToCart(
              results[0],
              setCart,
              setLastAddedProduct,
              setProducts,
              setRecentlyScannedProducts,
              setRecentlySoldProducts,
              setFavoriteProducts,
              setStockDialog,
            )
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

  // Product card component
  const ProductCard = ({ product }: { product: Product }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card
        className={cn(
          "cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-300 relative group",
          lastAddedProduct === product.id && "border-primary ring-2 ring-primary/30",
          product.stock <= 0 && "border-red-500 opacity-75",
        )}
        onClick={() =>
          addToCart(
            product,
            setCart,
            setLastAddedProduct,
            setProducts,
            setRecentlyScannedProducts,
            setRecentlySoldProducts,
            setFavoriteProducts,
            setStockDialog,
          )
        }
      >
        {userId && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 z-10 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => toggleFavorite(product, e)}
          >
            {productFavorites[product.id] ? (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            ) : (
              <StarOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}

        <CardContent className="p-3">
          <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
            {product.image ? (
              <img
                src={product.image || '/placeholder.svg"}.image || "/placeholder.svg'}
                alt={product.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                <Package className="h-8 w-8 text-primary/40" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">{product.name}</h3>

            <div className="flex justify-between items-center">
              <div className="font-bold text-primary text-lg">{formatCurrency(product.price)}</div>
              <Badge variant={product.stock > 0 ? "outline" : "destructive"} className="text-xs">
                {product.stock}
              </Badge>
            </div>

            {product.purchase_price && (
              <div className="flex items-center text-xs text-blue-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                {formatCurrency(product.price - product.purchase_price)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        {/* Mobile Header */}
        <div className="lg:hidden bg-card border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">POS System</h1>
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Cart
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Shopping Cart
                    {cartItemCount > 0 && <Badge>{cartItemCount} items</Badge>}
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile Cart Content */}
                <div className="flex flex-col h-full mt-6">
                  <ScrollArea className="flex-1 -mx-6 px-6">
                    <AnimatePresence>
                      {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                          <ShoppingCart className="h-12 w-12 mb-4 opacity-40" />
                          <p>Your cart is empty</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {cart.map((item) => {
                            const maxDiscount = calculateMaxDiscount(item.price, item.product.purchase_price || 0)
                            const isDiscountTooHigh = item.discount > maxDiscount

                            return (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Card className={cn("overflow-hidden", isDiscountTooHigh && "border-red-500")}>
                                  <CardContent className="p-4">
                                    <div className="flex gap-3">
                                      <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                        {item.product.image ? (
                                          <img
                                            src={item.product.image || "/placeholder.svg"}
                                            alt={item.name}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div className="h-full w-full flex items-center justify-center">
                                            <Package className="h-6 w-6 text-primary/40" />
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-2">
                                          <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive ml-2"
                                            onClick={() => removeFromCart(item.id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>

                                        <div className="text-xs text-muted-foreground mb-2">
                                          {formatCurrency(item.price)} × {item.quantity} | Stock: {item.product.stock}
                                        </div>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                            >
                                              <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                            >
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                          </div>

                                          <div className="text-right">
                                            {item.discount > 0 && (
                                              <div className="text-xs line-through text-muted-foreground">
                                                {formatCurrency(item.price * item.quantity)}
                                              </div>
                                            )}
                                            <div className="font-bold text-primary">
                                              {formatCurrency(item.subtotal)}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Discount Control */}
                                        <div className="flex items-center gap-2">
                                          <Tag className="h-3 w-3 text-muted-foreground" />
                                          <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={item.discount}
                                            onChange={(e) => updateDiscount(item.id, Number(e.target.value) || 0)}
                                            className={cn(
                                              "h-7 w-16 text-xs px-2",
                                              isDiscountTooHigh && "border-red-500 text-red-500",
                                            )}
                                            placeholder="0%"
                                          />
                                          <span className="text-xs text-muted-foreground">%</span>
                                        </div>

                                        {/* Profit Display */}
                                        <div className="mt-2 text-xs">
                                          <span className="text-blue-600">Profit: </span>
                                          <span
                                            className={cn(
                                              item.profitAfterDiscount < 0 ? "text-red-500 font-bold" : "text-blue-600",
                                            )}
                                          >
                                            {formatCurrency(item.profitAfterDiscount)}
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

                  {/* Mobile Cart Summary */}
                  {cart.length > 0 && (
                    <div className="border-t pt-4 mt-4 space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {totalDiscount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span>-{formatCurrency(totalDiscount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Tax ({(settings.tax_rate * 100).toFixed(0)}%)</span>
                          <span>{formatCurrency(tax)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Profit</span>
                          <span className={cn(profitAfterDiscount < 0 ? "text-red-500" : "text-blue-600")}>
                            {formatCurrency(profitAfterDiscount)}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => {
                          setIsCartOpen(false)
                          handleCheckout()
                        }}
                      >
                        Checkout
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Mobile Search */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search products..."
                className="pl-10 h-12 text-base"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>

            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={barcodeSearchInputRef}
                type="search"
                placeholder="Scan barcode..."
                className="pl-10 h-12 text-base"
                value={barcodeSearchTerm}
                onChange={handleBarcodeSearch}
                onKeyDown={handleBarcodeSearchKeyDown}
              />
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Products Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Desktop Header */}
            <div className="hidden lg:block bg-card border-b p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Point of Sale</h1>
                  <p className="text-muted-foreground">Scan, search, and sell products</p>
                </div>

                {/* Quick Stats */}
                <div className="flex gap-4">
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Today's Sales</div>
                        <div className="font-bold">{formatCurrency(todaysSales)}</div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Today's Profit</div>
                        <div className="font-bold text-green-600">{formatCurrency(todaysProfit)}</div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="search"
                    placeholder="Search products by name..."
                    className="pl-10 h-12 text-base rounded-xl"
                    value={searchTerm}
                    onChange={handleSearch}
                  />
                </div>

                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={barcodeSearchInputRef}
                    type="search"
                    placeholder="Scan barcode..."
                    className="pl-10 h-12 text-base rounded-xl"
                    value={barcodeSearchTerm}
                    onChange={handleBarcodeSearch}
                    onKeyDown={handleBarcodeSearchKeyDown}
                  />
                </div>
              </div>
            </div>

            {/* Products Content */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="grid grid-cols-3 mb-6 w-full lg:w-auto">
                  <TabsTrigger value="recent" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Recent</span>
                  </TabsTrigger>
                  <TabsTrigger value="scanned" className="flex items-center gap-2">
                    <Scan className="h-4 w-4" />
                    <span className="hidden sm:inline">Scanned</span>
                  </TabsTrigger>
                  <TabsTrigger value="search" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline">Search</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="recent" className="mt-0 h-full">
                  <div className="space-y-8">
                    {/* Search Results */}
                    {searchTerm && products.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Search className="h-5 w-5" />
                          Search Results for "{searchTerm}"
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Favorites */}
                    {userId && favoriteProducts.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                          Your Favorites
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {favoriteProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recently Sold */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <ReceiptText className="h-5 w-5" />
                        Recently Sold Products
                      </h3>
                      {isLoadingRecentSales ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <Card key={i} className="animate-pulse">
                              <CardContent className="p-3">
                                <div className="aspect-square bg-muted rounded-lg mb-3" />
                                <div className="h-4 bg-muted rounded mb-2" />
                                <div className="h-3 bg-muted rounded w-2/3" />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {recentlySoldProducts.length > 0 ? (
                            recentlySoldProducts.map((product) => <ProductCard key={product.id} product={product} />)
                          ) : (
                            <div className="col-span-full text-center text-muted-foreground py-12">
                              <ReceiptText className="h-12 w-12 mx-auto mb-4 opacity-40" />
                              <p>No products sold yet</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Recent Sales History */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recent Sales History
                      </h3>
                      <ScrollArea className="h-80 rounded-lg border p-4">
                        <div className="space-y-4">
                          {recentSales.length > 0 ? (
                            recentSales.map((sale) => (
                              <Card key={sale.id} className="overflow-hidden">
                                <CardContent className="p-0">
                                  <div className="bg-primary/5 p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-primary/10 p-2 rounded-full">
                                        <ReceiptText className="h-4 w-4 text-primary" />
                                      </div>
                                      <div>
                                        <div className="font-medium">{formatDate(sale.created_at)}</div>
                                        <div className="text-sm text-muted-foreground">
                                          {sale.items?.length || 0} items • {sale.payment_method}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-lg">{formatCurrency(sale.total)}</div>
                                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                                        <CreditCard className="h-3 w-3" />
                                        {sale.payment_method}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-4">
                                    <div className="flex flex-wrap gap-2">
                                      {sale.items?.slice(0, 5).map((item: any) => (
                                        <div
                                          key={item.id}
                                          className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1"
                                        >
                                          <Avatar className="h-6 w-6">
                                            <AvatarImage src={item.product?.image || ""} />
                                            <AvatarFallback className="text-xs">
                                              {item.product?.name?.charAt(0) || "P"}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm">
                                            {item.quantity}× {item.product?.name || "Product"}
                                          </span>
                                        </div>
                                      ))}
                                      {sale.items && sale.items.length > 5 && (
                                        <Badge variant="outline">+{sale.items.length - 5} more</Badge>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <div className="text-center text-muted-foreground py-12">
                              <Clock className="h-12 w-12 mx-auto mb-4 opacity-40" />
                              <p>No recent sales</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="scanned" className="mt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {recentlyScannedProducts.length > 0 ? (
                      recentlyScannedProducts.map((product) => <ProductCard key={product.id} product={product} />)
                    ) : (
                      <div className="col-span-full text-center text-muted-foreground py-12">
                        <Scan className="h-12 w-12 mx-auto mb-4 opacity-40" />
                        <p>No recently scanned products</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="search" className="mt-0">
                  {isSearching ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-3">
                            <div className="aspect-square bg-muted rounded-lg mb-3" />
                            <div className="h-4 bg-muted rounded mb-2" />
                            <div className="h-3 bg-muted rounded w-2/3" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {products.length > 0 ? (
                        products.map((product) => <ProductCard key={product.id} product={product} />)
                      ) : (
                        <div className="col-span-full text-center text-muted-foreground py-12">
                          <Search className="h-12 w-12 mx-auto mb-4 opacity-40" />
                          <p>No products found</p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Desktop Cart Sidebar */}
          <div className="hidden lg:flex w-96 border-l bg-card flex-col">
            {/* Cart Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Shopping Cart</h2>
                    {cartItemCount > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {cartItemCount} items • {uniqueItemCount} unique
                      </p>
                    )}
                  </div>
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

              {/* Global Discount */}
              {cart.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Global Discount</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={globalDiscount}
                      onChange={(e) => applyGlobalDiscount(Number(e.target.value) || 0)}
                      className="w-16 h-8 text-sm px-2 text-right"
                      placeholder="0"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    {globalDiscount > 0 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => applyGlobalDiscount(0)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 p-6">
              <AnimatePresence>
                {cart.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-muted-foreground py-12"
                  >
                    <div className="bg-primary/5 p-8 rounded-full mb-6">
                      <ShoppingCart className="h-16 w-16 text-primary/40" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
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
                              lastAddedProduct === item.product_id && "border-primary ring-2 ring-primary/30",
                              isDiscountTooHigh && "border-red-500",
                            )}
                          >
                            <CardContent className="p-4">
                              <div className="flex gap-3">
                                <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                  {item.product.image ? (
                                    <img
                                      src={item.product.image || "/placeholder.svg"}
                                      alt={item.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                      <Package className="h-6 w-6 text-primary/40" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive ml-2"
                                      onClick={() => removeFromCart(item.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>

                                  <div className="text-xs text-muted-foreground mb-2">
                                    {formatCurrency(item.price)} × {item.quantity} | Stock: {item.product.stock}
                                  </div>

                                  {/* Quantity Controls */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>

                                    <div className="text-right">
                                      {item.discount > 0 && (
                                        <div className="text-xs line-through text-muted-foreground">
                                          {formatCurrency(item.price * item.quantity)}
                                        </div>
                                      )}
                                      <div className="font-bold text-primary">{formatCurrency(item.subtotal)}</div>
                                    </div>
                                  </div>

                                  {/* Discount Control */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1">
                                          <Tag className="h-3 w-3 text-muted-foreground" />
                                          <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={item.discount}
                                            onChange={(e) => updateDiscount(item.id, Number(e.target.value) || 0)}
                                            className={cn(
                                              "h-6 w-14 text-xs px-2",
                                              isDiscountTooHigh && "border-red-500 text-red-500",
                                            )}
                                            placeholder="0"
                                          />
                                          <span className="text-xs text-muted-foreground">%</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Max discount before loss: {maxDiscount.toFixed(1)}%</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>

                                  {/* Discount Progress Bar */}
                                  {maxDiscount > 0 && (
                                    <div className="mb-2">
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

                                  {/* Profit Display */}
                                  <div className="text-xs">
                                    <span className="text-blue-600">Profit: </span>
                                    <span
                                      className={cn(
                                        item.profitAfterDiscount < 0 ? "text-red-500 font-bold" : "text-blue-600",
                                      )}
                                    >
                                      {formatCurrency(item.profitAfterDiscount)}
                                    </span>
                                    {item.discount > 0 && item.originalProfit !== item.profitAfterDiscount && (
                                      <span className="text-muted-foreground ml-1">
                                        (was {formatCurrency(item.originalProfit)})
                                      </span>
                                    )}
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

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="border-t p-6 bg-card">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(totalDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({(settings.tax_rate * 100).toFixed(0)}%)</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600 flex items-center gap-1">
                      Profit
                      {profitAfterDiscount < 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-3 w-3 text-red-500" />
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

                  <Separator />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <Button className="w-full relative overflow-hidden group" size="lg" onClick={handleCheckout}>
                  <span className="relative z-10 flex items-center">
                    Checkout
                    <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stock Adjustment Dialog */}
        <StockAdjustmentDialog
          isOpen={stockDialog.isOpen}
          onClose={() => setStockDialog((prev) => ({ ...prev, isOpen: false }))}
          product={stockDialog.product}
          onStockUpdate={stockDialog.onUpdate || (async () => {})}
          message={stockDialog.message}
          type={stockDialog.type}
        />

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
