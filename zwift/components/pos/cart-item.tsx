"use client"

import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format-currency"
import { Minus, Plus, Trash2 } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"

interface CartItemProps {
  item: {
    id: string
    product_id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      price: number
      image?: string | null
    }
  }
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemoveItem: (id: string) => void
  currency: string
}

export function CartItem({ item, onUpdateQuantity, onRemoveItem, currency }: CartItemProps) {
  const { language } = useLanguage()

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center">
        {item.product.image ? (
          <div className="h-10 w-10 rounded overflow-hidden mr-3">
            <img
              src={item.product.image || "/placeholder.svg"}
              alt={item.product.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-10 w-10 bg-muted rounded flex items-center justify-center mr-3">
            <span className="text-xs">No img</span>
          </div>
        )}
        <div>
          <p className="font-medium">{item.product.name}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(item.price, currency, language)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          disabled={item.quantity <= 1}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemoveItem(item.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

