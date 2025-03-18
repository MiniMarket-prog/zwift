import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

// Update the type to match our actual data structure
type InventoryItem = {
  id: string
  name: string
  stock: number // Changed from quantity to stock
  min_stock?: number
  [key: string]: any
}

export function LowStockCard({ items }: { items: InventoryItem[] }) {
  // Get the threshold value
  const getThreshold = (item: InventoryItem) => item.min_stock || 5

  // Filter for low stock items
  const lowStockItems = items
    .filter((item) => item.stock > 0 && item.stock < getThreshold(item))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5)

  console.log("Low stock items:", lowStockItems)
  console.log("Total items received:", items.length)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock Items</CardTitle>
        <CardDescription>Items that need to be restocked soon</CardDescription>
      </CardHeader>
      <CardContent>
        {lowStockItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No low stock items found.</p>
        ) : (
          <div className="space-y-4">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-2 rounded-full p-1 bg-amber-100">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.stock} of {getThreshold(item)} units
                    </p>
                  </div>
                </div>
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{
                      width: `${Math.min(100, (item.stock / getThreshold(item)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <a href="/inventory">View All Inventory</a>
        </Button>
      </CardFooter>
    </Card>
  )
}

