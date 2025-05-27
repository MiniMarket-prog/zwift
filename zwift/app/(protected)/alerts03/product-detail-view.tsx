"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/format-currency"
import { getProxiedImageUrl } from "./image-utils"
import { Package, DollarSign, Calendar, Barcode, Edit, RotateCcw, AlertTriangle, CheckCircle } from "lucide-react"

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
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center space-y-3">
            <Package className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Select a product to view details</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const stockNeeded = product.min_stock - product.stock
  const stockPercentage = (product.stock / product.min_stock) * 100
  const profitMargin = product.purchase_price ? ((product.price - product.purchase_price) / product.price) * 100 : null

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-20 h-20 bg-muted/30 rounded-lg overflow-hidden">
              <img
                src={product.image ? getProxiedImageUrl(product.image) : "/placeholder.svg?height=200&width=200"}
                alt={product.name}
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=200&width=200"
                  e.currentTarget.onerror = null
                }}
              />
            </div>
            {stockNeeded > 0 && (
              <div className="absolute -top-1 -right-1">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight mb-2">{product.name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              <span>{getCategoryName(product.category_id)}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stock Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Stock Status
            </h4>
            {stockNeeded > 0 ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                Low Stock
              </Badge>
            ) : (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                In Stock
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="font-semibold text-lg">{product.stock}</div>
              <div className="text-muted-foreground">Current</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="font-semibold text-lg">{product.min_stock}</div>
              <div className="text-muted-foreground">Minimum</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className={`font-semibold text-lg ${stockNeeded > 0 ? "text-destructive" : "text-green-600"}`}>
                {stockNeeded > 0 ? stockNeeded : "✓"}
              </div>
              <div className="text-muted-foreground">Needed</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Stock Level</span>
              <span className="font-medium">{Math.round(stockPercentage)}%</span>
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
        </div>

        <Separator />

        {/* Pricing Information */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Pricing
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Selling Price</div>
              <div className="text-xl font-bold text-primary">{formatCurrency(product.price, currency, language)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Purchase Price</div>
              <div className="text-lg font-semibold">
                {product.purchase_price ? formatCurrency(product.purchase_price, currency, language) : "N/A"}
              </div>
            </div>
          </div>
          {profitMargin !== null && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Profit Margin</span>
                <Badge variant={profitMargin > 0 ? "default" : "destructive"}>
                  {profitMargin > 0 ? `+${profitMargin.toFixed(1)}%` : `${profitMargin.toFixed(1)}%`}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Additional Information */}
        <div className="space-y-3">
          <h4 className="font-medium">Additional Information</h4>
          <div className="space-y-2 text-sm">
            {product.barcode && (
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <div className="flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Barcode</span>
                </div>
                <span className="font-mono text-xs">{product.barcode}</span>
              </div>
            )}
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last Sale</span>
              </div>
              <span>{formatLastSaleDate(lastSaleDate)}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onAdjust(product)}>
            <Edit className="w-4 h-4 mr-2" />
            Adjust Stock
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => onRestock(product)}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Quick Restock
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
