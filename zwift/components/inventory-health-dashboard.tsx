"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, TrendingDown, DollarSign, BarChart3, Package, ArrowRight, X, Clock } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface StockItem {
  id: string
  name: string
  stock: number
  min_stock: number
  price: number
}

interface InventoryHealthDashboardProps {
  lowStockItems: StockItem[]
  onClose: () => void
  onDismiss: () => void
}

export function InventoryHealthDashboard({ lowStockItems, onClose, onDismiss }: InventoryHealthDashboardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [healthScore, setHealthScore] = useState(0)
  const [potentialLoss, setPotentialLoss] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)

  // Calculate inventory health metrics
  useEffect(() => {
    // Delay appearance for better UX
    setTimeout(() => setIsVisible(true), 500)

    // Calculate health score (0-100)
    const totalItems = lowStockItems.length
    const zeroStockItems = lowStockItems.filter((item) => item.stock === 0).length
    const criticalItems = lowStockItems.filter((item) => item.stock > 0 && item.stock <= item.min_stock / 2).length

    // More zero stock items = lower score
    const calculatedScore = Math.max(0, 100 - zeroStockItems * 15 - criticalItems * 5)

    // Animate the score counting up
    let count = 0
    const interval = setInterval(() => {
      count += 2
      setHealthScore(Math.min(count, calculatedScore))
      if (count >= calculatedScore) clearInterval(interval)
    }, 30)

    // Calculate potential revenue loss
    const estimatedLoss = lowStockItems.reduce((total, item) => {
      // If stock is zero, assume we're missing sales of min_stock items
      if (item.stock === 0) {
        return total + item.min_stock * item.price
      }
      // If stock is below minimum, calculate the difference
      return total + Math.max(0, item.min_stock - item.stock) * item.price
    }, 0)

    // Animate the potential loss counting up
    let lossCount = 0
    const lossInterval = setInterval(() => {
      lossCount += estimatedLoss / 50
      setPotentialLoss(Math.min(lossCount, estimatedLoss))
      if (lossCount >= estimatedLoss) clearInterval(lossInterval)
    }, 30)

    return () => {
      clearInterval(interval)
      clearInterval(lossInterval)
    }
  }, [lowStockItems])

  // Auto-advance through steps
  useEffect(() => {
    if (!isVisible) return

    const timer = setTimeout(() => {
      if (currentStep < 3) {
        setCurrentStep((prev) => prev + 1)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [currentStep, isVisible])

  const handleInventoryUpdate = () => {
    setShowConfetti(true)
    setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 500)
    }, 1500)
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 500)
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
  const criticalStockCount = lowStockItems.filter((item) => item.stock > 0 && item.stock < item.min_stock / 2).length

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <motion.div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden w-full max-w-2xl relative"
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 15 }}
          >
            {/* Confetti effect when user clicks update */}
            {showConfetti && (
              <div className="absolute inset-0 z-10 pointer-events-none">
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
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center">
                <BarChart3 className="h-6 w-6 mr-2" />
                <h2 className="text-xl font-bold">Inventory Health Dashboard</h2>
              </div>
              <button onClick={handleDismiss} className="text-white/80 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Step 1: Health Score */}
              <AnimatePresence mode="wait">
                {currentStep >= 0 && (
                  <motion.div
                    key="health-score"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-6"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <AlertTriangle
                          className={cn("mr-2 h-5 w-5", healthScore < 60 ? "text-red-500" : "text-amber-500")}
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

                    <div className="relative h-8 mb-2">
                      <Progress
                        value={healthScore}
                        className="h-8 rounded-md"
                        indicatorClassName={cn(
                          healthScore < 30
                            ? "bg-red-500"
                            : healthScore < 60
                              ? "bg-orange-500"
                              : healthScore < 80
                                ? "bg-yellow-500"
                                : "bg-green-500",
                        )}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                        {Math.round(healthScore)}%
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg flex items-center">
                        <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full mr-3">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                            {zeroStockCount} products
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400">Out of stock</p>
                        </div>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg flex items-center">
                        <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-full mr-3">
                          <TrendingDown className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                            {criticalStockCount} products
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400">Critically low</p>
                        </div>
                      </div>
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
                    className="mb-6"
                  >
                    <h3 className="text-lg font-medium flex items-center mb-3">
                      <DollarSign className="mr-2 h-5 w-5 text-red-500" />
                      Estimated Revenue at Risk
                    </h3>

                    <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-900">
                      <div className="flex items-center">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          ${potentialLoss.toFixed(2)}
                        </div>
                        <div className="ml-3 text-sm text-red-700 dark:text-red-300">
                          potential revenue loss due to stock issues
                        </div>
                      </div>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
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
                    className="mb-6"
                  >
                    <h3 className="text-lg font-medium flex items-center mb-3">
                      <Package className="mr-2 h-5 w-5 text-amber-500" />
                      Most Critical Items
                    </h3>

                    <div className="bg-white dark:bg-gray-800 border rounded-lg overflow-hidden">
                      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[200px] overflow-y-auto">
                        {lowStockItems
                          .sort((a, b) => a.stock / (a.min_stock || 1) - b.stock / (b.min_stock || 1))
                          .slice(0, 5)
                          .map((item) => (
                            <div key={item.id} className="p-3 flex items-center justify-between">
                              <div className="flex items-center">
                                <div
                                  className={cn(
                                    "w-2 h-2 rounded-full mr-3",
                                    item.stock === 0 ? "bg-red-500" : "bg-amber-500",
                                  )}
                                />
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center">
                                      <Package className="h-3 w-3 mr-1" />
                                      {item.stock} in stock
                                    </span>
                                    <span className="mx-2">•</span>
                                    <span className="flex items-center">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Min: {item.min_stock}
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
                    className="mt-8"
                  >
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href="/alerts2" target="_blank" rel="noopener noreferrer">
                        <Button
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 group"
                          size="lg"
                          onClick={handleInventoryUpdate}
                        >
                          <Package className="mr-2 h-5 w-5" />
                          Update Inventory Now
                          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>

                      <Button variant="outline" className="flex-1" size="lg" onClick={handleDismiss}>
                        <Clock className="mr-2 h-5 w-5" />
                        Remind Me Later
                      </Button>
                    </div>

                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                      Maintaining healthy inventory levels can increase sales by up to 25%
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
