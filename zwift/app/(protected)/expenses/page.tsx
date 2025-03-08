"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CalendarIcon,
  Filter,
  X,
  Save,
  Loader2,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"
import { useUser } from "@/components/auth/user-provider"

// Define expense type based on the database schema
type Expense = Database["public"]["Tables"]["expenses"]["Row"]
type Category = Database["public"]["Tables"]["categories"]["Row"]

// Define a type for expenses with joined category data
type ExpenseWithCategory = Expense & {
  categories?: Category | null
}

export default function ExpensesPage() {
  // State
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [totalPages, setTotalPages] = useState(1)
  const [paginatedExpenses, setPaginatedExpenses] = useState<ExpenseWithCategory[]>([])

  // Filtering state
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseWithCategory[]>([])
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [isFilterActive, setIsFilterActive] = useState(false)

  // New expense dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newExpense, setNewExpense] = useState({
    amount: "",
    description: "",
    category_id: "",
  })

  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const { user } = useUser()

  // Fetch expenses and categories
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false })

      if (expensesError) throw expensesError

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("name")

      if (categoriesError) throw categoriesError

      setExpenses(expensesData || [])
      setFilteredExpenses(expensesData || [])
      setCategories(categoriesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load expenses data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter expenses based on date range and category
  useEffect(() => {
    let filtered = [...expenses]

    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter((expense) => (expense.created_at ? new Date(expense.created_at) >= fromDate : false))
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter((expense) => (expense.created_at ? new Date(expense.created_at) <= toDate : false))
    }

    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter((expense) => expense.category_id === categoryFilter)
    }

    setFilteredExpenses(filtered)
    setCurrentPage(1) // Reset to first page when filtering

    // Set filter active state
    setIsFilterActive(!!(dateFrom || dateTo || (categoryFilter && categoryFilter !== "all")))
  }, [expenses, dateFrom, dateTo, categoryFilter])

  // Calculate total pages and paginated expenses
  const updatePaginatedExpenses = useCallback(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    setPaginatedExpenses(filteredExpenses.slice(startIndex, endIndex))
    setTotalPages(Math.max(1, Math.ceil(filteredExpenses.length / pageSize)))
  }, [currentPage, pageSize, filteredExpenses])

  // Update paginated expenses when page, page size, or filtered expenses change
  useEffect(() => {
    updatePaginatedExpenses()
  }, [currentPage, pageSize, filteredExpenses, updatePaginatedExpenses])

  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    setPageSize(Number.parseInt(value))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  // Handle page navigation
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Clear all filters
  const clearFilters = () => {
    setDateFrom(undefined)
    setDateTo(undefined)
    setCategoryFilter("all")
  }

  // Handle input change for new expense
  const handleNewExpenseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewExpense((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Add new expense
  const handleAddExpense = async () => {
    if (!user) return

    setIsSaving(true)

    // Validate form
    if (!newExpense.category_id || !newExpense.amount || !newExpense.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      setIsSaving(false)
      return
    }

    try {
      const { error } = await supabase.from("expenses").insert({
        amount: Number.parseFloat(newExpense.amount),
        description: newExpense.description,
        category_id: newExpense.category_id,
        user_id: user.id,
      })

      if (error) throw error

      toast({
        title: "Expense Added",
        description: "The expense has been added successfully.",
      })

      // Reset form and close dialog
      setNewExpense({
        amount: "",
        description: "",
        category_id: "",
      })
      setIsAddDialogOpen(false)

      // Refresh expenses
      fetchData()
    } catch (error) {
      console.error("Error adding expense:", error)
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate totals
  const currentPageTotal = paginatedExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const allExpensesTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Get category name by id
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized"
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || "Uncategorized"
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>Enter the details of the expense to add it to your records.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Select
                  value={newExpense.category_id}
                  onValueChange={(value) => setNewExpense((prev) => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger id="category" className="col-span-3">
                    <SelectValue placeholder="Select a category" />
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newExpense.amount}
                  onChange={handleNewExpenseChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={newExpense.description}
                  onChange={handleNewExpenseChange}
                  className="col-span-3"
                  rows={3}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddExpense} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Expense
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Expenses</CardTitle>
          <CardDescription>Filter expenses by date range and category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="from-date">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="to-date">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="category-filter">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div>
            {isFilterActive && (
              <Badge variant="outline" className="flex gap-1 items-center">
                <Filter className="h-3 w-3" />
                Filters applied
              </Badge>
            )}
          </div>
          <Button variant="outline" onClick={clearFilters} disabled={!isFilterActive}>
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Expense Records</CardTitle>
            <CardDescription>
              {isFilterActive ? "Showing filtered expense records" : "Showing all expense records"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="pageSize">Show</Label>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger id="pageSize" className="w-[80px]">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="20">20</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">entries</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : paginatedExpenses.length > 0 ? (
                  paginatedExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">
                        {expense.created_at ? format(new Date(expense.created_at), "PPP") : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="outline">
                          {expense.categories ? expense.categories.name : getCategoryName(expense.category_id)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{expense.description}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">${expense.amount.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No expenses found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50">
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-right">
                    Page Total
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right">${currentPageTotal.toFixed(2)}</td>
                </tr>
                <tr className="bg-muted/50">
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-right">
                    Grand Total {isFilterActive ? "(Filtered)" : "(All)"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right">${allExpensesTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              {filteredExpenses.length > 0 ? Math.min(filteredExpenses.length, (currentPage - 1) * pageSize + 1) : 0} to{" "}
              {Math.min(filteredExpenses.length, currentPage * pageSize)} of {filteredExpenses.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1 || filteredExpenses.length === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || filteredExpenses.length === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {filteredExpenses.length > 0 ? currentPage : 0} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || filteredExpenses.length === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || filteredExpenses.length === 0}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

