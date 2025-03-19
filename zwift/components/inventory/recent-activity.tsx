import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ArrowDown, ArrowUp, Package } from "lucide-react"
import type { InventoryActivity } from "@/app/actions/inventory-activity"

export function RecentActivityCard({ activities }: { activities: InventoryActivity[] }) {
  // Debug: Log the activities being passed to the component
  console.log("Activities in RecentActivityCard:", activities)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest inventory changes</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent inventory activity found.</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-2 rounded-full p-1.5 bg-muted">
                    {activity.quantity_change > 0 ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : activity.quantity_change < 0 ? (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {/* Debug: Show both product_name and ID */}
                      {activity.product_name || `Unknown (ID: ${activity.product_id})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.action_type}: {Math.abs(activity.quantity_change)} units
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {activity.previous_quantity} → {activity.new_quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

