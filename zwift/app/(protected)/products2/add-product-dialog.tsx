"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, RefreshCw } from "lucide-react"
import type { Category } from "@/types"

interface AddProductDialogProps {
  categories: Category[]
  onClose: () => void
  onProductAdded: () => void
}

export function AddProductDialog({ categories, onClose, onProductAdded }: AddProductDialogProps) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [barcode, setBarcode] = useState("")
  const [stock, setStock] = useState("0")
  const [minStock, setMinStock] = useState("0")
  const [categoryId, setCategoryId] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [hasPack, setHasPack] = useState(false)
  const [packQuantity, setPackQuantity] = useState("1")
  const [packDiscountPercentage, setPackDiscountPercentage] = useState("0")
  const [packBarcode, setPackBarcode] = useState("")
  const [packName, setPackName] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState(false)

  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!name) {
        toast({
          title: "Validation Error",
          description: "Product name is required",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Convert string values to appropriate types
      const priceValue = Number.parseFloat(price) || 0
      const stockValue = Number.parseInt(stock) || 0
      const minStockValue = Number.parseInt(minStock) || 0
      const purchasePriceValue = Number.parseFloat(purchasePrice) || 0
      const packQuantityValue = Number.parseInt(packQuantity) || 1
      const packDiscountValue = Number.parseFloat(packDiscountPercentage) || 0

      // Create product object
      const productData = {
        name,
        price: priceValue,
        barcode,
        stock: stockValue,
        min_stock: minStockValue,
        category_id: categoryId || null,
        purchase_price: purchasePriceValue || null,
        image: imageUrl || null,
        has_pack: hasPack,
        pack_quantity: hasPack ? packQuantityValue : null,
        pack_discount_percentage: hasPack ? packDiscountValue : null,
        pack_barcode: hasPack ? packBarcode : null,
        pack_name: hasPack ? packName : null,
      }

      // Insert product into database
      const { data, error } = await supabase.from("products").insert(productData).select().single()

      if (error) {
        throw error
      }

      toast({
        title: "Product added",
        description: `${name} has been added successfully.`,
      })

      // Call the onProductAdded callback to refresh the product list
      onProductAdded()

      // Close the dialog
      onClose()

      // Refresh the page to show the updated product list
      router.refresh()
    } catch (error: any) {
      console.error("Error adding product:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add product. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateRandomBarcode = () => {
    setIsGeneratingBarcode(true)
    try {
      // Generate a random 13-digit EAN-13 barcode
      const digits = []

      // First 12 digits are random
      for (let i = 0; i < 12; i++) {
        digits.push(Math.floor(Math.random() * 10))
      }

      // Calculate check digit (13th digit)
      let sum = 0
      for (let i = 0; i < 12; i++) {
        sum += digits[i] * (i % 2 === 0 ? 1 : 3)
      }
      const checkDigit = (10 - (sum % 10)) % 10

      // Combine all digits
      const barcodeValue = [...digits, checkDigit].join("")
      setBarcode(barcodeValue)

      toast({
        title: "Barcode generated",
        description: `Generated barcode: ${barcodeValue}`,
      })
    } catch (error) {
      console.error("Error generating barcode:", error)
      toast({
        title: "Error",
        description: "Failed to generate barcode. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingBarcode(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the product details below. Required fields are marked with an asterisk (*).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name *
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Price *
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="barcode" className="text-right">
              Barcode
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} className="flex-1" />
              <Button type="button" variant="outline" onClick={generateRandomBarcode} disabled={isGeneratingBarcode}>
                {isGeneratingBarcode ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                Generate
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stock" className="text-right">
              Stock *
            </Label>
            <Input
              id="stock"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="min_stock" className="text-right">
              Min. Stock *
            </Label>
            <Input
              id="min_stock"
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="purchase_price" className="text-right">
              Purchase Price
            </Label>
            <Input
              id="purchase_price"
              type="number"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image_url" className="text-right">
              Image URL
            </Label>
            <Input
              id="image_url"
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="col-span-3"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="has_pack" className="text-right">
              Has Pack
            </Label>
            <div className="flex items-center col-span-3">
              <Switch id="has_pack" checked={hasPack} onCheckedChange={setHasPack} />
              <span className="ml-2 text-sm text-muted-foreground">Enable if this product is available in packs</span>
            </div>
          </div>

          {hasPack && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pack_quantity" className="text-right">
                  Pack Quantity
                </Label>
                <Input
                  id="pack_quantity"
                  type="number"
                  value={packQuantity}
                  onChange={(e) => setPackQuantity(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pack_discount" className="text-right">
                  Pack Discount (%)
                </Label>
                <Input
                  id="pack_discount"
                  type="number"
                  step="0.01"
                  value={packDiscountPercentage}
                  onChange={(e) => setPackDiscountPercentage(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pack_barcode" className="text-right">
                  Pack Barcode
                </Label>
                <Input
                  id="pack_barcode"
                  value={packBarcode}
                  onChange={(e) => setPackBarcode(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pack_name" className="text-right">
                  Pack Name
                </Label>
                <Input
                  id="pack_name"
                  value={packName}
                  onChange={(e) => setPackName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Product"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
