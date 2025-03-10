import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"
import Image from "next/image"

type TopProduct = {
  id: string
  name: string
  total_sold: number
  revenue: number
  image?: string | null
  stock?: number
  min_stock?: number
}

export function TopProductsCard({ products }: { products: TopProduct[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
        <CardDescription>Products with the highest sales volume</CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales data available.</p>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex items-center">
                  <div className="h-10 w-10 relative bg-muted rounded overflow-hidden flex-shrink-0 mr-3">
                    {product.image ? (
                      <Image
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">${product.revenue.toFixed(2)} revenue</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{product.total_sold} sold</p>
                  {product.stock !== undefined && product.min_stock !== undefined && (
                    <p className={`text-xs ${product.stock < product.min_stock ? "text-amber-500" : "text-green-500"}`}>
                      {product.stock} in stock
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

