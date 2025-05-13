"use client"

import type React from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CartItemQuantityProps {
  itemId: string
  quantity: number
  onQuantityChange: (itemId: string, quantity: number) => void
  maxQuantity?: number
  minQuantity?: number
}

export function CartItemQuantity({
  itemId,
  quantity,
  onQuantityChange,
  maxQuantity = 999,
  minQuantity = 1,
}: CartItemQuantityProps) {
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = Number.parseInt(e.target.value, 10) || minQuantity
    if (newQuantity >= minQuantity && newQuantity <= maxQuantity) {
      onQuantityChange(itemId, newQuantity)
    }
  }

  const incrementQuantity = () => {
    if (quantity < maxQuantity) {
      onQuantityChange(itemId, quantity + 1)
    }
  }

  const decrementQuantity = () => {
    if (quantity > minQuantity) {
      onQuantityChange(itemId, quantity - 1)
    }
  }

  return (
    <div className="flex items-center space-x-1">
      <div className="flex flex-col">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-sm p-0"
          onClick={incrementQuantity}
          disabled={quantity >= maxQuantity}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-sm p-0"
          onClick={decrementQuantity}
          disabled={quantity <= minQuantity}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
      <div className="w-8 h-8 border rounded flex items-center justify-center bg-white">
        <span className="text-sm font-medium">{quantity}</span>
      </div>
    </div>
  )
}
