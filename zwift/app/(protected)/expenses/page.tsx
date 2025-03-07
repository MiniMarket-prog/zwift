"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Calendar, ChevronDown, Download, Edit, Plus, Search, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/components/auth/user-provider"
import { useToast } from "@/components/ui/use-toast"

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [currentExpense, setCurrentExpense] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({})
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  const { user } = useUser()
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category_id: "",
    date: new Date(),
  })

  useEffect(() => {
    fetchExpenses()
    fetchCategories()
    fetchUserProfiles()
  }, [dateRange])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("expense_categories").select("*").order("name")

      if (error) throw error

      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast({
        title: "Error",
        description: "Failed to load expense categories",
        variant: "destructive",
      })
    }
  }

  const fetchUserProfiles = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("id, full_name")

      if (error) throw error

      // Create a map of user IDs to profile data
      const profileMap: Record<string, any> = {}
      data?.forEach((profile) => {
        profileMap[profile.id] = profile
      })

      setUserProfiles(profileMap)
    } catch (error) {
      console.error("Error fetching user profiles:", error)
    }
  }

  const fetchExpenses = async () => {
    setIsLoading(true)
    try {
      let query = supabase.from("expenses").select("*, category_id").order("created_at", { ascending: false })

      if (searchTerm) {
        query = query.ilike("description", `%${searchTerm}%`)
      }

      if (dateRange.from) {
        query = query.gte("created_at", dateRange.from.toISOString())
      }

      if (dateRange.to) {
        query = query.lte("created_at", new Date(dateRange.to.setHours(23, 59, 59, 999)).toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      setExpenses(data || [])
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({ ...prev, date }))
    }
  }

  const handleAddExpense = async () => {
    try {
      if (!formData.amount || !formData.description) {
        toast({
          title: "Missing fields",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          amount: Number.parseFloat(formData.amount),
          description: formData.description,
          category_id: formData.category_id || null, // Make category optional
          created_at: formData.date.toISOString(),
          user_id: user?.id, // Use the current user's ID
        })
        .select()

      if (error) throw error

      toast({
        title: "Success",
        description: "Expense added successfully",
      })

      setShowAddDialog(false)
      // Reset form
      setFormData({
        amount: "",
        description: "",
        category_id: "",
        date: new Date(),
      })
      fetchExpenses()
    } catch (error) {
      console.error("Error adding expense:", error)
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive",
      })
    }
  }

  const handleEditExpense = (expense: any) => {
    setCurrentExpense(expense)
    setFormData({
      amount: expense.amount.toString(),
      description: expense.description,
      category_id: expense.category_id,
      date: new Date(expense.created_at),
    })
    setShowEditDialog(true)
  }

  const handleUpdateExpense = async () => {
    try {
      if (!formData.amount || !formData.description) {
        toast({
          title: "Missing fields",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from("expenses")
        .update({
          amount: Number.parseFloat(formData.amount),
          description: formData.description,
          category_id: formData.category_id || null, // Make category optional
          created_at: formData.date.toISOString(),
        })
        .eq("id", currentExpense.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Expense updated successfully",
      })

      setShowEditDialog(false)
      fetchExpenses()
    } catch (error) {
      console.error("Error updating expense:", error)
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      })
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      try {
        const { error } = await supabase.from("expenses").delete().eq("id", id)

        if (error) throw error

        toast({
          title: "Success",
          description: "Expense deleted successfully",
        })

        fetchExpenses()
      } catch (error) {
        console.error("Error deleting expense:", error)
        toast({
          title: "Error",
          description: "Failed to delete expense",
          variant: "destructive",
        })
      }
    }
  }

  const handleExportCSV = () => {
    // Implement CSV export logic
    alert("Exporting expenses to CSV...")
  }

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      fetchExpenses()
    }, 500)

    return () => clearTimeout(delaySearch)
  }, [searchTerm])

  // Get the category name from the category ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : "Uncategorized"
  }

  // Get the user's name from the profiles map
  const getUserName = (userId: string) => {
    return userProfiles[userId]?.full_name || "Unknown"
  }

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("expense_categories")
        .insert({ name: newCategoryName.trim() })
        .select()

      if (error) throw error

      toast({
        title: "Success",
        description: "Category created successfully",
      })

      setNewCategoryName("")
      setShowCategoryDialog(false)
      fetchCategories()
    } catch (error) {
      console.error("Error creating category:", error)
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Expense Management</h2>
          <div className="flex gap-2">
            <Button onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Expenses</CardTitle>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by description..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Date Range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range: any) => setDateRange(range)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      Loading expenses...
                    </TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      No expenses found. Add your first expense to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCategoryName(expense.category_id)}</Badge>
                      </TableCell>
                      <TableCell>{getUserName(expense.user_id)}</TableCell>
                      <TableCell className="text-right font-medium">${expense.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditExpense(expense)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>Add a new expense to track your business costs.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter expense description"
                rows={3}
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="category">Category</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCategoryDialog(true)}
                  className="h-8 px-2 text-xs"
                >
                  + New Category
                </Button>
              </div>
              <Select value={formData.category_id} onValueChange={(value) => handleSelectChange("category_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={categories.length ? "Select category" : "No categories available"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                      No categories available
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
            </div>
            <div className="grid gap-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={formData.date} onSelect={handleDateChange} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense}>Add Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update expense information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                name="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="edit-category">Category</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCategoryDialog(true)}
                  className="h-8 px-2 text-xs"
                >
                  + New Category
                </Button>
              </div>
              <Select value={formData.category_id} onValueChange={(value) => handleSelectChange("category_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={categories.length ? "Select category" : "No categories available"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                      No categories available
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
            </div>
            <div className="grid gap-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={formData.date} onSelect={handleDateChange} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateExpense}>Update Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>Add a new expense category.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createCategory}>Create Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

