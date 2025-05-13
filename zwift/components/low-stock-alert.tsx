"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, X, ArrowRight, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface LowStockAlertProps {
  lowStockItems: Array<{
    id: string
    name: string
    stock: number
    min_stock: number
  }>
  onClose: () => void
}

export function LowStockAlert({ lowStockItems, onClose }: LowStockAlertProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isClosing, setIsClosing] = useState(false)

  // Auto-hide after 15 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, 15000)

    return () => clearTimeout(timer)
  }, [])

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 300)
  }

  // Count zero stock items
  const zeroStockCount = lowStockItems.filter((item) => item.stock === 0).length

  if (!isVisible || lowStockItems.length === 0) {
    return null
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 w-80 transition-all duration-300 ${
        isClosing ? "opacity-0 translate-x-5" : "opacity-100 translate-x-0"
      }`}
    >
      <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg shadow-lg overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              <h3 className="font-bold text-amber-800">Low Stock Alert</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-amber-400 hover:text-amber-600 transition-colors"
              aria-label="Close alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {zeroStockCount > 0 && (
            <p className="text-amber-700 font-medium mt-2">
              {zeroStockCount} product{zeroStockCount !== 1 ? "s" : ""} with zero stock!
            </p>
          )}

          <div className="mt-3 space-y-2">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-sm truncate max-w-[180px]">{item.name}</span>
                <Badge
                  variant={item.stock === 0 ? "destructive" : "outline"}
                  className={item.stock === 0 ? "bg-red-500 hover:bg-red-500" : ""}
                >
                  {item.stock === 0 ? "0 in stock" : `${item.stock} in stock`}
                </Badge>
              </div>
            ))}
          </div>

          {lowStockItems.length > 5 && (
            <div className="text-sm text-amber-600 mt-2">+{lowStockItems.length - 5} more items with low stock</div>
          )}

          <div className="mt-4">
            <Link href="/alerts2"     target="_blank"  rel="noopener noreferrer">
            
              <Button
                variant="outline"
                className="w-full bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 hover:border-amber-400 flex items-center justify-center"
              >
                <Package className="mr-2 h-4 w-4" />
                Update Inventory
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
