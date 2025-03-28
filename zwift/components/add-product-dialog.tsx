"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { addProduct } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { BarcodeIcon, RefreshCwIcon, PackageIcon } from "lucide-react"

interface Category {
  id: string
  name: string
}

export function AddProductDialog({
  categories,
  onClose,
}: {
  categories: Category[]
  onClose: () => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    barcode: "",
    stock: "0",
    min_stock: "5",
    image: "",
    category_id: "",
    purchase_price: "",
    expiry_date: "",
    expiry_notification_days: "30",
    // New pack-related fields
    has_pack: false,
    pack_quantity: "6",
    pack_discount_percentage: "0",
    pack_barcode: "",
    pack_name: "",
  })

  // Calculate pack price based on unit price, quantity and discount
  const [packPrice, setPackPrice] = useState("0.00")

  useEffect(() => {
    if (formData.has_pack && formData.price && formData.pack_quantity) {
      const unitPrice = Number.parseFloat(formData.price)
      const quantity = Number.parseInt(formData.pack_quantity)
      const discount = Number.parseFloat(formData.pack_discount_percentage) || 0

      const calculatedPackPrice = (unitPrice * quantity * (1 - discount / 100)).toFixed(2)
      setPackPrice(calculatedPackPrice)
    }
  }, [formData.price, formData.pack_quantity, formData.pack_discount_percentage, formData.has_pack])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))

    // If enabling pack mode and pack name is empty, set a default pack name
    if (name === "has_pack" && checked && !formData.pack_name) {
      setFormData((prev) => ({
        ...prev,
        pack_name: `${formData.name} Pack`,
      }))
    }
  }

  const generateRandomBarcode = () => {
    // Generate a random 13-digit EAN barcode
    const barcode = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join("")
    setFormData((prev) => ({ ...prev, barcode }))
  }

  const generatePackBarcode = () => {
    // Generate a random 13-digit EAN barcode for the pack
    const barcode = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join("")
    setFormData((prev) => ({ ...prev, pack_barcode: barcode }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // First add the main product
      const productData = { ...formData }
      await addProduct(productData)

      toast({
        title: "Product added",
        description: "The product has been added successfully.",
      })
      router.refresh()
      onClose()
    } catch (error) {
      console.error("Error adding product:", error)
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
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
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="pack">Pack Options</TabsTrigger>
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
                    Generate
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

              <div className="flex items-center space-x-2">
                <Switch
                  id="has_pack"
                  checked={formData.has_pack}
                  onCheckedChange={(checked) => handleSwitchChange("has_pack", checked)}
                />
                <Label htmlFor="has_pack" className="flex items-center gap-2">
                  <PackageIcon className="h-4 w-4" />
                  This product can be sold in packs
                </Label>
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

            <TabsContent value="pack" className="space-y-4 pt-4">
              {!formData.has_pack ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <PackageIcon className="h-12 w-12 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Pack Options Disabled</h3>
                  <p>Enable "This product can be sold in packs" in the Basic Info tab to configure pack options.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pack_name">Pack Name *</Label>
                    <Input
                      id="pack_name"
                      name="pack_name"
                      value={formData.pack_name || `${formData.name} Pack`}
                      onChange={handleChange}
                      placeholder={`${formData.name} Pack`}
                      required={formData.has_pack}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pack_quantity">Units Per Pack *</Label>
                      <Input
                        id="pack_quantity"
                        name="pack_quantity"
                        type="number"
                        min="2"
                        value={formData.pack_quantity}
                        onChange={handleChange}
                        required={formData.has_pack}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pack_discount_percentage">Pack Discount (%)</Label>
                      <Input
                        id="pack_discount_percentage"
                        name="pack_discount_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.pack_discount_percentage}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="pack_barcode">Pack Barcode *</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={generatePackBarcode}
                        className="h-8 px-2 text-xs"
                      >
                        <RefreshCwIcon className="h-3 w-3 mr-1" />
                        Generate
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Input
                        id="pack_barcode"
                        name="pack_barcode"
                        value={formData.pack_barcode}
                        onChange={handleChange}
                        required={formData.has_pack}
                        maxLength={20}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={generatePackBarcode}
                        className="h-10 w-10"
                      >
                        <BarcodeIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-md bg-muted/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Calculated Pack Price</h4>
                        <p className="text-sm text-muted-foreground">Based on unit price, quantity and discount</p>
                      </div>
                      <div className="text-xl font-bold">{packPrice}</div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Calculation: {formData.price} × {formData.pack_quantity} units × (1 -{" "}
                      {formData.pack_discount_percentage}%)
                    </div>
                  </div>
                </>
              )}
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
                  onClick={() => {
                    if (activeTab === "additional") setActiveTab("pack")
                    else if (activeTab === "pack") setActiveTab("inventory")
                    else setActiveTab("basic")
                  }}
                >
                  Previous
                </Button>
              )}

              {activeTab !== "additional" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (activeTab === "basic") setActiveTab("inventory")
                    else if (activeTab === "inventory") setActiveTab("pack")
                    else setActiveTab("additional")
                  }}
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
                {isLoading ? "Adding..." : "Add Product"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

