import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { InventoryItem } from "@/app/actions/inventory"

export function InventoryStatusCard({ items }: { items: InventoryItem[] }) {
  // Calculate total items and categories
  const totalItems = items.length
  const categories = [...new Set(items.map((item) => item.category_id))].filter(Boolean).length
  const totalQuantity = items.reduce((sum, item) => sum + item.stock, 0)

  // Calculate stock health (percentage of items that are not low stock)
  const lowStockItems = items.filter((item) => item.stock < item.min_stock).length
  const stockHealth = totalItems > 0 ? 100 - (lowStockItems / totalItems) * 100 : 100

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Status</CardTitle>
        <CardDescription>Overview of your current inventory</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold">{categories}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Stock Health</p>
            <div className="flex items-center gap-2">
              <Progress value={stockHealth} />
              <span className="text-sm font-medium">{Math.round(stockHealth)}%</span>
            </div>
            <p className="text-xs text-muted-foreground">{lowStockItems} items below threshold</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Total Quantity</p>
            <p className="text-2xl font-bold">{totalQuantity}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

