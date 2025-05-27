"use client"

import { DialogTrigger } from "@/components/ui/dialog"
import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
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
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  Calendar,
  Tag,
  MoreVertical,
  RefreshCw,
  Search,
  Grid3X3,
  List,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase-client"
import type { Database } from "@/types/supabase"
import { useUser } from "@/components/auth/user-provider"
import { Plus } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useLanguage } from "@/hooks/use-language"
import { formatCurrency } from "@/lib/format-currency"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Define expense type based on the database schema
type Expense = Database["public"]["Tables"]["expenses"]["Row"]
type Category = Database["public"]["Tables"]["expense_categories"]["Row"]

// Define a type for expenses with joined category data
type ExpenseWithCategory = Expense & {
  expense_categories?: Category | null
}

type ViewMode = "cards" | "table"

export default function ExpensesPage() {
  // State
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("cards")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [totalPages, setTotalPages] = useState(1)
  const [paginatedExpenses, setPaginatedExpenses] = useState<ExpenseWithCategory[]>([])

  // Filtering state
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseWithCategory[]>([])
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isFilterActive, setIsFilterActive] = useState(false)

  // New expense dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newExpense, setNewExpense] = useState({
    amount: "",
    description: "",
    category_id: "",
  })

  // Add state for new category dialog
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isSavingCategory, setIsSavingCategory] = useState(false)

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithCategory | null>(null)

  // Add state for currency
  const [currentCurrency, setCurrentCurrency] = useState<string>("USD")

  // Add state for delete category dialog and selected category for deletion
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false)
  const [selectedCategoryForDeletion, setSelectedCategoryForDeletion] = useState<Category | null>(null)

  // Add a state for editing categories
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [editCategoryName, setEditCategoryName] = useState("")

  const { toast } = useToast()
  const { user } = useUser()
  const { getAppTranslation, language, isRTL } = useLanguage()
  const rtlEnabled = isRTL

  // Fetch currency setting
  const fetchCurrency = useCallback(async () => {
    try {
      const supabase = createClient()
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
  }, [])

  // Fetch expenses and categories
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*, expense_categories(id, name)")
        .order("created_at", { ascending: false })

      if (expensesError) throw expensesError

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("expense_categories")
        .select("*")
        .order("name")

      if (categoriesError) throw categoriesError

      setExpenses(expensesData || [])
      setFilteredExpenses(expensesData || [])
      setCategories(categoriesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_fetch_expenses", language),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, language, getAppTranslation])

  useEffect(() => {
    fetchData()
    fetchCurrency()
  }, [fetchData, fetchCurrency])

  // Listen for storage events (triggered when settings are updated)
  useEffect(() => {
    const handleStorageChange = () => {
      fetchCurrency()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("focus", fetchCurrency)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", fetchCurrency)
    }
  }, [fetchCurrency])

  // Filter expenses based on date range, category, and search term
  useEffect(() => {
    let filtered = [...expenses]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((expense) => expense.description.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Date filters
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

    // Category filter
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter((expense) => expense.category_id === categoryFilter)
    }

    setFilteredExpenses(filtered)
    setCurrentPage(1) // Reset to first page when filtering

    // Set filter active state
    setIsFilterActive(!!(searchTerm || dateFrom || dateTo || (categoryFilter && categoryFilter !== "all")))
  }, [expenses, searchTerm, dateFrom, dateTo, categoryFilter])

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
    setSearchTerm("")
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

  // Add function to handle category creation
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: getAppTranslation("validation_error", language),
        description: getAppTranslation("please_enter_category_name", language),
        variant: "destructive",
      })
      return
    }

    setIsSavingCategory(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("expense_categories").insert({ name: newCategoryName.trim() })

      if (error) throw error

      toast({
        title: getAppTranslation("success", language),
        description: getAppTranslation("category_added_successfully", language),
      })

      // Reset form and close dialog
      setNewCategoryName("")
      setIsAddCategoryDialogOpen(false)

      // Refresh categories
      fetchData()
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_to_add_category", language),
        variant: "destructive",
      })
    } finally {
      setIsSavingCategory(false)
    }
  }

  // Handle delete category
  const handleDeleteCategory = async () => {
    if (!selectedCategoryForDeletion) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from("expense_categories").delete().eq("id", selectedCategoryForDeletion.id)

      if (error) throw error

      toast({
        title: getAppTranslation("success", language),
        description: getAppTranslation("category_deleted_successfully", language),
      })

      setIsDeleteCategoryDialogOpen(false)
      setSelectedCategoryForDeletion(null)

      // Refresh categories
      fetchData()
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_to_delete_category", language),
        variant: "destructive",
      })
    }
  }

  // Add a function to handle editing a category
  const handleEditCategory = async () => {
    if (!selectedCategory || !editCategoryName.trim()) {
      toast({
        title: getAppTranslation("validation_error", language),
        description: getAppTranslation("please_enter_category_name", language),
        variant: "destructive",
      })
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("expense_categories")
        .update({ name: editCategoryName.trim() })
        .eq("id", selectedCategory.id)

      if (error) throw error

      toast({
        title: getAppTranslation("success", language),
        description: getAppTranslation("category_updated_successfully", language),
      })

      setIsEditCategoryDialogOpen(false)
      setSelectedCategory(null)
      setEditCategoryName("")

      // Refresh categories
      fetchData()
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("failed_to_update_category", language),
        variant: "destructive",
      })
    }
  }

  // Add a function to open the edit category dialog
  const openEditCategoryDialog = (category: Category) => {
    setSelectedCategory(category)
    setEditCategoryName(category.name)
    setIsEditCategoryDialogOpen(true)
  }

  // Add new expense
  const handleAddExpense = async () => {
    console.log("handleAddExpense called")

    // Create a new Supabase client for this operation
    const supabase = createClient()

    // Get the current user session
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id

    if (!userId) {
      console.error("No authenticated user found")
      toast({
        title: getAppTranslation("error", language),
        description: "You must be logged in to add expenses.",
        variant: "destructive",
      })
      return
    }

    // Validate form
    if (!newExpense.category_id || !newExpense.amount || !newExpense.description) {
      console.log("Validation failed", newExpense)
      toast({
        title: getAppTranslation("validation_error", language),
        description: getAppTranslation("required", language),
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    console.log("Setting isSaving to true")

    try {
      console.log("Attempting to insert expense", {
        amount: Number.parseFloat(newExpense.amount),
        description: newExpense.description,
        category_id: newExpense.category_id,
        user_id: userId,
      })

      const { error } = await supabase.from("expenses").insert({
        amount: Number.parseFloat(newExpense.amount),
        description: newExpense.description,
        category_id: newExpense.category_id,
        user_id: userId,
      })

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      console.log("Expense added successfully")
      toast({
        title: getAppTranslation("success", language),
        description: getAppTranslation("success", language),
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
        title: getAppTranslation("error", language),
        description: getAppTranslation("error", language),
        variant: "destructive",
      })
    } finally {
      console.log("Setting isSaving to false")
      setIsSaving(false)
    }
  }

  // Calculate totals
  const currentPageTotal = paginatedExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const allExpensesTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const monthlyTotal = expenses
    .filter((expense) => {
      if (!expense.created_at) return false
      const expenseDate = new Date(expense.created_at)
      const now = new Date()
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
    })
    .reduce((sum, expense) => sum + expense.amount, 0)

  // Get category name by id
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return getAppTranslation("uncategorized", language)
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || getAppTranslation("uncategorized", language)
  }

  // Handle edit button click
  const handleEditClick = (expense: ExpenseWithCategory) => {
    setSelectedExpense(expense)
    setNewExpense({
      amount: expense.amount.toString(),
      description: expense.description,
      category_id: expense.category_id || "",
    })
    setIsEditDialogOpen(true)
  }

  // Handle delete button click
  const handleDeleteClick = (expense: ExpenseWithCategory) => {
    setSelectedExpense(expense)
    setIsDeleteDialogOpen(true)
  }

  // Handle update expense
  const handleUpdateExpense = async () => {
    if (!selectedExpense) return

    setIsSaving(true)
    console.log("Updating expense...")

    // Create a new Supabase client for this operation
    const supabase = createClient()

    // Validate form
    if (!newExpense.category_id || !newExpense.amount || !newExpense.description) {
      toast({
        title: getAppTranslation("validation_error", language),
        description: getAppTranslation("required", language),
        variant: "destructive",
      })
      setIsSaving(false)
      return
    }

    try {
      console.log("Updating expense:", selectedExpense.id, newExpense)

      const { error } = await supabase
        .from("expenses")
        .update({
          amount: Number.parseFloat(newExpense.amount),
          description: newExpense.description,
          category_id: newExpense.category_id,
        })
        .eq("id", selectedExpense.id)

      if (error) throw error

      toast({
        title: getAppTranslation("success", language),
        description: getAppTranslation("success", language),
      })

      // Reset form and close dialog
      setNewExpense({
        amount: "",
        description: "",
        category_id: "",
      })
      setIsEditDialogOpen(false)
      setSelectedExpense(null)

      // Refresh expenses
      fetchData()
    } catch (error) {
      console.error("Error updating expense:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("error", language),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete expense
  const handleDeleteExpense = async () => {
    if (!selectedExpense) return

    try {
      console.log("Deleting expense:", selectedExpense.id)

      const supabase = createClient()
      const { error } = await supabase.from("expenses").delete().eq("id", selectedExpense.id)

      if (error) throw error

      toast({
        title: getAppTranslation("success", language),
        description: getAppTranslation("success", language),
      })

      setIsDeleteDialogOpen(false)
      setSelectedExpense(null)

      // Refresh expenses
      fetchData()
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("error", language),
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                {getAppTranslation("expenses", language)}
              </h1>
              <p className="text-muted-foreground text-lg">Track and manage your business expenses efficiently</p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  fetchData()
                  fetchCurrency()
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <div className="flex items-center bg-muted/50 rounded-lg p-1 gap-1">
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setViewMode("cards")}
                  title="Card View"
                >
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Cards</span>
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setViewMode("table")}
                  title="Table View"
                >
                  <List className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
              </div>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                    <span className="hidden sm:inline">{getAppTranslation("add_expense", language)}</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{getAppTranslation("add_new_expense", language)}</DialogTitle>
                    <DialogDescription>{getAppTranslation("add_expense_description", language)}</DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAddExpense()
                    }}
                  >
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">{getAppTranslation("category", language)}</Label>
                        <div className="flex gap-2">
                          <Select
                            value={newExpense.category_id}
                            onValueChange={(value) => setNewExpense((prev) => ({ ...prev, category_id: value }))}
                          >
                            <SelectTrigger id="category" className="flex-1">
                              <SelectValue placeholder={getAppTranslation("select_category", language)} />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.length === 0 ? (
                                <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
                                  {getAppTranslation("no_categories", language)}
                                </div>
                              ) : (
                                categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setIsAddCategoryDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount">{getAppTranslation("amount", language)}</Label>
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={newExpense.amount}
                          onChange={handleNewExpenseChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">{getAppTranslation("description", language)}</Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={newExpense.description}
                          onChange={handleNewExpenseChange}
                          rows={3}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>
                        {getAppTranslation("cancel", language)}
                      </Button>
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"} animate-spin`} />
                            {getAppTranslation("saving", language)}...
                          </>
                        ) : (
                          <>
                            <Save className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                            {getAppTranslation("save_expense", language)}
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(allExpensesTotal, currentCurrency, language)}
                </div>
                <p className="text-xs text-muted-foreground">{isFilterActive ? "Filtered total" : "All time"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(monthlyTotal, currentCurrency, language)}</div>
                <p className="text-xs text-muted-foreground">Current month expenses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredExpenses.length}</div>
                <p className="text-xs text-muted-foreground">{isFilterActive ? "Filtered records" : "All records"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-xs text-muted-foreground">Active categories</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters and Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="search"
                  placeholder="Search expenses by description..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Date and Category Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-date">{getAppTranslation("from_date", language)}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateFrom && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                        {dateFrom ? format(dateFrom, "PPP") : getAppTranslation("select_date", language)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to-date">{getAppTranslation("to_date", language)}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                      >
                        <CalendarIcon className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                        {dateTo ? format(dateTo, "PPP") : getAppTranslation("select_date", language)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category-filter">{getAppTranslation("category", language)}</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="category-filter">
                      <SelectValue placeholder={getAppTranslation("all_categories", language)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{getAppTranslation("all_categories", language)}</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pageSize">Show</Label>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger id="pageSize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div>
              {isFilterActive && (
                <Badge variant="outline" className="flex gap-1 items-center">
                  <Filter className="h-3 w-3" />
                  {getAppTranslation("filters_applied", language)}
                </Badge>
              )}
            </div>
            <Button variant="outline" onClick={clearFilters} disabled={!isFilterActive}>
              <X className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
              {getAppTranslation("clear_filters", language)}
            </Button>
          </CardFooter>
        </Card>

        {/* Expenses Display */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading expenses...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredExpenses.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <DollarSign className="w-12 h-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold">No Expenses Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || isFilterActive
                    ? "No expenses match your current filters"
                    : "Start by adding your first expense"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Expenses Content */}
            {viewMode === "cards" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedExpenses.map((expense) => (
                  <Card key={expense.id} className="group hover:shadow-lg transition-all duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {expense.expense_categories
                              ? expense.expense_categories.name
                              : getCategoryName(expense.category_id)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {expense.created_at ? format(new Date(expense.created_at), "PPP") : "-"}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(expense)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {getAppTranslation("edit", language)}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClick(expense)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              {getAppTranslation("delete", language)}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="space-y-3">
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(expense.amount, currentCurrency, language)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{expense.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-4 font-medium">{getAppTranslation("date", language)}</th>
                          <th className="text-left p-4 font-medium">{getAppTranslation("category", language)}</th>
                          <th className="text-left p-4 font-medium">{getAppTranslation("description", language)}</th>
                          <th className="text-right p-4 font-medium">{getAppTranslation("amount", language)}</th>
                          <th className="text-center p-4 font-medium">{getAppTranslation("actions", language)}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedExpenses.map((expense) => (
                          <tr key={expense.id} className="border-b hover:bg-muted/30">
                            <td className="p-4 text-sm">
                              {expense.created_at ? format(new Date(expense.created_at), "PPP") : "-"}
                            </td>
                            <td className="p-4 text-sm">
                              <Badge variant="outline">
                                {expense.expense_categories
                                  ? expense.expense_categories.name
                                  : getCategoryName(expense.category_id)}
                              </Badge>
                            </td>
                            <td className="p-4 text-sm">{expense.description}</td>
                            <td className="p-4 text-sm text-right font-medium">
                              {formatCurrency(expense.amount, currentCurrency, language)}
                            </td>
                            <td className="p-4 text-sm text-center">
                              <div className="flex justify-center space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(expense)}>
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">{getAppTranslation("edit", language)}</span>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(expense)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                  <span className="sr-only">{getAppTranslation("delete", language)}</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/50">
                          <td colSpan={3} className="p-4 text-sm font-medium text-right">
                            {getAppTranslation("page_total", language)}
                          </td>
                          <td className="p-4 text-sm font-medium text-right">
                            {formatCurrency(currentPageTotal, currentCurrency, language)}
                          </td>
                          <td></td>
                        </tr>
                        <tr className="bg-muted/50">
                          <td colSpan={3} className="p-4 text-sm font-medium text-right">
                            {getAppTranslation("grand_total", language)}{" "}
                            {isFilterActive
                              ? `(${getAppTranslation("filtered", language)})`
                              : `(${getAppTranslation("all", language)})`}
                          </td>
                          <td className="p-4 text-sm font-medium text-right">
                            {formatCurrency(allExpensesTotal, currentCurrency, language)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Card>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="text-sm text-muted-foreground">
                    {getAppTranslation("showing", language)}{" "}
                    {filteredExpenses.length > 0
                      ? Math.min(filteredExpenses.length, (currentPage - 1) * pageSize + 1)
                      : 0}{" "}
                    {getAppTranslation("to", language)} {Math.min(filteredExpenses.length, currentPage * pageSize)}{" "}
                    {getAppTranslation("of", language)} {filteredExpenses.length}{" "}
                    {getAppTranslation("entries", language)}
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
                      {getAppTranslation("page", language)} {filteredExpenses.length > 0 ? currentPage : 0}{" "}
                      {getAppTranslation("of", language)} {totalPages}
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
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("add_category", language)}</DialogTitle>
            <DialogDescription>{getAppTranslation("add_category_description", language)}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{getAppTranslation("name", language)}</Label>
              <Input id="name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)}>
              {getAppTranslation("cancel", language)}
            </Button>
            <Button onClick={handleAddCategory} disabled={isSavingCategory}>
              {isSavingCategory ? (
                <>
                  <Loader2 className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"} animate-spin`} />
                  {getAppTranslation("saving", language)}...
                </>
              ) : (
                <>
                  <Save className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                  {getAppTranslation("save_category", language)}
                </>
              )}
            </Button>
          </DialogFooter>

          {/* Display existing categories with edit/delete options */}
          {categories.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-sm font-medium mb-2">{getAppTranslation("existing_categories", language)}</h3>
              <div className="max-h-[200px] overflow-y-auto">
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-2 border rounded-md">
                      <span className="text-sm">{category.name}</span>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditCategoryDialog(category)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">{getAppTranslation("edit", language)}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCategoryForDeletion(category)
                            setIsDeleteCategoryDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">{getAppTranslation("delete", language)}</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("edit_expense", language)}</DialogTitle>
            <DialogDescription>{getAppTranslation("edit_expense_description", language)}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">{getAppTranslation("category", language)}</Label>
              <div className="flex gap-2">
                <Select
                  value={newExpense.category_id}
                  onValueChange={(value) => setNewExpense((prev) => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger id="edit-category" className="flex-1">
                    <SelectValue placeholder={getAppTranslation("select_category", language)} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
                        {getAppTranslation("no_categories", language)}
                      </div>
                    ) : (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setIsAddCategoryDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">{getAppTranslation("amount", language)}</Label>
              <Input
                id="edit-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={newExpense.amount}
                onChange={handleNewExpenseChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">{getAppTranslation("description", language)}</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={newExpense.description}
                onChange={handleNewExpenseChange}
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {getAppTranslation("cancel", language)}
            </Button>
            <Button onClick={handleUpdateExpense} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"} animate-spin`} />
                  {getAppTranslation("saving", language)}...
                </>
              ) : (
                <>
                  <Save className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                  {getAppTranslation("update_expense", language)}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getAppTranslation("are_you_sure", language)}</AlertDialogTitle>
            <AlertDialogDescription>
              {getAppTranslation("delete_expense_warning", language)}
              {selectedExpense && ` ${formatCurrency(selectedExpense.amount, currentCurrency, language)}`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{getAppTranslation("cancel", language)}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground">
              <Trash2 className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
              {getAppTranslation("delete", language)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getAppTranslation("are_you_sure", language)}</AlertDialogTitle>
            <AlertDialogDescription>
              {getAppTranslation("delete_category_warning", language)}
              {selectedCategoryForDeletion && ` "${selectedCategoryForDeletion.name}"`}.
              {getAppTranslation("this_action_cannot_be_undone", language)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{getAppTranslation("cancel", language)}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground">
              <Trash2 className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
              {getAppTranslation("delete", language)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("edit_category", language)}</DialogTitle>
            <DialogDescription>{getAppTranslation("edit_category_description", language)}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">{getAppTranslation("name", language)}</Label>
              <Input
                id="edit-category-name"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
              {getAppTranslation("cancel", language)}
            </Button>
            <Button onClick={handleEditCategory}>
              <Save className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
              {getAppTranslation("update_category", language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
