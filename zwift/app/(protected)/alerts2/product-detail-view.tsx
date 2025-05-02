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

interface ProductDetailViewProps {
  product: Product | null
  lastSaleDate?: string
  formatLastSaleDate: (date?: string) => string
  getCategoryName: (categoryId?: string | null) => string
  currency: string
  language: string
  onAdjust: (product: Product) => void
  onRestock: (product: Product) => void
}

export function ProductDetailView({
  product,
  lastSaleDate,
  formatLastSaleDate,
  getCategoryName,
  currency,
  language,
  onAdjust,
  onRestock,
}: ProductDetailViewProps) {
  if (!product) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a product to view details</p>
      </div>
    )
  }

  const stockNeeded = product.min_stock - product.stock

  return (
    <div className="p-4 border rounded-md bg-background">
      <div className="flex flex-col items-center mb-4">
        <div className="w-24 h-24 mb-2">
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
        <h3 className="text-lg font-semibold text-center">{product.name}</h3>
        <p className="text-sm text-muted-foreground">{getCategoryName(product.category_id)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div className="flex flex-col">
          <span className="text-muted-foreground">Price:</span>
          <span className="font-medium">{formatCurrency(product.price, currency, language)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Purchase Price:</span>
          <span className="font-medium">
            {product.purchase_price ? formatCurrency(product.purchase_price, currency, language) : "N/A"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Current Stock:</span>
          <span className="font-medium">{product.stock}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Min Stock:</span>
          <span className="font-medium">{product.min_stock}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Stock Needed:</span>
          <span className="font-medium">
            {stockNeeded > 0 ? (
              <Badge variant="destructive" className="font-medium">
                {stockNeeded}
              </Badge>
            ) : (
              <Badge className="font-medium">{stockNeeded}</Badge>
            )}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Last Sale:</span>
          <span className="font-medium">{formatLastSaleDate(lastSaleDate)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground">Barcode:</span>
          <span className="font-medium truncate">{product.barcode || "N/A"}</span>
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <Button variant="outline" size="sm" onClick={() => onAdjust(product)}>
          Adjust
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onRestock(product)}>
          Restock
        </Button>
      </div>
    </div>
  )
}
