// Add this at the top of the file to force dynamic rendering
export const dynamic = "force-dynamic"

import { Suspense } from "react"
import { getInventoryItems, getLowStockItems } from "@/app/actions/inventory"
import { InventoryStatusCard } from "@/components/inventory/inventory-status"
import { LowStockCard } from "@/components/inventory/low-stock"
import { DebugSupabase } from "@/components/debug-supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Loading fallback component
function LoadingCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Loading data...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-40 flex items-center justify-center">
          <div className="animate-pulse h-4 w-3/4 bg-muted rounded"></div>
        </div>
      </CardContent>
    </Card>
  )
}

// Inventory status with data fetching and debugging
async function InventoryStatus() {
  const items = await getInventoryItems()
  return (
    <div className="space-y-4">
      <InventoryStatusCard items={items} />
      <DebugSupabase items={items} />
    </div>
  )
}

// Low stock items with data fetching
async function LowStock() {
  const items = await getLowStockItems()
  return <LowStockCard items={items} />
}

export default function InventoryPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="col-span-1">
        <Suspense fallback={<LoadingCard title="Inventory Status" />}>
          <InventoryStatus />
        </Suspense>
      </div>
      <div className="col-span-1">
        <Suspense fallback={<LoadingCard title="Low Stock" />}>
          <LowStock />
        </Suspense>
      </div>
      <div className="col-span-1 md:col-span-2 lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest inventory changes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Recent inventory activity will be displayed here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

