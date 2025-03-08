"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShoppingCart, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

// First, let's add imports for the dialog and other components we'll need
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Minus, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Add these types at the top of the file, after the imports
type Product = {
  id: string
  name: string
  price: number
  barcode?: string
  stock: number
  min_stock: number
  category_id?: string | null
  image?: string | null
}

type Category = {
  id: string
  name: string
}

const AlertsPage = () => {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Add state for the stock adjustment dialog
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [adjustedStock, setAdjustedStock] = useState(0)
  const [isAdjusting, setIsAdjusting] = useState(false)

  // Fetch low stock products from Supabase
  const fetchLowStockProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      // Fetch all products
      const { data, error } = await supabase.from("products").select("*")

      if (error) {
        throw error
      }

      // Filter products where stock is less than min_stock
      const lowStock = data?.filter((product) => product.stock < product.min_stock) || []
      setLowStockProducts(lowStock as Product[])
      setFilteredProducts(lowStock as Product[])
    } catch (error) {
      console.error("Error fetching low stock products:", error)
      toast({
        title: "Error",
        description: "Failed to fetch low stock products",
        variant: "destructive",
      })
      setLowStockProducts([])
      setFilteredProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  // Fetch categories from Supabase
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name")

      if (error) {
        throw error
      }

      setCategories(data as Category[])
    } catch (error) {
      console.error("Error fetching categories:", error)
      setCategories([])
    }
  }, [])

  useEffect(() => {
    fetchLowStockProducts()
    fetchCategories()
  }, [fetchLowStockProducts, fetchCategories])

  // Filter products based on search term and category
  useEffect(() => {
    let filtered = lowStockProducts.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))

    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter((product) => product.category_id === categoryFilter)
    }

    setFilteredProducts(filtered)
  }, [searchTerm, categoryFilter, lowStockProducts])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value)
  }

  const handleAddToCart = (product: Product) => {
    // Implement add to cart functionality
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to the cart.`,
    })
  }

  const handleRestock = async (product: Product) => {
    try {
      // Update the product stock to min_stock + 5 (or some other logic)
      const newStock = product.min_stock + 5

      const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", product.id)

      if (error) throw error

      toast({
        title: "Restocked",
        description: `${product.name} has been restocked to ${newStock} units.`,
      })

      // Refresh the product list
      fetchLowStockProducts()
    } catch (error) {
      console.error("Error restocking product:", error)
      toast({
        title: "Error",
        description: "Failed to restock product",
        variant: "destructive",
      })
    }
  }

  // Add a function to handle opening the adjust stock dialog
  const handleAdjustClick = (product: Product) => {
    setSelectedProduct(product)
    setAdjustedStock(product.stock)
    setIsAdjustDialogOpen(true)
  }

  // Add a function to handle stock adjustment
  const handleStockAdjustment = async () => {
    if (!selectedProduct) return

    setIsAdjusting(true)
    try {
      const { error } = await supabase.from("products").update({ stock: adjustedStock }).eq("id", selectedProduct.id)

      if (error) throw error

      toast({
        title: "Stock Updated",
        description: `${selectedProduct.name} stock has been updated to ${adjustedStock} units.`,
      })

      // Close dialog and refresh products
      setIsAdjustDialogOpen(false)
      fetchLowStockProducts()
    } catch (error) {
      console.error("Error adjusting stock:", error)
      toast({
        title: "Error",
        description: "Failed to update stock level",
        variant: "destructive",
      })
    } finally {
      setIsAdjusting(false)
    }
  }

  // Add a function to increment/decrement stock
  const adjustStock = (amount: number) => {
    setAdjustedStock((prev) => Math.max(0, prev + amount))
  }

  // Get category name by ID
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized"
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : "Uncategorized"
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Low Stock Alerts</h1>
        <Badge variant="outline" className="text-sm py-1 px-3 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {lowStockProducts.length} Items Below Minimum Stock
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Low Stock Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <Input type="text" placeholder="Search products..." onChange={handleSearch} className="max-w-xs" />
            <Select onValueChange={handleCategoryFilter} value={categoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Category" />
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

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableCaption>Products that are below minimum stock level.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead className="text-center">Min. Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCategoryName(product.category_id)}</Badge>
                        </TableCell>
                        <TableCell>${product.price.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{product.stock}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{product.min_stock}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleAddToCart(product)}>
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Add to Cart
                          </Button>
                          <Button size="sm" onClick={() => handleRestock(product)}>
                            Restock
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleAdjustClick(product)}>
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        No low stock products found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock Level</DialogTitle>
            <DialogDescription>
              {selectedProduct ? `Update stock level for ${selectedProduct.name}` : "Update stock level"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right">
                Current Stock
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Button variant="outline" size="icon" onClick={() => adjustStock(-1)} disabled={adjustedStock <= 0}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={adjustedStock}
                  onChange={(e) => setAdjustedStock(Math.max(0, Number.parseInt(e.target.value) || 0))}
                  className="w-20 text-center"
                />
                <Button variant="outline" size="icon" onClick={() => adjustStock(1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {selectedProduct && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Min. Stock</Label>
                <div className="col-span-3">
                  <span className="text-sm font-medium">{selectedProduct.min_stock}</span>
                  {adjustedStock < selectedProduct.min_stock && (
                    <p className="text-xs text-amber-500 mt-1">
                      Warning: New stock level is below minimum stock threshold.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockAdjustment} disabled={isAdjusting}>
              {isAdjusting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AlertsPage

