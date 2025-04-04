"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CartItemDiscountProps {
  itemId: string
  initialDiscount?: number
  onDiscountChange: (itemId: string, discount: number) => void
  maxDiscount?: number
}

export function CartItemDiscount({
  itemId,
  initialDiscount = 0,
  onDiscountChange,
  maxDiscount = 100,
}: CartItemDiscountProps) {
  const [discount, setDiscount] = useState(initialDiscount)

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value) || 0
    const clampedValue = Math.min(Math.max(0, value), maxDiscount)
    setDiscount(clampedValue)
    onDiscountChange(itemId, clampedValue)
  }

  useEffect(() => {
    setDiscount(initialDiscount)
  }, [initialDiscount])

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={`discount-${itemId}`} className="text-sm whitespace-nowrap">
        Discount %:
      </Label>
      <Input
        id={`discount-${itemId}`}
        type="number"
        min="0"
        max={maxDiscount}
        value={discount}
        onChange={handleDiscountChange}
        className="w-16 h-8 text-right"
      />
    </div>
  )
}

