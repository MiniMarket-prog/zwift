"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, CalendarIcon, Download, Search, ArrowUpDown, Plus, Settings } from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay } from "date-fns"
import {
  fetchOperatingExpenses,
  addOperatingExpense,
  getOperatingExpenseCategories,
  type OperatingExpense,
  type OperatingExpenseCategory,
} from "@/lib/operating-expenses-service"
import type { PeriodOption, DateRange } from "@/lib/types"
import { formatCurrency, getCurrentCurrency, type SupportedCurrency } from "@/lib/format-currency"
import { createClient } from "@/lib/supabase-client3"
import { useToast } from "@/components/ui/use-toast"
import ExpenseCategoriesPage from "./categories"

import {
  BarChart,
  Bar,
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

export default function OperatingExpensesPage() {
  // State for tabs
  const [activeTab, setActiveTab] = useState<"expenses" | "categories">("expenses")

  // State for period selection
  const [period, setPeriod] = useState<PeriodOption>("last30days")
  const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(false)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  // State for data
  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<any>(null)
  const [currency, setCurrency] = useState<SupportedCurrency>("USD")
  const [categories, setCategories] = useState<OperatingExpenseCategory[]>([])

  // State for new expense form
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [newExpense, setNewExpense] = useState({
    amount: 0,
    description: "",
    category_id: "",
    payment_date: new Date().toISOString(),
  })

  // State for expenses table
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [sortField, setSortField] = useState<"amount" | "description" | "payment_date">("payment_date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const { toast } = useToast()

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
      const expensesData = await fetchOperatingExpenses(range.from, range.to)
      setData(expensesData)

      // Get current currency
      const supabase = createClient()
      const currentCurrency = await getCurrentCurrency(supabase)
      setCurrency(currentCurrency as SupportedCurrency)

      // Get categories
      const categoriesData = await getOperatingExpenseCategories()
      setCategories(categoriesData)
    } catch (error) {
      console.error("Error fetching operating expenses data:", error)
      toast({
        title: "Error",
        description: "Failed to load operating expenses data",
        variant: "destructive",
      })
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

  // Handle adding a new expense
  const handleAddExpense = async () => {
    try {
      if (newExpense.amount <= 0) {
        toast({
          title: "Invalid amount",
          description: "Amount must be greater than zero",
          variant: "destructive",
        })
        return
      }

      if (!newExpense.description.trim()) {
        toast({
          title: "Description required",
          description: "Please provide a description for this expense",
          variant: "destructive",
        })
        return
      }

      if (!newExpense.category_id) {
        toast({
          title: "Category required",
          description: "Please select a category for this expense",
          variant: "destructive",
        })
        return
      }

      await addOperatingExpense(newExpense)

      toast({
        title: "Expense added",
        description: "The operating expense has been added successfully",
      })

      setIsAddExpenseOpen(false)
      setNewExpense({
        amount: 0,
        description: "",
        category_id: "",
        payment_date: new Date().toISOString(),
      })

      // Refresh data
      fetchData()
    } catch (error) {
      console.error("Error adding expense:", error)
      toast({
        title: "Error",
        description: "Failed to add the expense",
        variant: "destructive",
      })
    }
  }

  // Export data to CSV
  const exportToCSV = () => {
    if (!data) return

    // Create CSV content
    let csvContent = "Date,Category,Description,Amount\n"

    data.expenses.forEach((expense: OperatingExpense) => {
      const date = format(new Date(expense.payment_date), "yyyy-MM-dd")
      const category = expense.category?.name || "Uncategorized"
      const description = expense.description.replace(/,/g, ";") // Replace commas to avoid CSV issues
      csvContent += `${date},${category},${description},${expense.amount}\n`
    })

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `operating-expenses-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter and sort expenses
  const getFilteredExpenses = () => {
    if (!data) return []

    let filtered = [...data.expenses]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (expense: OperatingExpense) =>
          expense.description.toLowerCase().includes(term) ||
          (expense.category?.name || "").toLowerCase().includes(term),
      )
    }

    // Apply sorting
    filtered.sort((a: any, b: any) => {
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
    if (activeTab === "expenses") {
      fetchData()
    }
  }, [period, activeTab])

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Operating Expenses</h1>

        <div className="flex flex-wrap gap-2">
          <Button variant={activeTab === "expenses" ? "default" : "outline"} onClick={() => setActiveTab("expenses")}>
            Expenses
          </Button>
          <Button
            variant={activeTab === "categories" ? "default" : "outline"}
            onClick={() => setActiveTab("categories")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Manage Categories
          </Button>
        </div>
      </div>

      {activeTab === "categories" ? (
        <ExpenseCategoriesPage />
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

              <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Operating Expense</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={newExpense.amount || ""}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, amount: Number.parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={newExpense.category_id}
                        onValueChange={(value) => setNewExpense({ ...newExpense, category_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="date">Payment Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newExpense.payment_date ? format(new Date(newExpense.payment_date), "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={new Date(newExpense.payment_date)}
                            onSelect={(date) =>
                              date && setNewExpense({ ...newExpense, payment_date: date.toISOString() })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleAddExpense}>Save Expense</Button>
                  </div>
                </DialogContent>
              </Dialog>

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
              {/* Summary Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Total Operating Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(data.totalExpenses, currency)}</div>
                  <p className="text-sm text-muted-foreground">
                    For period: {formatDateDisplay(getDateRange(period).from)} -{" "}
                    {formatDateDisplay(getDateRange(period).to)}
                  </p>
                </CardContent>
              </Card>

              {/* Main Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Expense Details</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Expense Categories Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Expenses by Category</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={Object.entries(data.expensesByCategory).map(([name, value], index) => ({
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
                              {Object.entries(data.expensesByCategory).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Daily Expenses Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Daily Expenses</CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={Object.entries(data.expensesByDay).map(([date, amount]) => ({
                              date,
                              amount,
                              formattedDate: format(new Date(date), "MMM dd"),
                            }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="formattedDate" />
                            <YAxis />
                            <Tooltip
                              formatter={(value: number) => [formatCurrency(value, currency), ""]}
                              labelFormatter={(label) => `Date: ${label}`}
                            />
                            <Legend />
                            <Bar dataKey="amount" name="Expenses" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Expense Details</CardTitle>
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
                                setSortDirection(
                                  sortField === "description" && sortDirection === "asc" ? "desc" : "asc",
                                )
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
                                setSortDirection(
                                  sortField === "payment_date" && sortDirection === "asc" ? "desc" : "asc",
                                )
                              }}
                            >
                              Date
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="max-h-[400px] overflow-auto">
                          {getFilteredExpenses().length > 0 ? (
                            getFilteredExpenses().map((expense: OperatingExpense) => (
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
              </Tabs>
            </>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">No data available for the selected period.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
