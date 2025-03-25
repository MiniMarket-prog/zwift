"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { updateProduct } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { BarcodeIcon, RefreshCwIcon } from "lucide-react"

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
}

interface Category {
  id: string
  name: string
}

export function EditProductDialog({
  product,
  categories,
  onClose,
  onSave,
}: {
  product: Product
  categories: Category[]
  onClose: () => void
  onSave: () => void
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [formData, setFormData] = useState({
    name: product.name,
    price: product.price.toString(),
    barcode: product.barcode,
    stock: product.stock.toString(),
    min_stock: product.min_stock.toString(),
    image: product.image || "",
    category_id: product.category_id || "",
    purchase_price: product.purchase_price?.toString() || "",
    expiry_date: product.expiry_date || "",
    expiry_notification_days: product.expiry_notification_days?.toString() || "30",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const generateRandomBarcode = () => {
    // Generate a random 13-digit EAN barcode
    const barcode = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join("")
    setFormData((prev) => ({ ...prev, barcode }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await updateProduct(product.id, formData)
      toast({
        title: "Product updated",
        description: "The product has been updated successfully.",
      })
      onSave()
      router.refresh()
      onClose()
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Selling Price *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Purchase Price</Label>
                  <Input
                    id="purchase_price"
                    name="purchase_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchase_price}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="barcode">Barcode *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateRandomBarcode}
                    className="h-8 px-2 text-xs"
                  >
                    <RefreshCwIcon className="h-3 w-3 mr-1" />
                    Generate New
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Input
                    id="barcode"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    required
                    maxLength={20}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generateRandomBarcode}
                    className="h-10 w-10"
                  >
                    <BarcodeIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleSelectChange("category_id", value)}
                >
                  <SelectTrigger>
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
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Current Stock *</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_stock">Minimum Stock *</Label>
                  <Input
                    id="min_stock"
                    name="min_stock"
                    type="number"
                    min="0"
                    value={formData.min_stock}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    name="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry_notification_days">Notification Days</Label>
                  <Input
                    id="expiry_notification_days"
                    name="expiry_notification_days"
                    type="number"
                    min="1"
                    value={formData.expiry_notification_days}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="additional" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {formData.image && (
                <div className="border rounded-md p-2 mt-2">
                  <div className="text-sm text-muted-foreground mb-2">Image Preview:</div>
                  <div className="h-40 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={formData.image || "/placeholder.svg?height=200&width=200"}
                      alt="Product preview"
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=200&width=200"
                      }}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between items-center pt-4">
            <div className="flex space-x-2">
              {activeTab !== "basic" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab(activeTab === "additional" ? "inventory" : "basic")}
                >
                  Previous
                </Button>
              )}

              {activeTab !== "additional" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab(activeTab === "basic" ? "inventory" : "additional")}
                >
                  Next
                </Button>
              )}
            </div>

            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

