"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Package,
  ArrowRight,
  X,
  BarChart4,
  ShoppingCart,
  Minus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface StockItem {
  id: string
  name: string
  stock: number
  min_stock: number
  price?: number
}

interface StockHealthMonitorProps {
  lowStockItems: StockItem[]
  onClose: () => void
  formatCurrency: (amount: number) => string
  position?: "left" | "right" // Add position prop with default value
}

export function StockHealthMonitor({
  lowStockItems,
  onClose,
  formatCurrency,
  position = "right", // Default to right if not specified
}: StockHealthMonitorProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [healthScore, setHealthScore] = useState(0)
  const [potentialLoss, setPotentialLoss] = useState(0)
  const [totalPotentialLoss, setTotalPotentialLoss] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isAnimatingRevenue, setIsAnimatingRevenue] = useState(false)

  // Calculate inventory health metrics
  useEffect(() => {
    // Calculate health score (0-100)
    const totalItems = lowStockItems.length
    if (totalItems === 0) {
      setHealthScore(100) // If no low stock items, score is perfect
      return
    }

    const zeroStockItems = lowStockItems.filter((item) => item.stock === 0).length
    const criticalItems = lowStockItems.filter(
      (item) => item.stock > 0 && item.stock <= Math.max(1, item.min_stock / 2),
    ).length

    // More zero stock items = lower score
    // Ensure we get a non-zero score unless everything is out of stock
    const calculatedScore = Math.max(5, 100 - (zeroStockItems * 15 + criticalItems * 5))

    // Animate the score counting up
    let count = 0
    const interval = setInterval(() => {
      count += 2
      setHealthScore(Math.min(count, calculatedScore))
      if (count >= calculatedScore) clearInterval(interval)
    }, 30)

    // Calculate potential revenue loss (using average price if price not available)
    const avgPrice =
      lowStockItems.reduce((sum, item) => sum + (item.price || 0), 0) /
        lowStockItems.filter((item) => item.price).length || 20

    const estimatedLoss = lowStockItems.reduce((total, item) => {
      const itemPrice = item.price || avgPrice
      // If stock is zero, assume we're missing sales of min_stock items
      if (item.stock === 0) {
        return total + item.min_stock * itemPrice
      }
      // If stock is below minimum, calculate the difference
      return total + Math.max(0, item.min_stock - item.stock) * itemPrice
    }, 0)

    setTotalPotentialLoss(estimatedLoss)
    setPotentialLoss(0)
    setIsAnimatingRevenue(true)

    return () => {
      clearInterval(interval)
    }
  }, [lowStockItems])

  // Separate effect for animating revenue to ensure it runs when the step changes
  useEffect(() => {
    if (currentStep >= 1 && isAnimatingRevenue && totalPotentialLoss > 0) {
      // Start from 0
      setPotentialLoss(0)

      // Animate over 1.5 seconds with 30 steps
      const steps = 30
      const increment = totalPotentialLoss / steps
      let currentValue = 0
      let step = 0

      const interval = setInterval(() => {
        step++
        currentValue = Math.min(totalPotentialLoss, currentValue + increment)
        setPotentialLoss(currentValue)

        if (step >= steps) {
          clearInterval(interval)
          setIsAnimatingRevenue(false)
        }
      }, 50)

      return () => clearInterval(interval)
    }
  }, [currentStep, isAnimatingRevenue, totalPotentialLoss])

  // Auto-advance through steps
  useEffect(() => {
    if (isMinimized) return

    const timer = setTimeout(() => {
      if (currentStep < 3) {
        setCurrentStep((prev) => prev + 1)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [currentStep, isMinimized])

  const handleInventoryUpdate = () => {
    setShowConfetti(true)
    setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 500)
    }, 1500)
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 500)
  }

  // Get health status text and color
  const getHealthStatus = () => {
    if (healthScore < 30) return { text: "Critical", color: "text-red-500" }
    if (healthScore < 60) return { text: "Poor", color: "text-orange-500" }
    if (healthScore < 80) return { text: "Fair", color: "text-yellow-500" }
    return { text: "Good", color: "text-green-500" }
  }

  const healthStatus = getHealthStatus()
  const zeroStockCount = lowStockItems.filter((item) => item.stock === 0).length
  const criticalStockCount = lowStockItems.filter(
    (item) => item.stock > 0 && item.stock < Math.max(1, item.min_stock / 2),
  ).length

  // Determine position classes based on the position prop
  const positionClasses = position === "left" ? "bottom-4 left-4" : "bottom-4 right-4"

  if (!isVisible) return null

  return (
    <div className={`fixed ${positionClasses} z-50`}>
      <AnimatePresence mode="sync">
        {!isMinimized ? (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", damping: 20 }}
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-amber-200 dark:border-amber-800 overflow-hidden w-full max-w-md"
          >
            {/* Confetti effect when user clicks update */}
            {showConfetti && (
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                {Array.from({ length: 100 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    initial={{
                      top: "50%",
                      left: "50%",
                      backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
                    }}
                    animate={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      opacity: [1, 0],
                    }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                ))}
              </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 text-white flex justify-between items-center">
              <div className="flex items-center">
                <BarChart4 className="h-5 w-5 mr-2" />
                <h2 className="text-lg font-bold">Stock Health Monitor</h2>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMinimize}
                  className="h-7 w-7 text-white hover:bg-white/20"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-7 w-7 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <AnimatePresence mode="sync">
                {/* Step 1: Health Score */}
                {currentStep >= 0 && (
                  <motion.div
                    key="health-score"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-base font-medium flex items-center">
                        <AlertTriangle
                          className={cn("mr-2 h-4 w-4", healthScore < 60 ? "text-red-500" : "text-amber-500")}
                        />
                        Inventory Health Score
                      </h3>
                      <Badge
                        className={cn(
                          "text-white",
                          healthScore < 30
                            ? "bg-red-500"
                            : healthScore < 60
                              ? "bg-orange-500"
                              : healthScore < 80
                                ? "bg-yellow-500"
                                : "bg-green-500",
                        )}
                      >
                        {healthStatus.text}
                      </Badge>
                    </div>

                    <div className="relative h-6 mb-2 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden">
                      <motion.div
                        className={cn(
                          "h-full rounded-md",
                          healthScore < 30
                            ? "bg-red-500"
                            : healthScore < 60
                              ? "bg-orange-500"
                              : healthScore < 80
                                ? "bg-yellow-500"
                                : "bg-green-500",
                        )}
                        initial={{ width: "0%" }}
                        animate={{ width: `${healthScore}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm drop-shadow-md">
                        {Math.round(healthScore)}%
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded-lg flex items-center">
                        <div className="bg-red-100 dark:bg-red-900/50 p-1.5 rounded-full mr-2">
                          <ShoppingCart className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                            {zeroStockCount} products
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400">Out of stock</p>
                        </div>
                      </div>

                      {criticalStockCount > 0 ? (
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg flex items-center">
                          <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 rounded-full mr-2">
                            <TrendingDown className="h-4 w-4 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                              {criticalStockCount} products
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">Critically low</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg flex items-center">
                          <div className="bg-amber-100 dark:bg-amber-900/50 p-1.5 rounded-full mr-2">
                            <TrendingDown className="h-4 w-4 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">0 products</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">Critically low</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Potential Revenue Loss */}
                {currentStep >= 1 && (
                  <motion.div
                    key="revenue-loss"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-4"
                  >
                    <h3 className="text-base font-medium flex items-center mb-2">
                      <DollarSign className="mr-2 h-4 w-4 text-red-500" />
                      Estimated Revenue at Risk
                    </h3>

                    <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-900">
                      <div className="flex items-center">
                        <div className="text-xl font-bold text-red-600 dark:text-red-400 min-w-[120px]">
                          {formatCurrency(potentialLoss)}
                        </div>
                        <div className="ml-2 text-xs text-red-700 dark:text-red-300">potential revenue loss</div>
                      </div>

                      {/* Progress indicator for revenue animation */}
                      {isAnimatingRevenue && totalPotentialLoss > 0 && (
                        <div className="mt-2 relative h-1.5 bg-red-200 dark:bg-red-900/30 rounded-full overflow-hidden">
                          <motion.div
                            className="absolute top-0 left-0 h-full bg-red-500"
                            initial={{ width: "0%" }}
                            animate={{ width: `${(potentialLoss / totalPotentialLoss) * 100}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        </div>
                      )}

                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Based on minimum stock levels and current inventory
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Critical Items */}
                {currentStep >= 2 && (
                  <motion.div
                    key="critical-items"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-4"
                  >
                    <h3 className="text-base font-medium flex items-center mb-2">
                      <Package className="mr-2 h-4 w-4 text-amber-500" />
                      Most Critical Items
                    </h3>

                    <div className="bg-white dark:bg-gray-800 border rounded-lg overflow-hidden">
                      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[150px] overflow-y-auto">
                        {lowStockItems
                          .sort((a, b) => a.stock / a.min_stock - b.stock / b.min_stock)
                          .slice(0, 3)
                          .map((item) => (
                            <div key={item.id} className="p-2 flex items-center justify-between">
                              <div className="flex items-center">
                                <div
                                  className={cn(
                                    "w-2 h-2 rounded-full mr-2",
                                    item.stock === 0 ? "bg-red-500" : "bg-amber-500",
                                  )}
                                />
                                <div>
                                  <p className="font-medium text-sm">{item.name}</p>
                                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <span>
                                      {item.stock} / {item.min_stock}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Badge variant={item.stock === 0 ? "destructive" : "outline"}>
                                {item.stock === 0
                                  ? "Out of stock"
                                  : `${Math.round((item.stock / item.min_stock) * 100)}%`}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Call to Action */}
                {currentStep >= 3 && (
                  <motion.div
                    key="cta"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Link     href="/alerts2" target="_blank" rel="noopener noreferrer">
                      <Button
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 group"
                        onClick={handleInventoryUpdate}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        Update Inventory Now
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>

                    <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Maintaining healthy inventory levels can increase sales by up to 25%
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 rounded-full shadow-lg cursor-pointer"
            onClick={handleMinimize}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative">
              <Package className="h-6 w-6 text-white" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {zeroStockCount}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
