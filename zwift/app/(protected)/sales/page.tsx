"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { format } from "date-fns"
import {
  CalendarIcon,
  Search,
  Download,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Minus,
  Save,
  AlertCircle,
  ShoppingCart,
  Loader2,
  RefreshCw,
} from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
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
import { Label } from "@/components/ui/label"
import { updateSale, getProducts } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Define proper types instead of using 'any'
interface Product {
  id: string
  name: string
  price: number
  image?: string | null
  barcode?: string
  stock: number
  category_id?: string
}

interface SaleItem {
  id: string
  product_id: string
  sale_id: string
  quantity: number
  price: number
  product?: Product
}

interface Sale {
  id: string
  created_at: string
  total: number
  payment_method: string
  items?: SaleItem[]
}

const SalesPage = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editedSale, setEditedSale] = useState<Sale | null>(null)
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [activeTab, setActiveTab] = useState("items")
  const [isLoadingSaleDetails, setIsLoadingSaleDetails] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [paginatedSales, setPaginatedSales] = useState<Sale[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const supabase = createClientComponentClient()
  const { toast } = useToast()

  // Fetch sales with pagination and filtering
  const fetchSales = useCallback(async () => {
    try {
      setIsLoading(true)

      // Build the query with filters
      let query = supabase
        .from("sales")
        .select("id, created_at, total, payment_method", { count: "exact" })
        .order("created_at", { ascending: false })

      // Apply date filter if set
      if (date) {
        const dateStr = format(date, "yyyy-MM-dd")
        query = query.gte("created_at", `${dateStr}T00:00:00`).lt("created_at", `${dateStr}T23:59:59`)
      }

      // Apply search term filter if set
      if (searchTerm) {
        // Search by ID or payment method
        query = query.or(`id.ilike.%${searchTerm}%,payment_method.ilike.%${searchTerm}%`)
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      // Execute the query
      const { data: salesData, error: salesError, count } = await query

      if (salesError) throw salesError

      // Update total count and pages
      if (count !== null) {
        setTotalCount(count)
        setTotalPages(Math.max(1, Math.ceil(count / pageSize)))
      }

      // Set the sales without items (we'll fetch items only when needed)
      const salesWithoutItems =
        salesData?.map((sale) => ({
          ...sale,
          items: [],
        })) || []

      setPaginatedSales(salesWithoutItems)
    } catch (error) {
      console.error("Error fetching sales:", error)
      toast({
        title: "Error",
        description: "Failed to load sales data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, currentPage, pageSize, date, searchTerm, toast])

  // Fetch sale items for a specific sale
  const fetchSaleItems = useCallback(
    async (saleId: string) => {
      try {
        setIsLoadingSaleDetails(true)

        const { data: itemsData, error: itemsError } = await supabase
          .from("sale_items")
          .select("*, products(*)")
          .eq("sale_id", saleId)

        if (itemsError) throw itemsError

        return itemsData || []
      } catch (error) {
        console.error("Error fetching sale items:", error)
        toast({
          title: "Error",
          description: "Failed to load sale details",
          variant: "destructive",
        })
        return []
      } finally {
        setIsLoadingSaleDetails(false)
      }
    },
    [supabase, toast],
  )

  // Fetch available products for adding to sales
  const fetchAvailableProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true)
      const productsData = await getProducts()

      if (Array.isArray(productsData)) {
        setAvailableProducts(productsData as Product[])
        setFilteredProducts(productsData as Product[])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    } finally {
      setIsLoadingProducts(false)
    }
  }, [toast])

  // Initial data load
  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  // Handle search input change
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    // Reset to first page when searching
    setCurrentPage(1)
  }

  // Apply search after a short delay to avoid too many requests
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, fetchSales])

  const handleProductSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase()
    setProductSearchTerm(term)

    if (term.trim() === "") {
      setFilteredProducts(availableProducts)
    } else {
      const filtered = availableProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          (product.barcode && product.barcode.toLowerCase().includes(term)),
      )
      setFilteredProducts(filtered)
    }
  }

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate)
    // Reset to first page when changing date
    setCurrentPage(1)
  }

  // Apply date filter
  useEffect(() => {
    fetchSales()
  }, [date, fetchSales])

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number.parseInt(value))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Refetch when page size or current page changes
  useEffect(() => {
    fetchSales()
  }, [pageSize, currentPage, fetchSales])

  const handleViewDetails = async (sale: Sale) => {
    // Only fetch items if they haven't been fetched yet
    let saleWithItems = sale

    if (!sale.items || sale.items.length === 0) {
      const items = await fetchSaleItems(sale.id)
      saleWithItems = {
        ...sale,
        items,
      }

      // Update the sale in the list with the fetched items
      setPaginatedSales((prevSales) => prevSales.map((s) => (s.id === sale.id ? saleWithItems : s)))
    }

    setSelectedSale(saleWithItems)
    setIsDetailsOpen(true)
  }

  const handleEditClick = async (sale: Sale) => {
    // Fetch items if they haven't been fetched yet
    let saleWithItems = sale

    if (!sale.items || sale.items.length === 0) {
      const items = await fetchSaleItems(sale.id)
      saleWithItems = {
        ...sale,
        items,
      }

      // Update the sale in the list with the fetched items
      setPaginatedSales((prevSales) => prevSales.map((s) => (s.id === sale.id ? saleWithItems : s)))
    }

    setSelectedSale(saleWithItems)

    // Create a deep copy of the sale for editing
    setEditedSale({
      ...saleWithItems,
      items: saleWithItems.items?.map((item) => ({ ...item })),
    })

    setIsEditOpen(true)
    setActiveTab("items")

    // Fetch available products when opening edit dialog
    fetchAvailableProducts()
  }

  const handleDeleteClick = (sale: Sale) => {
    setSelectedSale(sale)
    setIsDeleteOpen(true)
  }

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (!editedSale) return

    if (newQuantity < 1) newQuantity = 1

    const updatedItems = editedSale.items?.map((item) => {
      if (item.id === itemId) {
        return { ...item, quantity: newQuantity }
      }
      return item
    })

    // Recalculate total
    const newTotal = updatedItems?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0

    setEditedSale({
      ...editedSale,
      items: updatedItems,
      total: newTotal,
    })
  }

  const handlePaymentMethodChange = (value: string) => {
    if (!editedSale) return
    setEditedSale({
      ...editedSale,
      payment_method: value,
    })
  }

  const handleAddProductToSale = (product: Product) => {
    if (!editedSale) return

    // Check if product already exists in the sale
    const existingItemIndex = editedSale.items?.findIndex((item) => item.product_id === product.id)

    const updatedItems = [...(editedSale.items || [])]

    if (existingItemIndex !== undefined && existingItemIndex >= 0) {
      // Increment quantity if product already exists
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + 1,
      }
    } else {
      // Add new item if product doesn't exist in sale
      const newItem: SaleItem = {
        // Generate a temporary ID for new items
        id: `temp_${Date.now()}_${product.id}`,
        product_id: product.id,
        sale_id: editedSale.id,
        quantity: 1,
        price: product.price,
        product: product,
      }

      updatedItems.push(newItem)
    }

    // Recalculate total
    const newTotal = updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

    setEditedSale({
      ...editedSale,
      items: updatedItems,
      total: newTotal,
    })

    // Switch back to items tab after adding
    setActiveTab("items")

    toast({
      title: "Product added",
      description: `${product.name} has been added to the sale.`,
    })
  }

  const handleRemoveItem = (itemId: string) => {
    if (!editedSale) return

    const updatedItems = editedSale.items?.filter((item) => item.id !== itemId) || []

    // Recalculate total
    const newTotal = updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

    setEditedSale({
      ...editedSale,
      items: updatedItems,
      total: newTotal,
    })

    toast({
      title: "Item removed",
      description: "The item has been removed from the sale.",
    })
  }

  const handleSaveEdit = async () => {
    if (!editedSale) return

    setIsSaving(true)
    try {
      // Prepare sale items for update
      const saleItems =
        editedSale.items?.map((item) => ({
          id: item.id.startsWith("temp_") ? undefined : item.id, // Remove temp ID for new items
          product_id: item.product_id,
          sale_id: item.sale_id,
          quantity: item.quantity,
          price: item.price,
        })) || []

      // Update the sale in the database
      const { error } = await updateSale(
        editedSale.id,
        {
          total: editedSale.total,
          payment_method: editedSale.payment_method,
          created_at: editedSale.created_at,
        },
        saleItems,
      )

      if (error) throw error

      toast({
        title: "Sale updated",
        description: "The sale has been updated successfully.",
      })

      // Refresh the sales list
      await fetchSales()
      setIsEditOpen(false)
    } catch (error) {
      console.error("Error updating sale:", error)
      toast({
        title: "Error",
        description: "Failed to update sale. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSale = async () => {
    if (!selectedSale) return

    setIsDeleting(true)
    try {
      // First delete sale items
      const { error: itemsError } = await supabase.from("sale_items").delete().eq("sale_id", selectedSale.id)

      if (itemsError) throw itemsError

      // Then delete the sale
      const { error: saleError } = await supabase.from("sales").delete().eq("id", selectedSale.id)

      if (saleError) throw saleError

      toast({
        title: "Sale deleted",
        description: "The sale has been deleted successfully.",
      })

      // Refresh the sales list
      await fetchSales()
      setIsDeleteOpen(false)
    } catch (error) {
      console.error("Error deleting sale:", error)
      toast({
        title: "Error",
        description: "Failed to delete sale. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const exportToCSV = async () => {
    try {
      setIsLoadingMore(true)
      toast({
        title: "Preparing export",
        description: "Gathering all sales data for export...",
      })

      // Fetch all sales for export (without pagination)
      let query = supabase
        .from("sales")
        .select("id, created_at, total, payment_method")
        .order("created_at", { ascending: false })

      // Apply date filter if set
      if (date) {
        const dateStr = format(date, "yyyy-MM-dd")
        query = query.gte("created_at", `${dateStr}T00:00:00`).lt("created_at", `${dateStr}T23:59:59`)
      }

      // Apply search term filter if set
      if (searchTerm) {
        query = query.or(`id.ilike.%${searchTerm}%,payment_method.ilike.%${searchTerm}%`)
      }

      const { data: allSales, error } = await query

      if (error) throw error

      // Create CSV content
      const headers = ["Sale ID", "Date", "Total", "Payment Method"]

      const csvRows = [headers]

      allSales?.forEach((sale) => {
        const row = [
          sale.id,
          format(new Date(sale.created_at), "yyyy-MM-dd HH:mm:ss"),
          `$${sale.total.toFixed(2)}`,
          sale.payment_method,
        ]

        csvRows.push(row)
      })

      // Convert to CSV string
      const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((row) => row.join(",")).join("\n")

      // Create download link
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `sales_report_${format(new Date(), "yyyy-MM-dd")}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Complete",
        description: `Exported ${allSales?.length || 0} sales records to CSV.`,
      })
    } catch (error) {
      console.error("Error exporting sales:", error)
      toast({
        title: "Export Failed",
        description: "There was an error exporting the sales data.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Function to get the total number of items in a sale
  const getTotalItems = (sale: Sale) => {
    if (sale.items && sale.items.length > 0) {
      return sale.items.reduce((total, item) => total + item.quantity, 0)
    }

    // If items haven't been loaded yet, show a placeholder
    return "-"
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Sales History</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search sales..." className="pl-8" value={searchTerm} onChange={handleSearch} />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full md:w-auto justify-start text-left font-normal", !date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Filter by date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={handleDateChange} initialFocus />
            </PopoverContent>
          </Popover>
          <Button variant="outline" className="w-full md:w-auto" onClick={exportToCSV} disabled={isLoadingMore}>
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
          <Button variant="outline" className="w-full md:w-auto" onClick={() => fetchSales()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Loading sales data...</p>
        </div>
      ) : paginatedSales.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No sales found</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(totalCount, currentPage * pageSize)} of{" "}
              {totalCount} entries
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Show</span>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue placeholder={pageSize.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm">per page</span>
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">#{sale.id}</TableCell>
                    <TableCell>{format(new Date(sale.created_at), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {sale.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{getTotalItems(sale)}</TableCell>
                    <TableCell className="text-right font-medium">${sale.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(sale)}
                          disabled={isLoadingSaleDetails && selectedSale?.id === sale.id}
                        >
                          {isLoadingSaleDetails && selectedSale?.id === sale.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          <span className="sr-only">View</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(sale)}
                          disabled={isLoadingSaleDetails && selectedSale?.id === sale.id}
                        >
                          {isLoadingSaleDetails && selectedSale?.id === sale.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Pencil className="h-4 w-4" />
                          )}
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(sale)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination controls */}
          <div className="flex justify-center mt-6">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-4">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Sale Details Dialog */}
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Sale Details</DialogTitle>
              </DialogHeader>
              {selectedSale && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Sale ID</p>
                      <p className="font-medium">#{selectedSale.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{format(new Date(selectedSale.created_at), "PPP p")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment</p>
                      <Badge variant="outline" className="capitalize">
                        {selectedSale.payment_method}
                      </Badge>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Items</h3>
                    {isLoadingSaleDetails ? (
                      <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <p>Loading sale details...</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {selectedSale.items?.map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="flex items-center">
                              {item.product?.image ? (
                                <div className="h-10 w-10 rounded overflow-hidden mr-3">
                                  <Image
                                    src={item.product.image || "/placeholder.svg"}
                                    alt={item.product?.name || "Product"}
                                    width={40}
                                    height={40}
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="h-10 w-10 bg-muted rounded flex items-center justify-center mr-3">
                                  <span className="text-xs">No img</span>
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{item.product?.name}</p>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <span>
                                    ${item.price.toFixed(2)} × {item.quantity}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between items-center font-medium">
                      <span>Total</span>
                      <span>${selectedSale.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Sale Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Edit Sale</DialogTitle>
                <DialogDescription>
                  Make changes to this sale. You can modify quantities, add products, or change payment method.
                </DialogDescription>
              </DialogHeader>
              {editedSale && (
                <div className="mt-2 flex-1 overflow-hidden flex flex-col">
                  <div className="mb-4">
                    <Label htmlFor="payment-method" className="text-sm font-medium">
                      Payment Method
                    </Label>
                    <Select value={editedSale.payment_method} onValueChange={handlePaymentMethodChange}>
                      <SelectTrigger id="payment-method" className="mt-1">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="items">Current Items</TabsTrigger>
                      <TabsTrigger value="add-products">Add Products</TabsTrigger>
                    </TabsList>

                    <TabsContent value="items" className="flex-1 overflow-hidden flex flex-col">
                      <div className="space-y-3 overflow-y-auto flex-1">
                        {editedSale.items?.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No items in this sale. Add some products from the &quot;Add Products&quot; tab.
                          </div>
                        ) : (
                          editedSale.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between py-2 border-b last:border-0"
                            >
                              <div className="flex items-center">
                                {item.product?.image ? (
                                  <div className="h-10 w-10 rounded overflow-hidden mr-3">
                                    <Image
                                      src={item.product.image || "/placeholder.svg"}
                                      alt={item.product?.name || "Product"}
                                      width={40}
                                      height={40}
                                      className="object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-10 w-10 bg-muted rounded flex items-center justify-center mr-3">
                                    <span className="text-xs">No img</span>
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{item.product?.name}</p>
                                  <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="add-products" className="flex-1 overflow-hidden flex flex-col">
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search products by name or barcode..."
                            className="pl-8"
                            value={productSearchTerm}
                            onChange={handleProductSearch}
                          />
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto">
                        {isLoadingProducts ? (
                          <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            <p>Loading products...</p>
                          </div>
                        ) : filteredProducts.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No products found matching your search.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredProducts.map((product) => (
                              <Card
                                key={product.id}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => handleAddProductToSale(product)}
                              >
                                <CardContent className="p-3 flex items-center gap-3">
                                  <div className="h-12 w-12 relative bg-muted rounded-md overflow-hidden flex-shrink-0">
                                    {product.image ? (
                                      <Image
                                        src={product.image || "/placeholder.svg"}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{product.name}</p>
                                    <div className="flex justify-between items-center">
                                      <p className="text-sm font-bold">${product.price.toFixed(2)}</p>
                                      <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                                    </div>
                                  </div>
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between items-center font-medium">
                      <span>Total</span>
                      <span>${editedSale.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit} disabled={isSaving}>
                      {isSaving ? (
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
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the sale
                  {selectedSale && ` #${selectedSale.id}`} and all its associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault()
                    handleDeleteSale()
                  }}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}

export default SalesPage

