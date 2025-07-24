"use client"
import type React from "react"
import { useState, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import {
  EditIcon,
  TrashIcon,
  SearchIcon,
  FilterIcon,
  PrinterIcon,
  BarcodeIcon,
  PackageIcon,
  ArrowUpDownIcon,
  RefreshCwIcon,
} from "lucide-react"
import { deleteProduct } from "@/lib/supabase"
import { refreshProducts as getAllProductsFromDB } from "@/lib/products-service"
import { EditProductDialog } from "./edit-product-dialog"
import { DeleteProductDialog } from "./delete-product-dialog"
import { PrintBarcodeDialog } from "./print-barcode-dialog"
import Image from "next/image"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  name: string
  price: number
  barcode: string
  stock: number
  min_stock: number
  image?: string
  category_id?: string
  purchase_price?: number
  expiry_date?: string
  expiry_notification_days?: number
  [key: string]: any // For any additional properties
}

interface Category {
  id: string
  name: string
}

type SortField = "name" | "price" | "stock" | "expiry_date" | "profit_margin"
type SortDirection = "asc" | "desc"

export function ProductList({
  initialProducts,
  categories,
  viewType = "list",
}: {
  initialProducts: Product[]
  categories: Category[]
  viewType?: "list" | "grid"
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [printingProduct, setPrintingProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(initialProducts.length)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Calculate profit margin percentage for a product
  const calculateProfitMargin = (product: Product): number | null => {
    if (!product.purchase_price || product.purchase_price === 0 || product.price === 0) {
      return null
    }
    return ((product.price - product.purchase_price) / product.price) * 100
  }

  // Apply client-side filters for category and stock
  const filteredProducts = products
    .filter((product) => {
      // Category filter
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "none" && !product.category_id) ||
        product.category_id === categoryFilter

      // Stock filter
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" && product.stock < product.min_stock) ||
        (stockFilter === "out" && product.stock === 0) ||
        (stockFilter === "in" && product.stock > 0)

      return matchesCategory && matchesStock
    })
    .sort((a, b) => {
      // Sort by selected field
      if (sortField === "name") {
        return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      } else if (sortField === "price") {
        return sortDirection === "asc" ? a.price - b.price : b.price - a.price
      } else if (sortField === "stock") {
        return sortDirection === "asc" ? a.stock - b.stock : b.stock - a.stock
      } else if (sortField === "expiry_date") {
        const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : 0
        const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : 0
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA
      } else if (sortField === "profit_margin") {
        const marginA = calculateProfitMargin(a) ?? Number.NEGATIVE_INFINITY
        const marginB = calculateProfitMargin(b) ?? Number.NEGATIVE_INFINITY
        return sortDirection === "asc" ? marginA - marginB : marginB - marginA
      }
      return 0
    })

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem)

  // Handle search input change with server-side filtering
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    // Debounce search to avoid too many requests
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }
    searchTimeout.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        // Use server-side filtering by passing the search term to getAllProductsFromDB
        const results = await getAllProductsFromDB(value)
        setProducts(results as Product[])
        setTotalCount(results.length)
        setCurrentPage(1) // Reset to first page when search changes
      } catch (error) {
        console.error("Error searching products:", error)
      } finally {
        setIsLoading(false)
      }
    }, 300)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Toggle sort direction
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Refresh products list
  const refreshProducts = async () => {
    setIsLoading(true)
    try {
      const updatedProducts = await getAllProductsFromDB(searchTerm)
      setProducts(updatedProducts as Product[])
      setTotalCount(updatedProducts.length)
      console.log(`Refreshed ${updatedProducts.length} products`)
    } catch (error) {
      console.error("Error refreshing products:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle product deletion
  const handleDelete = async (id: string) => {
    setIsLoading(true)
    try {
      await deleteProduct(id)
      toast({
        title: "Product deleted",
        description: "The product has been successfully removed.",
      })
      await refreshProducts()
    } catch (error: any) {
      console.error("Error deleting product:", error)
      // Check if it's a foreign key constraint error related to sale_items
      if (
        error.code === "23503" ||
        (error.details && error.details.includes("sale_items")) ||
        (error.message && error.message.includes("foreign key constraint"))
      ) {
        toast({
          title: "Cannot delete this product",
          description: "This product exists in previous sales records and cannot be deleted to maintain sales history.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete product. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
      setDeletingProduct(null)
    }
  }

  // Get category name by ID
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "None"
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : "Unknown"
  }

  // Get stock status
  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { label: "Out of Stock", color: "bg-red-500" }
    if (stock < minStock) return { label: "Low Stock", color: "bg-amber-500" }
    return { label: "In Stock", color: "bg-green-500" }
  }

  // Render pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (currentPage <= 3) {
              pageNum = i + 1
              if (i === 4)
                return (
                  <PaginationItem key={i}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i
              if (i === 0)
                return (
                  <PaginationItem key={i}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )
            } else {
              if (i === 0)
                return (
                  <PaginationItem key={i}>
                    <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
                  </PaginationItem>
                )
              if (i === 1)
                return (
                  <PaginationItem key={i}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )
              if (i === 3)
                return (
                  <PaginationItem key={i}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )
              if (i === 4)
                return (
                  <PaginationItem key={i}>
                    <PaginationLink onClick={() => handlePageChange(totalPages)}>{totalPages}</PaginationLink>
                  </PaginationItem>
                )
              pageNum = currentPage + i - 2
            }
            return (
              <PaginationItem key={i}>
                <PaginationLink onClick={() => handlePageChange(pageNum)} isActive={currentPage === pageNum}>
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            )
          })}
          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  // Render list view
  const renderListView = () => {
    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">
                <div className="flex items-center space-x-1 cursor-pointer" onClick={() => handleSort("name")}>
                  <span>Name</span>
                  <ArrowUpDownIcon className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center space-x-1 cursor-pointer" onClick={() => handleSort("price")}>
                  <span>Price</span>
                  <ArrowUpDownIcon className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center space-x-1 cursor-pointer" onClick={() => handleSort("profit_margin")}>
                  <span>Profit Margin</span>
                  <ArrowUpDownIcon className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>
                <div className="flex items-center space-x-1 cursor-pointer" onClick={() => handleSort("stock")}>
                  <span>Stock</span>
                  <ArrowUpDownIcon className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>
                <div className="flex items-center space-x-1 cursor-pointer" onClick={() => handleSort("expiry_date")}>
                  <span>Expiry Date</span>
                  <ArrowUpDownIcon className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading products..." : "No products found"}
                </TableCell>
              </TableRow>
            ) : (
              currentItems.map((product) => {
                const stockStatus = getStockStatus(product.stock, product.min_stock)
                const profitMargin = calculateProfitMargin(product)
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        {product.image ? (
                          <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                            <Image
                              src={product.image || "/placeholder.svg?height=40&width=40"}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <PackageIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <span>{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>DH {product.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {profitMargin !== null ? (
                        <span
                          className={cn(
                            "font-medium",
                            profitMargin >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500",
                          )}
                        >
                          {profitMargin.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.barcode ? (
                        product.barcode
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500">
                          No Barcode
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className={`h-2 w-2 rounded-full ${stockStatus.color}`}></div>
                        <span className={product.stock < product.min_stock ? "font-medium" : ""}>{product.stock}</span>
                        {product.stock < product.min_stock && (
                          <Badge variant="outline" className="text-xs">
                            Min: {product.min_stock}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category_id ? (
                        <Badge variant="secondary">{getCategoryName(product.category_id)}</Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.expiry_date ? (
                        new Date(product.expiry_date) < new Date() ? (
                          <Badge variant="destructive">
                            Expired: {new Date(product.expiry_date).toLocaleDateString()}
                          </Badge>
                        ) : (
                          new Date(product.expiry_date).toLocaleDateString()
                        )
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setPrintingProduct(product)}
                          title="Print Barcode"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEditingProduct(product)}
                          title="Edit Product"
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeletingProduct(product)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete Product"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredProducts.length)} of{" "}
              {filteredProducts.length}
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number.parseInt(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value={filteredProducts.length.toString()}>Show All</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
          {renderPagination()}
        </div>
      </>
    )
  }

  // Render grid view
  const renderGridView = () => {
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentItems.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              {isLoading ? "Loading products..." : "No products found"}
            </div>
          ) : (
            currentItems.map((product) => {
              const stockStatus = getStockStatus(product.stock, product.min_stock)
              const profitMargin = calculateProfitMargin(product)
              return (
                <Card key={product.id} className="overflow-hidden">
                  <div className="h-40 bg-gray-100 relative">
                    {product.image ? (
                      <Image
                        src={product.image || "/placeholder.svg?height=160&width=160"}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <PackageIcon className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <div className={`h-3 w-3 rounded-full ${stockStatus.color}`}></div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg truncate">{product.name}</h3>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold text-lg">DH {product.price.toFixed(2)}</span>
                      <Badge variant={product.stock < product.min_stock ? "outline" : "secondary"}>
                        Stock: {product.stock}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Profit Margin:</span>
                        {profitMargin !== null ? (
                          <span
                            className={cn(
                              "font-medium",
                              profitMargin >= 0
                                ? "text-green-600 dark:text-green-500"
                                : "text-red-600 dark:text-red-500",
                            )}
                          >
                            {profitMargin.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </div>
                      {product.barcode ? (
                        <div className="flex items-center text-sm">
                          <BarcodeIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="truncate">{product.barcode}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500">
                          No Barcode
                        </Badge>
                      )}
                      <div className="flex items-center text-sm">
                        <span className="text-muted-foreground mr-2">Category:</span>
                        {product.category_id ? (
                          getCategoryName(product.category_id)
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </div>
                      {product.expiry_date && (
                        <div className="flex items-center text-sm">
                          <span className="text-muted-foreground mr-2">Expires:</span>
                          {new Date(product.expiry_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrintingProduct(product)}
                      className="flex-1 mr-2"
                    >
                      <PrinterIcon className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingProduct(product)}
                      className="flex-1 mr-2"
                    >
                      <EditIcon className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingProduct(product)}
                      className="flex-1 text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              )
            })
          )}
        </div>
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredProducts.length)} of{" "}
              {filteredProducts.length}
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number.parseInt(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8</SelectItem>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="16">16</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="32">32</SelectItem>
                <SelectItem value={filteredProducts.length.toString()}>Show All</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
          {renderPagination()}
        </div>
      </>
    )
  }

  return (
    <div>
      <div className="p-4 space-y-4">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or barcode..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={refreshProducts}
            className="md:w-auto w-full bg-transparent"
            title="Refresh Products"
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="w-full sm:w-[180px]">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <div className="flex items-center">
                    <FilterIcon className="h-4 w-4 mr-2" />
                    <span>Category</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[180px]">
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <div className="flex items-center">
                    <FilterIcon className="h-4 w-4 mr-2" />
                    <span>Stock</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {viewType === "list" ? renderListView() : renderGridView()}

      {/* Edit Product Dialog */}
      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSave={refreshProducts}
        />
      )}

      {/* Delete Product Dialog */}
      {deletingProduct && (
        <DeleteProductDialog
          product={deletingProduct}
          onClose={() => setDeletingProduct(null)}
          onDelete={() => handleDelete(deletingProduct.id)}
        />
      )}

      {/* Print Barcode Dialog */}
      {printingProduct && <PrintBarcodeDialog product={printingProduct} onClose={() => setPrintingProduct(null)} />}
    </div>
  )
}
