"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"

export interface InventoryValueCardProps {
  products: any[]
}

export function InventoryValueCard({ products }: InventoryValueCardProps) {
  if (!products || !products.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
          <CardDescription>Total value of current stock</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$--.--</div>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  const inventoryValue = products.reduce((total, product) => {
    const quantity = product.stock || 0 // Changed from quantity to stock
    const cost = product.purchase_price || 0 // Changed from cost_price to purchase_price
    return total + quantity * cost
  }, 0)

  const totalItems = products.reduce((total, product) => total + (product.stock || 0), 0) // Changed from quantity to stock

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Package className="h-4 w-4 mr-2 text-blue-500" />
          Inventory Value
        </CardTitle>
        <CardDescription>Total value of current stock</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${inventoryValue.toFixed(2)}</div>
        <p className="text-xs text-muted-foreground">
          {totalItems} items across {products.length} products
        </p>
      </CardContent>
    </Card>
  )
}

