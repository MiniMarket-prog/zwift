"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { PlusIcon, EditIcon, TrashIcon, FolderIcon, RefreshCwIcon } from "lucide-react"
import { type Category, addCategory, updateCategory, deleteCategory, getCategories } from "@/lib/categories-service"

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast({
        title: "Error",
        description: "Failed to load categories. Please try again.",
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

  const handleAddCategory = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await addCategory({
        name: formData.name.trim(),
        // We'll still pass description but our service will handle it
        description: formData.description.trim() || undefined,
      })

      toast({
        title: "Category added",
        description: "The category has been added successfully.",
      })

      setIsAddDialogOpen(false)
      setFormData({ name: "", description: "" })
      fetchCategories()
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditCategory = async () => {
    if (!selectedCategory) return
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await updateCategory(selectedCategory.id, {
        name: formData.name.trim(),
        // We'll still pass description but our service will handle it
        description: formData.description.trim() || undefined,
      })

      toast({
        title: "Category updated",
        description: "The category has been updated successfully.",
      })

      setIsEditDialogOpen(false)
      setSelectedCategory(null)
      setFormData({ name: "", description: "" })
      fetchCategories()
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return

    setIsLoading(true)
    try {
      await deleteCategory(selectedCategory.id)

      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully.",
      })

      setIsDeleteDialogOpen(false)
      setSelectedCategory(null)
      fetchCategories()
    } catch (error: any) {
      console.error("Error deleting category:", error)

      // Check if it's a foreign key constraint error
      if (error.code === "23503" || (error.details && error.details.includes("referenced"))) {
        toast({
          title: "Cannot delete category",
          description: "This category is used by products. Remove the products from this category first.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete category. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category)
    setIsDeleteDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Manage product categories</CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchCategories} title="Refresh Categories">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && categories.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No categories found. Add your first category to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <FolderIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {category.description || <span className="text-muted-foreground italic">No description</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{category.product_count || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(category)}>
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => openDeleteDialog(category)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new category to organize your products.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Electronics, Clothing, Food"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Optional description for this category"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false)
                setFormData({ name: "", description: "" })
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the details for this category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name *</Label>
              <Input id="edit-name" name="name" value={formData.name} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setSelectedCategory(null)
                setFormData({ name: "", description: "" })
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditCategory} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category &quot;{selectedCategory?.name}&quot;. This action cannot be
              undone.
              {selectedCategory?.product_count && selectedCategory.product_count > 0 ? (
                <div className="mt-2 text-red-500 font-medium">
                  Warning: This category contains {selectedCategory.product_count} products. Deleting it may affect
                  these products.
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedCategory(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-red-500 hover:bg-red-600"
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

