"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DataTable } from "@/components/ui/data-table"
import { Loader2, Download, Filter, RefreshCw, BarChart3, PieChart, LineChart, Search } from "lucide-react"
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns"
import { getRecentInventoryActivity } from "@/app/actions/inventory-activity"
import type { InventoryActivity } from "@/app/actions/inventory-activity"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/hooks/use-language"
import { createClient } from "@/lib/supabase-client"
import {
  BarChart,
  LineChart as RechartsLineChart,
  PieChart as RechartsPieChart,
  Bar,
  Line,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"

// Import Row type for data table
import type { Row } from "@tanstack/react-table"

// Define the AppTranslationKey type
type AppTranslationKey =
  | "reports"
  | "inventory"
  | "export"
  | "filters"
  | "filter"
  | "search"
  | "actions"
  | "select"
  | "all"
  | "sale"
  | "expenses"
  | "edit"
  | "low_stock"
  | "date"
  | "showing"
  | "of"
  | "entries"
  | "clear_filters"
  | "show"
  | "products"
  | "inventory_details_displayed_here"
  | "noResults"
  | "quantity"
  | "time"

// Define interface for header function parameters
interface HeaderFunctionParams {
  language: string
  getAppTranslation: (key: AppTranslationKey, language: string) => string
}

// Define columns for the data table
const columns = [
  {
    accessorKey: "created_at",
    header: ({ language, getAppTranslation }: HeaderFunctionParams) =>
      `${getAppTranslation("date", language)} & ${getAppTranslation("time", language)}`,
    cell: ({ row }: { row: Row<InventoryActivity> }) =>
      format(new Date(row.getValue("created_at")), "MMM d, yyyy h:mm a"),
  },
  {
    accessorKey: "product_name",
    header: ({ language, getAppTranslation }: HeaderFunctionParams) => getAppTranslation("products", language),
  },
  {
    accessorKey: "action_type",
    header: ({ language, getAppTranslation }: HeaderFunctionParams) => getAppTranslation("actions", language),
    cell: ({ row }: { row: Row<InventoryActivity> }) => {
      const action = row.getValue("action_type") as string
      return (
        <Badge
          variant={
            action === "Sale"
              ? "destructive"
              : action === "Purchase"
                ? "default"
                : action === "Adjustment"
                  ? "secondary"
                  : action === "Low Stock"
                    ? "outline"
                    : "secondary"
          }
        >
          {action}
        </Badge>
      )
    },
  },
  {
    accessorKey: "quantity_change",
    header: ({ language, getAppTranslation }: HeaderFunctionParams) => "Quantity Change", // Use string literal instead
    cell: ({ row }: { row: Row<InventoryActivity> }) => {
      const change = row.getValue("quantity_change")
      const value = Number(change)
      return (
        <span className={value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-500"}>
          {value > 0 ? `+${value}` : value}
        </span>
      )
    },
  },
  {
    accessorKey: "previous_quantity",
    header: ({ language, getAppTranslation }: HeaderFunctionParams) => "Previous Stock", // Use string literal instead
  },
  {
    accessorKey: "new_quantity",
    header: ({ language, getAppTranslation }: HeaderFunctionParams) => "New Stock", // Use string literal instead
  },
  {
    accessorKey: "notes",
    header: ({ language, getAppTranslation }: HeaderFunctionParams) => "Notes", // Use string literal instead
  },
  {
    accessorKey: "user_id",
    header: ({ language, getAppTranslation }: HeaderFunctionParams) => "User", // Use string literal instead
  },
]

type DateRange = {
  from: Date
  to: Date
}

export default function ActivityReportsPage() {
  const searchParams = useSearchParams()
  const [activities, setActivities] = useState<InventoryActivity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<InventoryActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [activeTab, setActiveTab] = useState("table")
  const [chartData, setChartData] = useState<any[]>([])
  const [productChartData, setProductChartData] = useState<any[]>([])
  const [timeChartData, setTimeChartData] = useState<any[]>([])
  const { getAppTranslation, language, isRTL } = useLanguage()
  const rtlEnabled = isRTL
  const [currentCurrency, setCurrentCurrency] = useState<string>("USD")
  const supabase = createClient()

  // Fetch currency setting
  const fetchCurrency = useCallback(async () => {
    try {
      const { data: settingsData, error } = await supabase
        .from("settings")
        .select("currency")
        .eq("type", "global")
        .single()

      if (!error && settingsData?.currency) {
        setCurrentCurrency(settingsData.currency)
      }
    } catch (error) {
      console.error("Error fetching currency setting:", error)
    }
  }, [supabase])

  // Load activities
  useEffect(() => {
    async function loadActivities() {
      setIsLoading(true)
      try {
        // Fetch currency first
        await fetchCurrency()

        // Load a larger number for reporting purposes
        const data = await getRecentInventoryActivity(100)
        setActivities(data)
        setFilteredActivities(data)

        // Initialize with all data
        applyFilters(data, searchTerm, actionFilter, dateRange)
      } catch (error) {
        console.error("Error loading activities:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadActivities()

    // Listen for storage events (triggered when settings are updated)
    const handleStorageChange = () => {
      fetchCurrency()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("focus", fetchCurrency)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", fetchCurrency)
    }
  }, [fetchCurrency, searchTerm, actionFilter, dateRange])

  // Apply filters when they change
  useEffect(() => {
    applyFilters(activities, searchTerm, actionFilter, dateRange)
  }, [searchTerm, actionFilter, dateRange, activities])

  // Prepare chart data when filtered activities change
  useEffect(() => {
    prepareChartData(filteredActivities)
  }, [filteredActivities])

  // Apply all filters to the activities
  const applyFilters = useCallback(
    (data: InventoryActivity[], search: string, action: string, dates: { from: Date; to: Date }) => {
      let filtered = [...data]

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase()
        filtered = filtered.filter(
          (item) =>
            item.product_name.toLowerCase().includes(searchLower) ||
            item.action_type.toLowerCase().includes(searchLower) ||
            (item.notes && item.notes.toLowerCase().includes(searchLower)),
        )
      }

      // Apply action type filter
      if (action !== "all") {
        filtered = filtered.filter((item) => item.action_type === action)
      }

      // Apply date range filter
      if (dates.from && dates.to) {
        const fromDate = startOfDay(dates.from)
        const toDate = endOfDay(dates.to)

        filtered = filtered.filter((item) => {
          const itemDate = parseISO(item.created_at)
          return isWithinInterval(itemDate, { start: fromDate, end: toDate })
        })
      }

      setFilteredActivities(filtered)
    },
    [],
  )

  // Prepare data for charts
  const prepareChartData = useCallback((data: InventoryActivity[]) => {
    // Prepare action type chart data
    const actionCounts: Record<string, number> = {}
    data.forEach((item) => {
      actionCounts[item.action_type] = (actionCounts[item.action_type] || 0) + 1
    })

    const actionChartData = Object.keys(actionCounts).map((key) => ({
      name: key,
      value: actionCounts[key],
    }))

    setChartData(actionChartData)

    // Prepare product chart data
    const productCounts: Record<string, number> = {}
    data.forEach((item) => {
      productCounts[item.product_name] =
        (productCounts[item.product_name] || 0) + Math.abs(Number(item.quantity_change) || 0)
    })

    const productData = Object.keys(productCounts)
      .map((key) => ({
        name: key,
        value: productCounts[key],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10 products

    setProductChartData(productData)

    // Prepare time-based chart data
    const timeData: Record<string, Record<string, number>> = {}

    data.forEach((item) => {
      const date = format(new Date(item.created_at), "MMM d")
      if (!timeData[date]) {
        timeData[date] = {}
      }

      const actionType = item.action_type
      timeData[date][actionType] = (timeData[date][actionType] || 0) + Math.abs(Number(item.quantity_change) || 0)
    })

    const timeChartData = Object.keys(timeData).map((date) => {
      return {
        date,
        ...timeData[date],
      }
    })

    setTimeChartData(timeChartData)
  }, [])

  // Handle exporting data
  const handleExport = useCallback(() => {
    // Convert filtered activities to CSV
    const headers = [
      getAppTranslation("date", language),
      getAppTranslation("product", language),
      getAppTranslation("actions", language),
      "Quantity Change", // Use string literal instead
      "Previous Stock", // Use string literal instead
      "New Stock", // Use string literal instead
      "Notes", // Use string literal instead
      "User", // Use string literal instead
    ]

    const csvData = filteredActivities.map((item) => [
      format(new Date(item.created_at), "yyyy-MM-dd HH:mm:ss"),
      item.product_name,
      item.action_type,
      item.quantity_change,
      item.previous_quantity,
      item.new_quantity,
      item.notes || "",
      item.user_id || "",
    ])

    const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `inventory-activity-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [filteredActivities, getAppTranslation, language])

  // Colors for charts
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#8dd1e1",
    "#a4de6c",
    "#d0ed57",
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{getAppTranslation("reports", language)}</h1>
          <p className="text-muted-foreground">{getAppTranslation("inventory", language)}</p>
        </div>
        <Button onClick={handleExport} className="flex items-center gap-2">
          <Download className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
          {getAppTranslation("export", language)}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{getAppTranslation("filters", language)}</CardTitle>
          <CardDescription>{getAppTranslation("filter", language)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">{getAppTranslation("search", language)}</Label>
              <div className="relative">
                <Search
                  className={`absolute ${rtlEnabled ? "right-2.5" : "left-2.5"} top-2.5 h-4 w-4 text-muted-foreground`}
                />
                <Input
                  id="search"
                  placeholder={getAppTranslation("search", language)}
                  className={rtlEnabled ? "pr-8" : "pl-8"}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-type">{getAppTranslation("actions", language)}</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="action-type">
                  <SelectValue placeholder={getAppTranslation("select", language)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{getAppTranslation("all", language)}</SelectItem>
                  <SelectItem value="Sale">{getAppTranslation("sale", language)}</SelectItem>
                  <SelectItem value="Purchase">{getAppTranslation("expenses", language)}</SelectItem>
                  <SelectItem value="Adjustment">{getAppTranslation("edit", language)}</SelectItem>
                  <SelectItem value="Low Stock">{getAppTranslation("low_stock", language)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{getAppTranslation("date", language)}</Label>
              <DatePickerWithRange
                date={dateRange}
                setDate={(range: { from?: Date; to?: Date } | undefined) => {
                  // Ensure we always have valid dates
                  setDateRange({
                    from: range?.from || subDays(new Date(), 30),
                    to: range?.to || new Date(),
                  })
                }}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {getAppTranslation("showing", language)} {filteredActivities.length} {getAppTranslation("of", language)}{" "}
              {activities.length} {getAppTranslation("entries", language)}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setActionFilter("all")
                setDateRange({
                  from: subDays(new Date(), 30),
                  to: new Date(),
                })
              }}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {getAppTranslation("clear_filters", language)}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {getAppTranslation("show", language)}
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            {getAppTranslation("actions", language)}
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {getAppTranslation("products", language)}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            {getAppTranslation("date", language)}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{getAppTranslation("inventory", language)}</CardTitle>
              <CardDescription>{getAppTranslation("inventory_details_displayed_here", language)}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  columns={columns.map((col) => ({
                    ...col,
                    header:
                      typeof col.header === "function" ? () => col.header({ language, getAppTranslation }) : col.header,
                  }))}
                  data={filteredActivities}
                  searchKey="product_name"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{getAppTranslation("actions", language)}</CardTitle>
              <CardDescription>{getAppTranslation("inventory_details_displayed_here", language)}</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">{getAppTranslation("noResults", language)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{getAppTranslation("products", language)}</CardTitle>
              <CardDescription>{getAppTranslation("inventory_details_displayed_here", language)}</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : productChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={productChartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 100,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name={getAppTranslation("quantity", language)} fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">{getAppTranslation("noResults", language)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{getAppTranslation("date", language)}</CardTitle>
              <CardDescription>{getAppTranslation("inventory_details_displayed_here", language)}</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : timeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={timeChartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Sale"
                      name={getAppTranslation("sale", language)}
                      stroke="#ff0000"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="Purchase"
                      name={getAppTranslation("expenses", language)}
                      stroke="#00c49f"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="Adjustment"
                      name={getAppTranslation("edit", language)}
                      stroke="#ffbb28"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="Low Stock"
                      name={getAppTranslation("low_stock", language)}
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">{getAppTranslation("noResults", language)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

