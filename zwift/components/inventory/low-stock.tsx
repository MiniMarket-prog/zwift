import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { InventoryItem } from "@/app/actions/inventory"
import { Progress } from "@/components/ui/progress"

export function LowStockCard({ items }: { items: InventoryItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock</CardTitle>
        <CardDescription>Items that need to be restocked soon</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No low stock items found.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.stock} / {item.min_stock}
                  </p>
                </div>
                <Progress
                  value={(item.stock / item.min_stock) * 100}
                  className={item.stock === 0 ? "bg-destructive/20" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  {item.barcode && `SKU: ${item.barcode}`}
                  {item.category_id && ` | Category ID: ${item.category_id}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

