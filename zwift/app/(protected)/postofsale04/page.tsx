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

// Add this function to play the beep sound after a successful scan
const playBeepSound = () => {
  const audio = new Audio("/beep.mp3")
  audio.play().catch((error) => {
    console.error("Error playing beep sound:", error)
  })
}

// Add this function to play the alert sound
const playAlertSound = () => {
  const audio = new Audio("/alert.mp3")
  audio.play().catch((error) => {
    console.error("Error playing alert sound:", error)
  })
}

// Add the updateProductStock function to the file, right after the playAlertSound function:

// Function to update product stock in the database
const updateProductStock = async (productId: string, newStock: number): Promise<void> => {
  const supabase = createClient()

  const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", productId)

  if (error) {
    console.error("Error updating product stock:", error)
    throw error
  }

  return
}

// Move the calculateSubtotal function above the addToCart function
// Add this function before the addToCart function:

// Calculate subtotal
const calculateSubtotal = (quantity: number, price: number, discount: number) => {
  return quantity * price * (1 - discount / 100)
}

// Then the addToCart function can use it

// Modify the addToCart function to include the sound and make the notification stay until closed
// Replace the existing addToCart function with this updated version:
// Add product to cart
const addToCart = (
  product: Product,
  setCart: React.Dispatch<React.SetStateAction<PosCartItem[]>>,
  setLastAddedProduct: React.Dispatch<React.SetStateAction<string | null>>,
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  setRecentlyScannedProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  setRecentlySoldProducts: React.Dispatch<React.SetStateAction<Product[]>>,
  setFavoriteProducts: React.Dispatch<React.SetStateAction<Product[]>>,
) => {
  // Check if product has 0 stock and show alert
  if (product.stock <= 0) {
    // Play alert sound
    playAlertSound()

    // Create and show alert that stays until manually closed
    const alertDiv = document.createElement("div")
    alertDiv.className =
      "fixed top-1/4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex flex-col"

    // Add close button, message, and stock adjustment controls
    alertDiv.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-5 w-5 mr-2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>لا يمكن بيع المنتج مع وجود 0 مخزون!</span>
      </div>
      <button class="close-btn bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-4 w-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div class="flex items-center mt-2">
      <span class="mr-2">Adjust Stock:</span>
      <div class="flex items-center bg-white/20 rounded-md">
        <button class="decrement-btn px-2 py-1 hover:bg-white/10 rounded-l-md transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-4 w-4"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <input type="number" min="1" value="1" class="stock-input w-12 text-center bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-white/50 px-1" />
        <button class="increment-btn px-2 py-1 hover:bg-white/10 rounded-r-md transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-4 w-4"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
      <button class="update-stock-btn ml-2 bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md transition-colors">
        Update Stock
      </button>
    </div>
  `
    document.body.appendChild(alertDiv)

    // Add animation classes
    setTimeout(() => {
      alertDiv.classList.add("animate-bounce")
      // Stop bouncing after a few iterations
      setTimeout(() => {
        alertDiv.classList.remove("animate-bounce")
      }, 1000)
    }, 100)

    // Add event listeners
    const closeButton = alertDiv.querySelector(".close-btn")
    const decrementButton = alertDiv.querySelector(".decrement-btn")
    const incrementButton = alertDiv.querySelector(".increment-btn")
    const stockInput = alertDiv.querySelector(".stock-input") as HTMLInputElement
    const updateStockButton = alertDiv.querySelector(".update-stock-btn")

    if (closeButton) {
      closeButton.addEventListener("click", () => {
        alertDiv.classList.add("transition-opacity", "duration-500", "opacity-0")
        setTimeout(() => {
          document.body.removeChild(alertDiv)
        }, 500)
      })
    }

    if (decrementButton && stockInput) {
      decrementButton.addEventListener("click", () => {
        const currentValue = Number.parseInt(stockInput.value) || 1
        stockInput.value = Math.max(1, currentValue - 1).toString()
      })
    }

    if (incrementButton && stockInput) {
      incrementButton.addEventListener("click", () => {
        const currentValue = Number.parseInt(stockInput.value) || 1
        stockInput.value = (currentValue + 1).toString()
      })
    }

    if (updateStockButton && stockInput) {
      updateStockButton.addEventListener("click", async () => {
        const newStock = Number.parseInt(stockInput.value) || 1

        // Show loading state
        const updateStockButton = document.getElementById("updateStockButton")
        if (updateStockButton) {
          updateStockButton.innerHTML = `
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          `
          ;(updateStockButton as HTMLButtonElement).disabled = true
        }

        try {
          // Call the updateProductStock function
          await updateProductStock(product.id, newStock)

          // Update local state
          const updatedProduct = { ...product, stock: newStock }

          // Update products list if it contains this product
          setProducts((prevProducts) => prevProducts.map((p) => (p.id === product.id ? updatedProduct : p)))

          // Update recently scanned products if it contains this product
          setRecentlyScannedProducts((prevProducts) =>
            prevProducts.map((p) => (p.id === product.id ? updatedProduct : p)),
          )

          // Update recently sold products if it contains this product
          setRecentlySoldProducts((prevProducts) => prevProducts.map((p) => (p.id === product.id ? updatedProduct : p)))

          // Update favorites if it contains this product
          setFavoriteProducts((prevProducts) => prevProducts.map((p) => (p.id === product.id ? updatedProduct : p)))

          // Close the alert with success message
          alertDiv.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-5 w-5 mr-2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span>Stock updated successfully! Adding product to cart...</span>
            </div>
          </div>
        `
          alertDiv.classList.remove("bg-red-500")
          alertDiv.classList.add("bg-green-600")

          // Close the alert after 2 seconds and add the product to cart
          setTimeout(() => {
            document.body.removeChild(alertDiv)
            // Now add the product to cart since it has stock
            addToCart(
              updatedProduct,
              setCart,
              setLastAddedProduct,
              setProducts,
              setRecentlyScannedProducts,
              setRecentlySoldProducts,
              setFavoriteProducts,
            )
          }, 2000)
        } catch (error) {
          console.error("Error updating stock:", error)

          // Show error message
          if (updateStockButton) {
            updateStockButton.innerHTML = "Update Stock"
            ;(updateStockButton as HTMLButtonElement).disabled = false
          }

          // Add error message
          const errorMsg = document.createElement("div")
          errorMsg.className = "text-xs mt-2 bg-white/20 p-1 rounded"
          errorMsg.textContent = "Failed to update stock. Please try again."
          alertDiv.appendChild(errorMsg)

          // Remove error message after 3 seconds
          setTimeout(() => {
            if (alertDiv.contains(errorMsg)) {
              alertDiv.removeChild(errorMsg)
            }
          }, 3000)
        }
      })
    }

    return
  }

  setCart((prevCart) => {
    const existingItem = prevCart.find((item) => item.product_id === product.id)
    const purchasePrice = product.purchase_price || 0

    if (existingItem) {
      // Check if adding one more would exceed stock
      const newQuantity = existingItem.quantity + 1

      if (newQuantity > product.stock) {
        // Play alert sound
        playAlertSound()

        // Show stock limit alert
        const alertDiv = document.createElement("div")
        alertDiv.className =
          "fixed top-1/4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center"

        alertDiv.innerHTML = `
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-5 w-5 mr-2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>${product.stock} أضف المزيد! المنتجات المتوفرة في المخزون فقط.</span>
            <button class="close-btn ml-4 bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-4 w-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        `

        document.body.appendChild(alertDiv)

        // Add close button functionality
        const closeButton = alertDiv.querySelector(".close-btn")
        if (closeButton) {
          closeButton.addEventListener("click", () => {
            document.body.removeChild(alertDiv)
          })
        }

        // Auto-remove after 3 seconds
        setTimeout(() => {
          if (document.body.contains(alertDiv)) {
            document.body.removeChild(alertDiv)
          }
        }, 3000)

        return prevCart // Don't update cart
      }

      // Update quantity if item already in cart and stock allows
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

// Function to calculate the maximum discount percentage before selling at a loss
const calculateMaxDiscount = (price: number, purchasePrice: number): number => {
  if (purchasePrice >= price) {
    return 0 // No discount allowed if purchase price is greater than or equal to the selling price
  }
  const maxDiscount = ((price - purchasePrice) / price) * 100
  return Math.max(0, Math.min(100, maxDiscount)) // Ensure discount is within 0-100% range
}

// Function to check if global discount impacts profit
const checkGlobalDiscountImpact = (discountPercent: number): boolean => {
  // Implement your logic here to determine if the global discount
  // impacts the profit negatively. This is a placeholder.
  // You might need to access the cart items and their purchase prices
  // to make an accurate determination.
  return false // Placeholder: Replace with actual logic
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
  const [lastSearchLength, setLastSearchLength] = useState(0)
  const [globalDiscount, setGlobalDiscount] = useState<number>(0)

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

  // Update item quantity
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === itemId) {
          // Check if new quantity exceeds stock
          if (newQuantity > item.product.stock) {
            // Play alert sound
            playAlertSound()

            // Show stock limit alert
            const alertDiv = document.createElement("div")
            alertDiv.className =
              "fixed top-1/4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center"

            alertDiv.innerHTML = `
              <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-5 w-5 mr-2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>لا يمكن تعيين الكمية إلى ${newQuantity}! يتوفر فقط ${item.product.stock} عنصر في المخزون.</span>
                <button class="close-btn ml-4 bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-4 w-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            `

            document.body.appendChild(alertDiv)

            // Add close button functionality
            const closeButton = alertDiv.querySelector(".close-btn")
            if (closeButton) {
              closeButton.addEventListener("click", () => {
                document.body.removeChild(alertDiv)
              })
            }

            // Auto-remove after 3 seconds
            setTimeout(() => {
              if (document.body.contains(alertDiv)) {
                document.body.removeChild(alertDiv)
              }
            }, 3000)

            return item // Don't update quantity
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

      // Update stock for all sold products in the database and local state
      const stockUpdates = cart.map(async (item) => {
        const newStock = item.product.stock - item.quantity

        try {
          // Update stock in database
          await updateProductStock(item.product_id, newStock)

          // Return the updated product info
          return {
            productId: item.product_id,
            newStock: newStock,
          }
        } catch (error) {
          console.error(`Error updating stock for product ${item.product_id}:`, error)
          return null
        }
      })

      // Wait for all stock updates to complete
      const stockUpdateResults = await Promise.all(stockUpdates)

      // Update local state for all product arrays
      stockUpdateResults.forEach((result) => {
        if (result) {
          const { productId, newStock } = result

          // Update products list
          setProducts((prevProducts) => prevProducts.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)))

          // Update recently scanned products
          setRecentlyScannedProducts((prevProducts) =>
            prevProducts.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)),
          )

          // Update recently sold products
          setRecentlySoldProducts((prevProducts) =>
            prevProducts.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)),
          )

          // Update favorites
          setFavoriteProducts((prevProducts) =>
            prevProducts.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)),
          )
        }
      })

      // Clear cart after successful sale
      clearCart()

      // Refresh recent sales
      await refreshRecentSales()

      // Handle printing if needed
      if (shouldPrint) {
        console.log("Printing receipt for sale:", data)
      }

      // Show success message
      const successDiv = document.createElement("div")
      successDiv.className =
        "fixed top-1/4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center"

      successDiv.innerHTML = `
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-5 w-5 mr-2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>Sale completed successfully! Stock updated.</span>
        </div>
      `

      document.body.appendChild(successDiv)

      // Auto-remove success message after 3 seconds
      setTimeout(() => {
        if (document.body.contains(successDiv)) {
          document.body.removeChild(successDiv)
        }
      }, 3000)
    } catch (error) {
      console.error("Error processing sale:", error)

      // Show error message
      const errorDiv = document.createElement("div")
      errorDiv.className =
        "fixed top-1/4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center"

      errorDiv.innerHTML = `
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-5 w-5 mr-2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>حدث خطأ أثناء معالجة عملية البيع. يُرجى المحاولة مرة أخرى.</span>
          <button class="close-btn ml-4 bg-white/20 hover:bg-white/30 rounded-full p-1 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="h-4 w-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `

      document.body.appendChild(errorDiv)

      // Add close button functionality
      const closeButton = errorDiv.querySelector(".close-btn")
      if (closeButton) {
        closeButton.addEventListener("click", () => {
          document.body.removeChild(errorDiv)
        })
      }

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (document.body.contains(errorDiv)) {
          document.body.removeChild(errorDiv)
        }
      }, 5000)
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
            // If exactly one product found, add it to cart
            addToCart(
              results[0],
              setCart,
              setLastAddedProduct,
              setProducts,
              setRecentlyScannedProducts,
              setRecentlySoldProducts,
              setFavoriteProducts,
            )
            setBarcodeSearchTerm("") // Clear search field

            // Play beep sound for successful scan
            playBeepSound()

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
            // If exactly one product found, add it to cart
            addToCart(
              results[0],
              setCart,
              setLastAddedProduct,
              setProducts,
              setRecentlyScannedProducts,
              setRecentlySoldProducts,
              setFavoriteProducts,
            )
            setBarcodeSearchTerm("") // Clear search field

            // Play beep sound for successful scan
            playBeepSound()

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
                              product.stock <= 0 && "border-red-500", // Add red border for 0 stock products
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
                              )
                            }
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
                              product.stock <= 0 && "border-red-500", // Add red border for 0 stock products
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
                              )
                            }
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
                              product.stock <= 0 && "border-red-500", // Add red border for 0 stock products
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
                              )
                            }
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
                          product.stock <= 0 && "border-red-500", // Add red border for 0 stock products
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
                          )
                        }
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
                            product.stock <= 0 && "border-red-500", // Add red border for 0 stock products
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
                            )
                          }
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

              {/* Global Discount Input */}
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
