"use client"

import { getProxiedImageUrl } from "./image-utils"
import { Badge } from "@/components/ui/badge"

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

type ProductImageGridProps = {
  products: Product[]
  onSelectProduct: (product: Product) => void
  formatCurrency: (amount: number, currency: string, locale: string) => string
  currency: string
  locale: string
  getCategoryName: (categoryId: string | null | undefined) => string
}

export function ProductImageGrid({
  products,
  onSelectProduct,
  formatCurrency,
  currency,
  locale,
  getCategoryName,
}: ProductImageGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {products.map((product) => {
        const stockNeeded = product.min_stock - product.stock

        return (
          <div
            key={product.id}
            className="bg-card rounded-lg shadow-sm overflow-hidden border border-border hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onSelectProduct(product)}
          >
            <div className="aspect-square bg-white relative">
              <img
                src={product.image ? getProxiedImageUrl(product.image) : "/placeholder.svg?height=200&width=200"}
                alt={product.name}
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=200&width=200"
                  e.currentTarget.onerror = null
                }}
              />
              {stockNeeded > 0 && (
                <Badge variant="destructive" className="absolute top-2 right-2">
                  {stockNeeded} needed
                </Badge>
              )}
            </div>

            <div className="p-3">
              <h3 className="font-medium text-sm line-clamp-2 h-10">{product.name}</h3>

              <div className="mt-2 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Stock: {product.stock}/{product.min_stock}
                </span>
                <span className="font-semibold">{formatCurrency(product.price, currency, locale)}</span>
              </div>

              <div className="mt-1 text-xs text-muted-foreground truncate">{getCategoryName(product.category_id)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
