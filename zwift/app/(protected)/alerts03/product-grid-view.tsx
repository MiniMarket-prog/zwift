"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-currency"
import { getProxiedImageUrl } from "./image-utils"
import { Package, Calendar, Barcode, TrendingDown, Edit, RotateCcw } from "lucide-react"

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

interface ProductCardViewProps {
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

export function ProductCardView({
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
}: ProductCardViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => {
        const stockNeeded = product.min_stock - product.stock
        const isSelected = selectedProductId === product.id
        const stockPercentage = (product.stock / product.min_stock) * 100

        return (
          <Card
            key={product.id}
            className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
              isSelected ? "ring-2 ring-primary shadow-lg" : ""
            } ${stockNeeded > 0 ? "border-destructive/50" : ""}`}
            onClick={() => onSelectProduct(product.id)}
          >
            <CardHeader className="pb-3">
              <div className="relative">
                <div className="aspect-square w-full mb-3 bg-muted/30 rounded-lg overflow-hidden">
                  <img
                    src={product.image ? getProxiedImageUrl(product.image) : "/placeholder.svg?height=200&width=200"}
                    alt={product.name}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg?height=200&width=200"
                      e.currentTarget.onerror = null
                    }}
                  />
                </div>
                {stockNeeded > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 shadow-md">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    Low Stock
                  </Badge>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1" title={product.name}>
                  {product.name}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center">
                  <Package className="w-3 h-3 mr-1" />
                  {getCategoryName(product.category_id)}
                </p>
              </div>
            </CardHeader>

            <CardContent className="pb-3 space-y-3">
              {/* Price Section */}
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(product.price, currency, language)}
                </span>
                {product.purchase_price && (
                  <span className="text-xs text-muted-foreground">
                    Cost: {formatCurrency(product.purchase_price, currency, language)}
                  </span>
                )}
              </div>

              {/* Stock Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Stock Level</span>
                  <span className="font-medium">
                    {product.stock}/{product.min_stock}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stockPercentage < 50 ? "bg-destructive" : stockPercentage < 80 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, stockPercentage))}%` }}
                  />
                </div>
              </div>

              {/* Stock Needed */}
              {stockNeeded > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-destructive font-medium">Need to restock:</span>
                    <Badge variant="destructive" className="text-xs">
                      {stockNeeded} units
                    </Badge>
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="space-y-1 text-xs text-muted-foreground">
                {product.barcode && (
                  <div className="flex items-center">
                    <Barcode className="w-3 h-3 mr-1" />
                    <span className="truncate">{product.barcode}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>{formatLastSaleDate(lastSaleDates[product.id])}</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onAdjust(product)
                }}
              >
                <Edit className="w-3 h-3 mr-1" />
                Adjust
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onRestock(product)
                }}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Restock
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
