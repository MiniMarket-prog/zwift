"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { generatePurchaseOrder } from "@/app/actions/purchase-orders"
import { getSuppliers } from "@/app/actions/suppliers"
import { createClient } from "@/lib/supabase-client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CalendarIcon, Loader2, Plus } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface Product {
  id: string
  name: string
  price: number
  barcode?: string
}

interface Supplier {
  id: string
  name: string
}

interface CreatePurchaseOrderButtonProps {
  onOrderCreated?: () => void
}

export function CreatePurchaseOrderButton({ onOrderCreated }: CreatePurchaseOrderButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("")
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState(0)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState("")
  const [showProductList, setShowProductList] = useState(false)
  const { toast } = useToast()
  const [selectedSupplier, setSelectedSupplier] = useState<string>("")

  // Fetch suppliers when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchSuppliers()
    }
  }, [isOpen])

  const fetchSuppliers = async () => {
    setIsLoadingSuppliers(true)
    try {
      const result = await getSuppliers()

      if (result.error) {
        throw result.error
      }

      setSuppliers(result.data)

      // Select the first supplier by default if available
      if (result.data.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(result.data[0].id)
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error)
      toast({
        title: "Error",
        description: "Failed to load suppliers",
        variant: "destructive",
      })
    } finally {
      setIsLoadingSuppliers(false)
    }
  }

  const searchProducts = async (term: string) => {
    if (!term) {
      setProducts([])
      return
    }

    setIsLoadingProducts(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, barcode")
        .or(`name.ilike.%${term}%,barcode.ilike.%${term}%`)
        .limit(10)

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error searching products:", error)
      toast({
        title: "Error",
        description: "Failed to search products",
        variant: "destructive",
      })
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)
    setShowProductList(true)
    searchProducts(term)
  }

  const selectProduct = (product: Product) => {
    setSelectedProduct(product)
    setSearchTerm(product.name)
    setUnitPrice(product.price)
    setShowProductList(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: "Please select a product",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Find the selected supplier
      const supplier = suppliers.find((s) => s.id === selectedSupplierId)

      const result = await generatePurchaseOrder({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity,
        unit_price: unitPrice,
        supplier_id: selectedSupplierId,
        supplier_name: supplier?.name || "Unknown Supplier",
        expected_delivery_date: date ? date.toISOString() : undefined,
        notes,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: "Success",
        description: "Purchase order created successfully",
      })

      // Reset form
      setSelectedProduct(null)
      setSearchTerm("")
      setQuantity(1)
      setUnitPrice(0)
      setDate(undefined)
      setNotes("")
      setIsOpen(false)

      // Call the callback if provided
      if (onOrderCreated) {
        onOrderCreated()
      }
    } catch (error) {
      console.error("Error creating purchase order:", error)
      toast({
        title: "Error",
        description: typeof error === "string" ? error : "Failed to create purchase order",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Purchase Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>Create a new purchase order to restock inventory</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="product">Product</Label>
              <div className="relative">
                <Input
                  id="product"
                  placeholder="Search by product name or barcode"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setShowProductList(true)}
                  onBlur={() => {
                    // Delay hiding to allow for clicks
                    setTimeout(() => setShowProductList(false), 200)
                  }}
                />
                {showProductList && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {isLoadingProducts ? (
                      <div className="p-2 text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : products.length > 0 ? (
                      products.map((product) => (
                        <div
                          key={product.id}
                          className="p-2 hover:bg-muted cursor-pointer"
                          onMouseDown={() => selectProduct(product)}
                        >
                          <div className="font-medium">{product.name}</div>
                          {product.barcode && (
                            <div className="text-xs text-muted-foreground">Barcode: {product.barcode}</div>
                          )}
                        </div>
                      ))
                    ) : searchTerm ? (
                      <div className="p-2 text-center text-muted-foreground">No products found</div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitPrice">Unit Price ($)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number.parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier">Supplier</Label>
              <div className="flex gap-2">
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => window.open("/suppliers", "_blank")}
                  title="Manage Suppliers"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Expected Delivery Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedProduct || !selectedSupplierId}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

