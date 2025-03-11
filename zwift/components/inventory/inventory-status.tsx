import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type InventoryItem = {
  id: string
  name: string
  quantity?: number
  stock: number
  threshold?: number
  min_stock?: number
  [key: string]: any
}

export function InventoryStatusCard({ items }: { items: InventoryItem[] }) {
  console.log("InventoryStatusCard received items:", items.length)

  // Calculate inventory status
  const getThreshold = (item: InventoryItem) => {
    // Use min_stock if available, otherwise use threshold, or default to 5
    return item.min_stock !== undefined && item.min_stock !== null
      ? item.min_stock
      : item.threshold !== undefined && item.threshold !== null
        ? item.threshold
        : 5
  }

  // Use stock field for inventory quantity
  const getStock = (item: InventoryItem) => {
    return item.stock !== undefined ? item.stock : item.quantity || 0
  }

  const outOfStock = items.filter((item) => getStock(item) === 0).length
  const lowStock = items.filter((item) => {
    const stock = getStock(item)
    const threshold = getThreshold(item)
    return stock > 0 && stock < threshold
  }).length
  const healthyStock = items.filter((item) => getStock(item) >= getThreshold(item)).length

  console.log("Inventory status calculation:", { outOfStock, lowStock, healthyStock })

  const total = items.length

  // Calculate percentages
  const outOfStockPercent = Math.round((outOfStock / total) * 100) || 0
  const lowStockPercent = Math.round((lowStock / total) * 100) || 0
  const healthyStockPercent = Math.round((healthyStock / total) * 100) || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Status</CardTitle>
        <CardDescription>Overview of your current inventory levels</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-500">{healthyStock}</div>
              <div className="text-sm text-muted-foreground">Healthy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-500">{lowStock}</div>
              <div className="text-sm text-muted-foreground">Low Stock</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{outOfStock}</div>
              <div className="text-sm text-muted-foreground">Out of Stock</div>
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-full rounded-l-full bg-green-500"
              style={{ width: `${healthyStockPercent}%`, display: "inline-block" }}
            />
            <div className="h-full bg-amber-500" style={{ width: `${lowStockPercent}%`, display: "inline-block" }} />
            <div
              className="h-full rounded-r-full bg-red-500"
              style={{ width: `${outOfStockPercent}%`, display: "inline-block" }}
            />
          </div>

          <div className="text-xs text-center text-muted-foreground">
            {healthyStockPercent}% Healthy • {lowStockPercent}% Low Stock • {outOfStockPercent}% Out of Stock
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

