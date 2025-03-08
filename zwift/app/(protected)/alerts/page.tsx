"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShoppingCart, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

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

type ExpiringProduct = {
  id: string
  name: string
  expiry_date: string
  stock: number
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
  const [expiringProducts, setExpiringProducts] = useState<ExpiringProduct[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

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

  // For now, we'll use mock data for expiring products since we don't have that table yet
  const fetchExpiringProducts = useCallback(() => {
    // Mock data for expiring products - in a real app, this would fetch from Supabase
    const mockExpiringProducts: ExpiringProduct[] = [
      { id: "4", name: "Product D", expiry_date: "2023-12-31", stock: 20, category_id: null },
      { id: "5", name: "Product E", expiry_date: "2024-01-15", stock: 15, category_id: null },
    ]
    setExpiringProducts(mockExpiringProducts)
  }, [])

  useEffect(() => {
    fetchLowStockProducts()
    fetchExpiringProducts()
    fetchCategories()
  }, [fetchLowStockProducts, fetchExpiringProducts, fetchCategories])

  // Filter products based on search term and category
  useEffect(() => {
    let filtered = lowStockProducts.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))

    if (categoryFilter) {
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

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Alerts</h1>

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

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Low Stock Products</h2>
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
                  <TableHead>Price</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min. Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>${product.price.toFixed(2)}</TableCell>
                      <TableCell className="text-destructive">{product.stock}</TableCell>
                      <TableCell>{product.min_stock}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleAddToCart(product)}>
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Add to Cart
                        </Button>
                        <Button size="sm" onClick={() => handleRestock(product)}>
                          Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No low stock products found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Expiring Products</h2>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableCaption>Products that are expiring soon.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiringProducts.length > 0 ? (
                expiringProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{new Date(product.expiry_date).toLocaleDateString()}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleAddToCart({
                            id: product.id,
                            name: product.name,
                            price: 0, // Add a default price since expiring products don't have one
                            stock: product.stock,
                            min_stock: 0, // Add a default min_stock
                            image: product.image,
                            category_id: product.category_id,
                          })
                        }
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Add to Cart
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No products expiring soon.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

export default AlertsPage

