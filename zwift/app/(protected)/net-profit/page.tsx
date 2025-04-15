"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Loader2, CalendarIcon, Download, Search, ArrowUpDown } from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay } from "date-fns"
import { fetchNetProfitData, type NetProfitData } from "@/lib/net-profit-service"
import type { PeriodOption, DateRange } from "@/lib/types"
import { formatCurrency, getCurrentCurrency, type SupportedCurrency } from "@/lib/format-currency"
import { createClient } from "@/lib/supabase-client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

export default function NetProfitPage() {
  // State for period selection
  const [period, setPeriod] = useState<PeriodOption>("last30days")
  const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(false)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  // State for data
  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<NetProfitData | null>(null)
  const [currency, setCurrency] = useState<SupportedCurrency>("USD")

  // State for expenses table
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [sortField, setSortField] = useState<"amount" | "description" | "payment_date">("payment_date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Function to get date range based on period
  const getDateRange = (selectedPeriod: PeriodOption): DateRange => {
    const today = new Date()
    const yesterday = subDays(today, 1)

    switch (selectedPeriod) {
      case "today":
        return { from: startOfDay(today), to: endOfDay(today) }
      case "yesterday":
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
      case "last7days":
        return { from: subDays(today, 7), to: today }
      case "last30days":
        return { from: subDays(today, 30), to: today }
      case "thisMonth":
        return { from: startOfMonth(today), to: today }
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(today), 1)
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
      case "thisYear":
        return { from: startOfYear(today), to: today }
      case "lastYear":
        const lastYear = new Date(today.getFullYear() - 1, 0, 1)
        return { from: startOfYear(lastYear), to: endOfYear(lastYear) }
      case "custom":
        return dateRange
      default:
        return { from: subDays(today, 30), to: today }
    }
  }

  // Function to fetch data
  const fetchData = async () => {
    setLoading(true)
    try {
      const range = getDateRange(period)
      const netProfitData = await fetchNetProfitData(range.from, range.to)
      setData(netProfitData)

      // Get current currency
      const supabase = createClient()
      const currentCurrency = await getCurrentCurrency(supabase)
      setCurrency(currentCurrency as SupportedCurrency)
    } catch (error) {
      console.error("Error fetching net profit data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Handle period change
  const handlePeriodChange = (newPeriod: PeriodOption) => {
    setPeriod(newPeriod)
    setIsCustomPeriod(newPeriod === "custom")
  }

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    if (range.from && range.to) {
      setDateRange(range)
      if (period === "custom") {
        fetchData()
      }
    }
  }

  // Export data to CSV
  const exportToCSV = () => {
    if (!data) return

    // Create CSV content
    let csvContent = "Date,Revenue,COGS,Gross Profit,Operating Expenses,Net Profit\n"

    data.dailyData.forEach((day) => {
      csvContent += `${day.date},${String(day.revenue || 0)},${String(day.cogs || 0)},${String(day.grossProfit || 0)},${String(day.operatingExpenses || 0)},${String(day.netProfit || 0)}\n`
    })

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `net-profit-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter and sort expenses
  const getFilteredExpenses = () => {
    if (!data) return []

    let filtered = [...data.operatingExpenses]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (expense) =>
          expense.description.toLowerCase().includes(term) ||
          (expense.category?.name || "").toLowerCase().includes(term),
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortField === "description") {
        return sortDirection === "asc"
          ? a.description.localeCompare(b.description)
          : b.description.localeCompare(a.description)
      } else if (sortField === "payment_date") {
        return sortDirection === "asc"
          ? new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
          : new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      } else {
        // For numeric fields like amount
        return sortDirection === "asc" ? a[sortField] - b[sortField] : b[sortField] - a[sortField]
      }
    })

    return filtered
  }

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

  // Format date for display
  const formatDateDisplay = (date: Date) => {
    return format(date, "MMM dd, yyyy")
  }

  // Effect to fetch data on mount and when period changes
  useEffect(() => {
    fetchData()
  }, [period])

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Net Profit Analysis</h1>

        <div className="flex flex-col md:flex-row gap-2">
          <Select value={period} onValueChange={(value) => handlePeriodChange(value as PeriodOption)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
              <SelectItem value="lastYear">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {isCustomPeriod && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "MMM dd, yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && handleDateRangeChange({ ...dateRange, from: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && handleDateRangeChange({ ...dateRange, to: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Button variant="outline" onClick={exportToCSV} disabled={!data}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue, currency)}</div>
                <p className="text-xs text-muted-foreground">
                  For period: {formatDateDisplay(getDateRange(period).from)} -{" "}
                  {formatDateDisplay(getDateRange(period).to)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Gross Profit (Bénéfice brut)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.grossProfit, currency)}</div>
                <p className="text-xs text-muted-foreground">Margin: {data.grossMargin.toFixed(2)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Operating Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.totalOperatingExpenses, currency)}</div>
                <p className="text-xs text-muted-foreground">{data.operatingExpenses.length} expense entries</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit (Bénéfice net)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.netProfit, currency)}</div>
                <p className="text-xs text-muted-foreground">Margin: {data.netMargin.toFixed(2)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Net Profit Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Net Profit Overview</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="formattedDate" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value, currency), ""]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
                      <Bar dataKey="cogs" name="COGS" fill="#82ca9d" />
                      <Bar dataKey="operatingExpenses" name="Operating Expenses" fill="#ffc658" />
                      <Bar dataKey="netProfit" name="Net Profit" fill="#ff7300" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Expense Categories and Profit Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Categories</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(data.operatingExpensesByCategory).map(([name, value], index) => ({
                            name,
                            value,
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(data.operatingExpensesByCategory).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Profit Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "COGS", value: data.totalCOGS },
                            { name: "Operating Expenses", value: data.totalOperatingExpenses },
                            { name: "Net Profit", value: data.netProfit > 0 ? data.netProfit : 0 },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#82ca9d" />
                          <Cell fill="#ffc658" />
                          <Cell fill="#ff7300" />
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Operating Expense Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search expenses..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <div className="grid grid-cols-12 gap-2 p-4 font-medium border-b">
                      <div className="col-span-3">
                        <Button
                          variant="ghost"
                          className="p-0 h-auto font-medium"
                          onClick={() => {
                            setSortField("description")
                            setSortDirection(sortField === "description" && sortDirection === "asc" ? "desc" : "asc")
                          }}
                        >
                          Description
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                      <div className="col-span-2">
                        <Button
                          variant="ghost"
                          className="p-0 h-auto font-medium"
                          onClick={() => {
                            setSortField("amount")
                            setSortDirection(sortField === "amount" && sortDirection === "asc" ? "desc" : "asc")
                          }}
                        >
                          Amount
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                      <div className="col-span-3">Category</div>
                      <div className="col-span-4">
                        <Button
                          variant="ghost"
                          className="p-0 h-auto font-medium"
                          onClick={() => {
                            setSortField("payment_date")
                            setSortDirection(sortField === "payment_date" && sortDirection === "asc" ? "desc" : "asc")
                          }}
                        >
                          Date
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-[400px] overflow-auto">
                      {getFilteredExpenses().length > 0 ? (
                        getFilteredExpenses().map((expense) => (
                          <div key={expense.id} className="grid grid-cols-12 gap-2 p-4 border-b hover:bg-muted/50">
                            <div className="col-span-3 truncate">{expense.description}</div>
                            <div className="col-span-2 font-medium">{formatCurrency(expense.amount, currency)}</div>
                            <div className="col-span-3">{expense.category?.name || "Uncategorized"}</div>
                            <div className="col-span-4">
                              {format(new Date(expense.payment_date), "MMM dd, yyyy HH:mm")}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">No expenses found</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Net Profit Trends</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="formattedDate" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value, currency), ""]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="grossProfit"
                        name="Gross Profit"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                      />
                      <Line type="monotone" dataKey="operatingExpenses" name="Operating Expenses" stroke="#ffc658" />
                      <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#ff7300" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs. Costs</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="formattedDate" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value, currency), ""]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
                      <Bar dataKey="cogs" name="COGS" stackId="costs" fill="#82ca9d" />
                      <Bar dataKey="operatingExpenses" name="Operating Expenses" stackId="costs" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">No data available for the selected period.</p>
        </div>
      )}
    </div>
  )
}
