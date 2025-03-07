"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { BarChart, LineChart } from "@/components/ui/chart"
import { useToast } from "@/components/ui/use-toast"

export default function ReportsPage() {
  const { toast } = useToast()
  const [date, setDate] = useState<Date | undefined>(new Date())

  // Sample data for charts
  const salesData = [
    { name: "Jan", sales: 4000 },
    { name: "Feb", sales: 3000 },
    { name: "Mar", sales: 5000 },
    { name: "Apr", sales: 4000 },
    { name: "May", sales: 7000 },
    { name: "Jun", sales: 6000 },
    { name: "Jul", sales: 8000 },
    { name: "Aug", sales: 9000 },
    { name: "Sep", sales: 8000 },
    { name: "Oct", sales: 10000 },
    { name: "Nov", sales: 11000 },
    { name: "Dec", sales: 12000 },
  ]

  const inventoryData = [
    { name: "Product A", stock: 120 },
    { name: "Product B", stock: 80 },
    { name: "Product C", stock: 40 },
    { name: "Product D", stock: 200 },
    { name: "Product E", stock: 150 },
  ]

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">Reports</h1>

      <Tabs defaultValue="sales" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>
          <Select defaultValue="monthly">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231.89</div>
                <p className="text-xs text-muted-foreground">+20.1% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$32.50</div>
                <p className="text-xs text-muted-foreground">+12.5% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,392</div>
                <p className="text-xs text-muted-foreground">+8.2% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3.2%</div>
                <p className="text-xs text-muted-foreground">+1.1% from last month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>Monthly sales performance</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <div className="h-full w-full">
                <div className="h-full w-full">
                  <LineChart data={salesData} xAxisDataKey="name" yAxisDataKey="sales" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
              <CardDescription>Current stock levels</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <div className="h-full w-full">
                <BarChart data={inventoryData} xAxisDataKey="name" yAxisDataKey="stock" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Analytics</CardTitle>
              <CardDescription>Select a date to view customer data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <CalendarComponent mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
                <button
                  className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground"
                  onClick={() => {
                    toast({
                      title: "Report Generated",
                      description: `Customer report for ${date ? format(date, "PPP") : "today"} has been generated.`,
                    })
                  }}
                >
                  Generate Report
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

