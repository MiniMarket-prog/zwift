"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Search, Edit, Trash2, Printer, RefreshCw, Filter } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/format-currency"
// Fix the import to use the correct component name
import { EditProductDialog as AddProductDialog } from "../products/add-product-dialog"
import { EditProductDialog } from "../products/edit-product-dialog"
import { DeleteProductDialog } from "../products/delete-product-dialog"
import { PrintBarcodeDialog } from "../products/print-barcode-dialog"
import type { Product as ProductType } from "@/types" // Import the shared Product type

// Define an extended product type that includes description
interface ExtendedProduct extends ProductType {
  description?: string
}

export default function ProductListPage() {
  const [products, setProducts] = useState<ExtendedProduct[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductType | null>(null)
  const [printingProduct, setPrintingProduct] = useState<ProductType | null>(null)
  const [currency, setCurrency] = useState("MAD")

  const { toast } = useToast()

  // Fetch products and categories
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch products
        const productsRes = await fetch("/api/products")
        if (!productsRes.ok) throw new Error("Failed to fetch products")
        const productsData = await productsRes.json()

        // Fetch categories
        const categoriesRes = await fetch("/api/categories")
        if (!categoriesRes.ok) throw new Error("Failed to fetch categories")
        const categoriesData = await categoriesRes.json()

        // Ensure all products have required fields for type compatibility
        const normalizedProducts: ExtendedProduct[] = productsData.map((product: any) => ({
          id: product.id || "",
          name: product.name || "",
          price: product.price || 0,
          barcode: product.barcode || "", // Ensure barcode is never undefined
          stock: product.stock || 0,
          min_stock: product.min_stock || 0,
          description: product.description, // Include description from API
          category_id: product.category_id,
          image: product.image,
          purchase_price: product.purchase_price || 0,
        }))

        setProducts(normalizedProducts)
        setCategories(categoriesData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load products or categories",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Filter products based on search term and category
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = categoryFilter === "all" || product.category_id === categoryFilter

    return matchesSearch && matchesCategory
  })

  // Refresh products
  const refreshProducts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/products")
      if (!res.ok) throw new Error("Failed to fetch products")
      const data = await res.json()

      // Normalize the data to match the ProductType
      const normalizedProducts: ExtendedProduct[] = data.map((product: any) => ({
        id: product.id || "",
        name: product.name || "",
        price: product.price || 0,
        barcode: product.barcode || "", // Ensure barcode is never undefined
        stock: product.stock || 0,
        min_stock: product.min_stock || 0,
        description: product.description, // Include description from API
        category_id: product.category_id,
        image: product.image,
        purchase_price: product.purchase_price || 0,
      }))

      setProducts(normalizedProducts)
      toast({
        title: "Refreshed",
        description: "Product list has been updated",
      })
    } catch (error) {
      console.error("Error refreshing products:", error)
      toast({
        title: "Error",
        description: "Failed to refresh products",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get category name by ID
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "Uncategorized"
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : "Unknown"
  }

  // Handle product deletion
  const handleDeleteProduct = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete product")

      setProducts(products.filter((p) => p.id !== productId))
      toast({
        title: "Product deleted",
        description: "The product has been successfully removed",
      })
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      })
    } finally {
      setDeletingProduct(null)
    }
  }

  return (
    <div className="container py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl font-bold">Product List</CardTitle>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or barcode..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
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

              <Button variant="outline" onClick={refreshProducts} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                      <p className="mt-2">Loading products...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.description || "-"}</TableCell>
                      <TableCell>{formatCurrency(product.price, currency)}</TableCell>
                      <TableCell>
                        {product.category_id ? (
                          <Badge variant="outline">{getCategoryName(product.category_id)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              product.stock === 0
                                ? "bg-red-500"
                                : product.stock < product.min_stock
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                            }`}
                          />
                          <span>{product.stock}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPrintingProduct(product)}
                            title="Print Barcode"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditingProduct(product)}
                            title="Edit Product"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setDeletingProduct(product)}
                            title="Delete Product"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      {isAddDialogOpen && (
        <AddProductDialog
          product={{
            id: "",
            name: "",
            price: 0,
            barcode: "",
            stock: 0,
            min_stock: 0,
          }}
          categories={categories}
          onClose={() => setIsAddDialogOpen(false)}
          onSave={() => {
            refreshProducts()
            setIsAddDialogOpen(false)
          }}
        />
      )}

      {/* Edit Product Dialog */}
      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSave={() => {
            refreshProducts()
            setEditingProduct(null)
          }}
        />
      )}

      {/* Delete Product Dialog */}
      {deletingProduct && (
        <DeleteProductDialog
          product={deletingProduct}
          onClose={() => setDeletingProduct(null)}
          onDelete={() => handleDeleteProduct(deletingProduct.id)}
        />
      )}

      {/* Print Barcode Dialog */}
      {printingProduct && <PrintBarcodeDialog product={printingProduct} onClose={() => setPrintingProduct(null)} />}
    </div>
  )
}
