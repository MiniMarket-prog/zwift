"use client"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-currency"
import { ShoppingCart } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"

interface ProductCardProps {
  product: {
    id: string
    name: string
    price: number
    image?: string | null
    stock: number
    barcode?: string
  }
  onAddToCart: (product: any) => void
  currency: string
}

export function ProductCard({ product, onAddToCart, currency }: ProductCardProps) {
  const { language } = useLanguage()

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onAddToCart(product)}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-12 w-12 relative bg-muted rounded-md overflow-hidden flex-shrink-0">
          {product.image ? (
            <img
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error("Image failed to load:", product.image)
                e.currentTarget.src = "/placeholder.svg"
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{product.name}</p>
          <div className="flex justify-between items-center">
            <p className="text-sm font-bold">{formatCurrency(product.price, currency, language)}</p>
            <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

