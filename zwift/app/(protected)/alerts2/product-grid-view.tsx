"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format-currency"
import { getProxiedImageUrl } from "./image-utils"

type Product = {
  id: string
  name: string
  price: number
  barcode?: string
  stock: number
  min_stock: number
  category_id?: string | null
  image?: string | null
  purchase_price?: number | null
}

interface ProductGridViewProps {
  products: Product[]
  lastSaleDates: Record<string, string>
  formatLastSaleDate: (date?: string) => string
  getCategoryName: (categoryId?: string | null) => string
  currency: string
  language: string
  onAdjust: (product: Product) => void
  onRestock: (product: Product) => void
  selectedProductId: string | null
  onSelectProduct: (productId: string) => void
}

export function ProductGridView({
  products,
  lastSaleDates,
  formatLastSaleDate,
  getCategoryName,
  currency,
  language,
  onAdjust,
  onRestock,
  selectedProductId,
  onSelectProduct,
}: ProductGridViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {products.map((product) => {
        const stockNeeded = product.min_stock - product.stock
        const isSelected = selectedProductId === product.id

        return (
          <div
            key={product.id}
            className={`border rounded-md p-3 flex flex-col transition-all ${
              isSelected ? "ring-2 ring-primary" : "hover:shadow-md"
            }`}
            onClick={() => onSelectProduct(product.id)}
          >
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16">
                <img
                  src={product.image ? getProxiedImageUrl(product.image) : "/placeholder.jpg"}
                  alt={product.name}
                  className="w-full h-full object-contain rounded-md"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.jpg"
                    e.currentTarget.onerror = null
                  }}
                />
              </div>
            </div>
            <h3 className="text-sm font-medium truncate" title={product.name}>
              {product.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">{getCategoryName(product.category_id)}</p>
            <div className="mt-2 text-xs">
              <div className="flex justify-between">
                <span>Stock:</span>
                <span className="font-medium">{product.stock}</span>
              </div>
              <div className="flex justify-between">
                <span>Needed:</span>
                <span>
                  {stockNeeded > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      {stockNeeded}
                    </Badge>
                  ) : (
                    <Badge className="text-xs">{stockNeeded}</Badge>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Price:</span>
                <span className="font-medium">{formatCurrency(product.price, currency, language)}</span>
              </div>
            </div>
            <div className="mt-auto pt-2 flex justify-between gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2 flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onAdjust(product)
                }}
              >
                Adjust
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-7 px-2 flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onRestock(product)
                }}
              >
                Restock
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
