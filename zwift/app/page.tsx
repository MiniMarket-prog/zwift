"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, Users, Package, CreditCard, AlertTriangle } from "lucide-react"
import { getDashboardStats } from "@/lib/supabase"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useEffect, useState } from "react"
import type { DashboardStats } from "@/types/dashboard"

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    productsCount: 0,
    customersCount: 0,
    salesCount: 0,
    lowStockCount: 0,
    lowStockProducts: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        setIsLoading(true)
        const dashboardStats = await getDashboardStats()
        setStats(dashboardStats)
      } catch (error) {
        console.error("Error fetching dashboard stats:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard statistics",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${isLoading ? "..." : stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">+20.1% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.customersCount}</div>
                <p className="text-xs text-muted-foreground">+180.1% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.productsCount}</div>
                <p className="text-xs text-muted-foreground">+19% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.salesCount}</div>
                <p className="text-xs text-muted-foreground">+201 since last hour</p>
              </CardContent>
            </Card>
          </div>

          {stats.lowStockCount > 0 && (
            <Card className="border-red-200">
              <CardHeader className="flex flex-row items-center pb-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">{stats.lowStockCount} products are below minimum stock levels.</p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/inventory">View Inventory</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="analytics" className="h-[400px] flex items-center justify-center border rounded-md">
          <p className="text-muted-foreground">Analytics data will be displayed here</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}

