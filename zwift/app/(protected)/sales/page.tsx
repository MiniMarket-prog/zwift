"use client"

import { useState, useEffect } from "react"
import { Calendar, ChevronDown, Download, Eye, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { supabase } from "@/lib/supabase"

export default function SalesHistory() {
  const [sales, setSales] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [showSaleDetails, setShowSaleDetails] = useState(false)
  const [currentSale, setCurrentSale] = useState<any>(null)
  const [saleItems, setSaleItems] = useState<any[]>([])
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({})

  useEffect(() => {
    fetchSales()
    fetchUserProfiles()
  }, [dateRange])

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

  const fetchSales = async () => {
    setIsLoading(true)
    try {
      let query = supabase.from("sales").select("*").order("created_at", { ascending: false })

      if (searchTerm) {
        query = query.or(`id.ilike.%${searchTerm}%`)
      }

      if (dateRange.from) {
        query = query.gte("created_at", dateRange.from.toISOString())
      }

      if (dateRange.to) {
        query = query.lte("created_at", new Date(dateRange.to.setHours(23, 59, 59, 999)).toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      setSales(data || [])
    } catch (error) {
      console.error("Error fetching sales:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSaleDetails = async (saleId: string) => {
    try {
      // First, fetch the sale items
      const { data: itemsData, error: itemsError } = await supabase.from("sale_items").select("*").eq("sale_id", saleId)

      if (itemsError) throw itemsError

      // Then, for each item, fetch the product details
      const itemsWithProducts = await Promise.all(
        itemsData.map(async (item) => {
          const { data: productData, error: productError } = await supabase
            .from("products")
            .select("name, image")
            .eq("id", item.product_id)
            .single()

          if (productError) {
            console.error("Error fetching product:", productError)
            return {
              ...item,
              products: { name: "Unknown Product", image: null },
            }
          }

          return {
            ...item,
            products: productData,
          }
        }),
      )

      setSaleItems(itemsWithProducts || [])
    } catch (error) {
      console.error("Error fetching sale details:", error)
    }
  }

  const handleViewSale = (sale: any) => {
    setCurrentSale(sale)
    fetchSaleDetails(sale.id)
    setShowSaleDetails(true)
  }

  const handleEditSale = (saleId: string) => {
    // Navigate to POS with sale ID to edit
    window.location.href = `/pos?edit=${saleId}`
  }

  const handleExportCSV = () => {
    // Implement CSV export logic
    alert("Exporting sales to CSV...")
  }

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      fetchSales()
    }, 500)

    return () => clearTimeout(delaySearch)
  }, [searchTerm])

  // Get the user's name from the profiles map
  const getUserName = (userId: string) => {
    return userProfiles[userId]?.full_name || "Unknown"
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Sales History</h2>
          <Button onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Sales</CardTitle>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by sale ID..."
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
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      Loading sales...
                    </TableCell>
                  </TableRow>
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      No sales found. Complete your first sale to see it here.
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.id.substring(0, 8)}...</TableCell>
                      <TableCell>{format(new Date(sale.created_at), "MMM d, yyyy h:mm a")}</TableCell>
                      <TableCell>{getUserName(sale.user_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {sale.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">${sale.total.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewSale(sale)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditSale(sale.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Edit in POS
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

      {/* Sale Details Dialog */}
      <Dialog open={showSaleDetails} onOpenChange={setShowSaleDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
          </DialogHeader>
          {currentSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Sale ID</p>
                  <p className="font-medium">{currentSale.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(currentSale.created_at), "MMMM d, yyyy h:mm a")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cashier</p>
                  <p className="font-medium">{getUserName(currentSale.user_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{currentSale.payment_method}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          Loading items...
                        </TableCell>
                      </TableRow>
                    ) : (
                      saleItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 rounded-md bg-muted">
                                {item.products?.image && (
                                  <img
                                    src={item.products.image || "/placeholder.svg"}
                                    alt={item.products.name}
                                    className="h-full w-full rounded-md object-cover"
                                  />
                                )}
                              </div>
                              <span>{item.products?.name || "Unknown Product"}</span>
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${(item.price * item.quantity).toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between border-t pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="font-medium">${(currentSale.total - currentSale.tax).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax</p>
                  <p className="font-medium">${currentSale.tax.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium">${currentSale.total.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowSaleDetails(false)}>
                  Close
                </Button>
                <Button onClick={() => handleEditSale(currentSale.id)}>Edit in POS</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

