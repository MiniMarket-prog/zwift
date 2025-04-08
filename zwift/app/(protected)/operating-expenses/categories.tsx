"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase-client3"
import { getOperatingExpenseCategories, type OperatingExpenseCategory } from "@/lib/operating-expenses-service"

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<OperatingExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<OperatingExpenseCategory | null>(null)
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
  })

  const { toast } = useToast()
  const supabase = createClient()

  // Fetch categories
  const fetchCategories = async () => {
    setLoading(true)
    try {
      const categoriesData = await getOperatingExpenseCategories()
      setCategories(categoriesData)
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast({
        title: "Error",
        description: "Failed to load expense categories",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a name for the category",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("operating_expense_categories")
        .insert([{ name: newCategory.name, description: newCategory.description }])
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Category added",
        description: "The expense category has been added successfully",
      })

      setIsAddDialogOpen(false)
      setNewCategory({ name: "", description: "" })
      fetchCategories()
    } catch (error: any) {
      console.error("Error adding category:", error)

      // Check for unique constraint violation
      if (error.code === "23505") {
        toast({
          title: "Duplicate category",
          description: "A category with this name already exists",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to add the category",
          variant: "destructive",
        })
      }
    }
  }

  // Edit category
  const handleEditCategory = async () => {
    if (!currentCategory || !currentCategory.name.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a name for the category",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("operating_expense_categories")
        .update({
          name: currentCategory.name,
          description: currentCategory.description,
        })
        .eq("id", currentCategory.id)

      if (error) throw error

      toast({
        title: "Category updated",
        description: "The expense category has been updated successfully",
      })

      setIsEditDialogOpen(false)
      setCurrentCategory(null)
      fetchCategories()
    } catch (error: any) {
      console.error("Error updating category:", error)

      // Check for unique constraint violation
      if (error.code === "23505") {
        toast({
          title: "Duplicate category",
          description: "A category with this name already exists",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update the category",
          variant: "destructive",
        })
      }
    }
  }

  // Delete category
  const handleDeleteCategory = async () => {
    if (!currentCategory) return

    try {
      // First check if the category is in use
      const { data: expensesData, error: checkError } = await supabase
        .from("operating_expenses")
        .select("id")
        .eq("category_id", currentCategory.id)
        .limit(1)

      if (checkError) throw checkError

      if (expensesData && expensesData.length > 0) {
        toast({
          title: "Cannot delete",
          description: "This category is in use by one or more expenses",
          variant: "destructive",
        })
        setIsDeleteDialogOpen(false)
        return
      }

      // If not in use, proceed with deletion
      const { error } = await supabase.from("operating_expense_categories").delete().eq("id", currentCategory.id)

      if (error) throw error

      toast({
        title: "Category deleted",
        description: "The expense category has been deleted successfully",
      })

      setIsDeleteDialogOpen(false)
      setCurrentCategory(null)
      fetchCategories()
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: "Failed to delete the category",
        variant: "destructive",
      })
    }
  }

  // Load categories on mount
  useEffect(() => {
    fetchCategories()
  }, [])

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Operating Expense Categories</h1>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense Category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newCategory.description || ""}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAddCategory}>Save Category</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="grid grid-cols-12 gap-2 p-4 font-medium border-b">
                <div className="col-span-4">Name</div>
                <div className="col-span-6">Description</div>
                <div className="col-span-2">Actions</div>
              </div>

              <div className="max-h-[500px] overflow-auto">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <div key={category.id} className="grid grid-cols-12 gap-2 p-4 border-b hover:bg-muted/50">
                      <div className="col-span-4 font-medium">{category.name}</div>
                      <div className="col-span-6">{category.description || "-"}</div>
                      <div className="col-span-2 flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCurrentCategory(category)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCurrentCategory(category)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">No categories found</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={currentCategory?.name || ""}
                onChange={(e) =>
                  setCurrentCategory(currentCategory ? { ...currentCategory, name: e.target.value } : null)
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={currentCategory?.description || ""}
                onChange={(e) =>
                  setCurrentCategory(currentCategory ? { ...currentCategory, description: e.target.value } : null)
                }
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleEditCategory}>Update Category</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the category <strong>{currentCategory?.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone. Categories that are in use by expenses cannot be deleted.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
