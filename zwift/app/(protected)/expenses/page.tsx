"use client"

import { DialogTrigger } from "@/components/ui/dialog"

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
  Pencil,
  Trash2,
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
import { Calendar } from "@/components/ui/calendar"
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

// Define expense type based on the database schema
type Expense = Database["public"]["Tables"]["expenses"]["Row"]
type Category = Database["public"]["Tables"]["expense_categories"]["Row"]

// Define a type for expenses with joined category data
type ExpenseWithCategory = Expense & {
  expense_categories?: Category | null
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
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">{getAppTranslation("expenses", language)}</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
              {getAppTranslation("add_expense", language)}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    {getAppTranslation("category", language)}
                  </Label>
                  <div className="col-span-3 flex gap-2">
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">
                    {getAppTranslation("amount", language)}
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
                    {getAppTranslation("description", language)}
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{getAppTranslation("filter_expenses", language)}</CardTitle>
          <CardDescription>{getAppTranslation("filter_expenses_description", language)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="from-date">{getAppTranslation("from_date", language)}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                  >
                    <CalendarIcon className={`h-4 w-4 ${rtlEnabled ? "ml-2" : "mr-2"}`} />
                    {dateFrom ? format(dateFrom, "PPP") : getAppTranslation("select_date", language)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
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
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{getAppTranslation("expense_records", language)}</CardTitle>
            <CardDescription>
              {isFilterActive
                ? getAppTranslation("showing_filtered_expenses", language)
                : getAppTranslation("showing_all_expenses", language)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="pageSize">{getAppTranslation("show", language)}</Label>
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
            <span className="text-sm text-muted-foreground">{getAppTranslation("entries", language)}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">{getAppTranslation("date", language)}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">{getAppTranslation("category", language)}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    {getAppTranslation("description", language)}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium">{getAppTranslation("amount", language)}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">
                    {getAppTranslation("actions", language)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
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
                          {expense.expense_categories
                            ? expense.expense_categories.name
                            : getCategoryName(expense.category_id)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{expense.description}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatCurrency(expense.amount, currentCurrency, language)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {getAppTranslation("no_expenses_found", language)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50">
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-right">
                    {getAppTranslation("page_total", language)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right">
                    {formatCurrency(currentPageTotal, currentCurrency, language)}
                  </td>
                </tr>
                <tr className="bg-muted/50">
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-right">
                    {getAppTranslation("grand_total", language)}{" "}
                    {isFilterActive
                      ? `(${getAppTranslation("filtered", language)})`
                      : `(${getAppTranslation("all", language)})`}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right">
                    {formatCurrency(allExpensesTotal, currentCurrency, language)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {getAppTranslation("showing", language)}{" "}
              {filteredExpenses.length > 0 ? Math.min(filteredExpenses.length, (currentPage - 1) * pageSize + 1) : 0}{" "}
              {getAppTranslation("to", language)} {Math.min(filteredExpenses.length, currentPage * pageSize)}{" "}
              {getAppTranslation("of", language)} {filteredExpenses.length} {getAppTranslation("entries", language)}
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
          </div>
        </CardContent>
      </Card>
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("add_category", language)}</DialogTitle>
            <DialogDescription>{getAppTranslation("add_category_description", language)}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {getAppTranslation("name", language)}
              </Label>
              <Input
                id="name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="col-span-3"
              />
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

          {/* Display existing categories with delete option */}
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("edit_expense", language)}</DialogTitle>
            <DialogDescription>{getAppTranslation("edit_expense_description", language)}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category" className="text-right">
                {getAppTranslation("category", language)}
              </Label>
              <div className="col-span-3 flex gap-2">
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-amount" className="text-right">
                {getAppTranslation("amount", language)}
              </Label>
              <Input
                id="edit-amount"
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
              <Label htmlFor="edit-description" className="text-right pt-2">
                {getAppTranslation("description", language)}
              </Label>
              <Textarea
                id="edit-description"
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
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{getAppTranslation("edit_category", language)}</DialogTitle>
            <DialogDescription>{getAppTranslation("edit_category_description", language)}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category-name" className="text-right">
                {getAppTranslation("name", language)}
              </Label>
              <Input
                id="edit-category-name"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="col-span-3"
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

