"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { updatePurchaseOrderStatus, receivePurchaseOrder, getPurchaseOrders } from "@/app/actions/purchase-orders"
import { CreatePurchaseOrderButton } from "./CreatePurchaseOrderButton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { Package, MoreHorizontal, Truck, CheckCircle, XCircle, FileText, RefreshCw } from "lucide-react"

// Define types
type PurchaseOrder = {
  id: string
  order_number: string
  supplier_name?: string | null
  status: "pending" | "approved" | "shipped" | "received" | "cancelled"
  total_amount: number
  expected_delivery_date?: string | null
  created_at: string
  updated_at?: string | null
}

export default function PurchaseOrdersClient() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [dbSetupRequired, setDbSetupRequired] = useState(false)
  const { toast } = useToast()

  // Fetch purchase orders
  const fetchPurchaseOrders = async () => {
    setIsLoading(true)
    try {
      console.log("Fetching purchase orders...")
      const result = await getPurchaseOrders()

      if (result.error) {
        // Check if the error is about the table not existing
        if ((result.error as any)?.code === "42P01") {
          setDbSetupRequired(true)
        } else {
          throw result.error
        }
      } else {
        setPurchaseOrders(result.data as PurchaseOrder[])
        setFilteredOrders(result.data as PurchaseOrder[])
        setDbSetupRequired(false)
      }
    } catch (error) {
      console.error("Error fetching purchase orders:", error)
      toast({
        title: "Error",
        description: "Failed to load purchase orders",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = [...purchaseOrders]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.order_number.toLowerCase().includes(term) ||
          (order.supplier_name && order.supplier_name.toLowerCase().includes(term)) ||
          order.status.toLowerCase().includes(term),
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }, [purchaseOrders, searchTerm, statusFilter])

  // Handle status update
  const handleStatusUpdate = async (orderId: string, newStatus: PurchaseOrder["status"]) => {
    try {
      setIsUpdating(true)

      if (newStatus === "received") {
        await receivePurchaseOrder(orderId)
      } else {
        await updatePurchaseOrderStatus(orderId, newStatus)
      }

      // Update the local state
      setPurchaseOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus, updated_at: new Date().toISOString() } : order,
        ),
      )

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Get badge color based on status
  const getStatusBadge = (status: PurchaseOrder["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Approved
          </Badge>
        )
      case "shipped":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Shipped
          </Badge>
        )
      case "received":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Received
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // If database setup is required, show the setup instructions
  if (dbSetupRequired) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Database Setup Required</CardTitle>
            <CardDescription>The purchase orders tables need to be created in your database.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Please run the following SQL script in your Supabase SQL editor to create the necessary tables:</p>
              <pre className="bg-slate-100 p-4 rounded-md overflow-x-auto text-sm">
                {`-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL,
  supplier_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  expected_delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON purchase_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON purchase_order_items(product_id);`}
              </pre>
              <Button onClick={fetchPurchaseOrders} className="mt-4">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage your purchase orders and track inventory restocking</p>
        </div>
        <CreatePurchaseOrderButton onOrderCreated={fetchPurchaseOrders} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>All Purchase Orders</CardTitle>
              <CardDescription>View and manage your purchase orders</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-[200px]"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchPurchaseOrders}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Order #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Supplier</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm">{order.order_number}</td>
                      <td className="px-4 py-3 text-sm">{order.supplier_name || "N/A"}</td>
                      <td className="px-4 py-3 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">{getStatusBadge(order.status)}</td>
                      <td className="px-4 py-3 text-sm">${order.total_amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedOrder(order)
                                setIsDetailsOpen(true)
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {order.status === "pending" && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, "approved")}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {order.status === "approved" && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, "shipped")}>
                                <Truck className="mr-2 h-4 w-4" />
                                Mark as Shipped
                              </DropdownMenuItem>
                            )}
                            {order.status === "shipped" && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, "received")}>
                                <Package className="mr-2 h-4 w-4" />
                                Receive Order
                              </DropdownMenuItem>
                            )}
                            {(order.status === "pending" || order.status === "approved") && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, "cancelled")}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Order
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No purchase orders found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "Try changing your search or filter criteria"
                  : "Create your first purchase order to get started"}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              Showing {filteredOrders.length} of {purchaseOrders.length} orders
            </p>
          </div>
        </CardFooter>
      </Card>

      {/* Order Details Dialog */}
      {selectedOrder && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>Details for purchase order {selectedOrder.order_number}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Order #</Label>
                <div className="col-span-3">{selectedOrder.order_number}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Supplier</Label>
                <div className="col-span-3">{selectedOrder.supplier_name || "N/A"}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Status</Label>
                <div className="col-span-3">{getStatusBadge(selectedOrder.status)}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Total</Label>
                <div className="col-span-3">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(selectedOrder.total_amount)}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Created</Label>
                <div className="col-span-3">{format(new Date(selectedOrder.created_at), "PPP")}</div>
              </div>
              {selectedOrder.expected_delivery_date && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Expected Delivery</Label>
                  <div className="col-span-3">{format(new Date(selectedOrder.expected_delivery_date), "PPP")}</div>
                </div>
              )}
              {selectedOrder.updated_at && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Last Updated</Label>
                  <div className="col-span-3">{format(new Date(selectedOrder.updated_at), "PPP")}</div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
              {selectedOrder.status === "pending" && (
                <Button
                  onClick={() => {
                    handleStatusUpdate(selectedOrder.id, "approved")
                    setIsDetailsOpen(false)
                  }}
                  disabled={isUpdating}
                >
                  Approve Order
                </Button>
              )}
              {selectedOrder.status === "approved" && (
                <Button
                  onClick={() => {
                    handleStatusUpdate(selectedOrder.id, "shipped")
                    setIsDetailsOpen(false)
                  }}
                  disabled={isUpdating}
                >
                  Mark as Shipped
                </Button>
              )}
              {selectedOrder.status === "shipped" && (
                <Button
                  onClick={() => {
                    handleStatusUpdate(selectedOrder.id, "received")
                    setIsDetailsOpen(false)
                  }}
                  disabled={isUpdating}
                >
                  Receive Order
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

