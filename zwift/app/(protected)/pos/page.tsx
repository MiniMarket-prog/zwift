"use client"

import { Label } from "@/components/ui/label"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { AlertTriangle, Barcode, Plus, Search, ShoppingCart, Trash2, X, Printer, Save } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@/components/auth/user-provider"
import { getProducts, getLowStockProducts, createSale, getSale, updateSale } from "@/lib/supabase"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"

type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  image?: string | null
  stock?: number
}

export default function POS() {
  const [searchTerm, setSearchTerm] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [showLowStockDialog, setShowLowStockDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [lastSaleId, setLastSaleId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null)
  const [receiptData, setReceiptData] = useState<any>(null)

  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editSaleId = searchParams.get("edit")

  // Calculate cart totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.07 // 7% tax
  const total = subtotal + tax

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch products
        const productsData = await getProducts(searchTerm)
        setFilteredProducts(productsData)

        // Fetch low stock products
        const lowStockData = await getLowStockProducts()
        setLowStockProducts(lowStockData)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to fetch products. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [searchTerm, toast])

  // Check if we're editing an existing sale
  useEffect(() => {
    if (editSaleId) {
      loadSaleForEditing(editSaleId)
    }
  }, [editSaleId])

  const loadSaleForEditing = async (saleId: string) => {
    try {
      setIsLoading(true)
      setIsEditing(true)
      setEditingSaleId(saleId)

      // Fetch the sale and its items
      const { sale, items } = await getSale(saleId)

      if (!sale || !items) {
        throw new Error("Sale not found")
      }

      // Set payment method
      setPaymentMethod(sale.payment_method || "cash")

      // Convert sale items to cart items
      const cartItems: CartItem[] = []

      for (const item of items) {
        // Fetch product details for each item
        const productData =
          filteredProducts.find((p) => p.id === item.product_id) || (await getProducts("", item.product_id))

        if (productData) {
          cartItems.push({
            id: item.product_id,
            name: productData.name || "Unknown Product",
            price: item.price,
            quantity: item.quantity,
            image: productData.image,
            stock: productData.stock,
          })
        }
      }

      setCart(cartItems)

      toast({
        title: "Sale Loaded",
        description: "You are now editing an existing sale.",
      })
    } catch (error) {
      console.error("Error loading sale:", error)
      toast({
        title: "Error",
        description: "Failed to load sale for editing.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Add product to cart
  const addToCart = (product: any) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id)

      if (existingItem) {
        return prevCart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      } else {
        return [
          ...prevCart,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.image,
            stock: product.stock,
          },
        ]
      }
    })
  }

  // Remove item from cart
  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id))
  }

  // Update item quantity
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return

    setCart((prevCart) => prevCart.map((item) => (item.id === id ? { ...item, quantity } : item)))
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
  }

  // Handle barcode scanning
  const handleBarcodeScanner = () => {
    setShowBarcodeScanner(true)
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus()
      }
    }, 100)
  }

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm) return

    // Find product by barcode
    const product = filteredProducts.find((p) => p.barcode === searchTerm)

    if (product) {
      addToCart(product)
      setSearchTerm("")
      toast({
        title: "Product Added",
        description: `${product.name} added to cart.`,
      })
    } else {
      toast({
        title: "Product Not Found",
        description: "No product found with that barcode.",
        variant: "destructive",
      })
    }

    setShowBarcodeScanner(false)
  }

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add products to your cart before completing the sale.",
        variant: "destructive",
      })
      return
    }

    try {
      // Create sale object
      const sale = {
        total: total,
        tax: tax,
        payment_method: paymentMethod,
        user_id: user?.id,
      }

      // Create sale items
      const saleItems = cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }))

      let result

      if (isEditing && editingSaleId) {
        // Update existing sale
        result = await updateSale(editingSaleId, sale, saleItems)
        toast({
          title: "Sale Updated",
          description: `Total: $${total.toFixed(2)}`,
        })
      } else {
        // Process new sale
        result = await createSale(sale, saleItems)
        toast({
          title: "Sale Completed",
          description: `Total: $${total.toFixed(2)}`,
        })
      }

      if (result.error) {
        throw result.error
      }

      // Store the sale ID for receipt generation
      setLastSaleId(result.data?.id || null)

      // Show receipt dialog
      setReceiptData({
        saleId: result.data?.id,
        date: new Date().toLocaleString(),
        items: cart,
        subtotal,
        tax,
        total,
        paymentMethod,
      })
      setShowReceiptDialog(true)

      // Reset editing state
      setIsEditing(false)
      setEditingSaleId(null)

      // Clear cart
      clearCart()
    } catch (error) {
      console.error("Error processing sale:", error)
      toast({
        title: "Error",
        description: "Failed to process sale. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Print receipt
  const printReceipt = () => {
    const receiptWindow = window.open("", "_blank", "width=400,height=600")

    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body { font-family: monospace; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .total { margin-top: 10px; border-top: 1px solid #000; padding-top: 10px; font-weight: bold; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>RECEIPT</h2>
              <p>Sale ID: ${receiptData.saleId || "N/A"}</p>
              <p>${receiptData.date}</p>
            </div>
            
            <div class="items">
              ${receiptData.items
                .map(
                  (item: CartItem) => `
                <div class="item">
                  <span>${item.quantity} x ${item.name}</span>
                  <span>$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              `,
                )
                .join("")}
            </div>
            
            <div class="total">
              <div class="item">
                <span>Subtotal:</span>
                <span>$${receiptData.subtotal.toFixed(2)}</span>
              </div>
              <div class="item">
                <span>Tax (7%):</span>
                <span>$${receiptData.tax.toFixed(2)}</span>
              </div>
              <div class="item">
                <span>Total:</span>
                <span>$${receiptData.total.toFixed(2)}</span>
              </div>
              <div class="item">
                <span>Payment Method:</span>
                <span>${receiptData.paymentMethod.toUpperCase()}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for your purchase!</p>
            </div>
          </body>
        </html>
      `)

      receiptWindow.document.close()
      receiptWindow.focus()
      receiptWindow.print()
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">{isEditing ? "Edit Sale" : "Point of Sale"}</h2>
          {isEditing && (
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false)
                setEditingSaleId(null)
                clearCart()
                router.push("/pos")
              }}
            >
              Cancel Editing
            </Button>
          )}
        </div>

        {lowStockProducts.length > 0 && (
          <Alert variant="destructive" className="border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <div className="flex items-center justify-between w-full">
              <div>
                <AlertTitle>Low Stock Alert</AlertTitle>
                <AlertDescription>{lowStockProducts.length} products are below minimum stock levels.</AlertDescription>
              </div>
              <Button variant="destructive" onClick={() => setShowLowStockDialog(true)}>
                View{" "}
                <Badge variant="outline" className="ml-2 bg-white text-destructive">
                  {lowStockProducts.length}
                </Badge>
              </Button>
            </div>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-12">
          {/* Product Search and List */}
          <Card className="md:col-span-8">
            <CardHeader className="space-y-0 pb-2">
              <CardTitle>Products</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search products by name or scan barcode..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="gap-1" onClick={handleBarcodeScanner}>
                  <Barcode className="h-4 w-4" />
                  Scan
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p>Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                  <p>No products found. Try a different search term.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="relative aspect-square">
                          <Image
                            src={product.image || "/placeholder.svg?height=80&width=80"}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                          {product.stock < product.min_stock && (
                            <Badge variant="destructive" className="absolute top-2 right-2">
                              Low Stock: {product.stock}
                            </Badge>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium truncate">{product.name}</h3>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm font-bold">${product.price.toFixed(2)}</p>
                            <Button size="sm" onClick={() => addToCart(product)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shopping Cart */}
          <Card className="md:col-span-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {isEditing ? "Edit Sale" : "Cart"}
                </CardTitle>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="h-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground mt-1">Add products by clicking on them</p>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-26rem)] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 rounded-full"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 rounded-full"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">${(item.price * item.quantity).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.id)}
                              className="h-6 w-6 text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            {cart.length > 0 && (
              <CardFooter className="flex flex-col p-4">
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (7%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>

                  <div className="pt-4 space-y-2">
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Payment Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit">Credit Card</SelectItem>
                        <SelectItem value="debit">Debit Card</SelectItem>
                        <SelectItem value="mobile">Mobile Payment</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button className="w-full" onClick={processPayment}>
                      {isEditing ? (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Update Sale
                        </>
                      ) : (
                        <>Complete Sale</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      {/* Barcode Scanner Dialog */}
      <Dialog open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
            <DialogDescription>Scan a product barcode or enter it manually.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBarcodeSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  ref={barcodeInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Scan or enter barcode"
                  className="text-center text-xl"
                  autoComplete="off"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Add to Cart</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Low Stock Dialog */}
      <Dialog open={showLowStockDialog} onOpenChange={setShowLowStockDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Low Stock Products</DialogTitle>
            <DialogDescription>
              These products are below their minimum stock threshold and need to be restocked.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Image
                          src={product.image || "/placeholder.svg?height=40&width=40"}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="rounded-md"
                        />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">${product.price.toFixed(2)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-destructive font-medium">{product.stock}</TableCell>
                    <TableCell>{product.min_stock}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          addToCart(product)
                          setShowLowStockDialog(false)
                        }}
                      >
                        Add to Cart
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLowStockDialog(false)}>
              Close
            </Button>
            <Button asChild>
              <a href="/inventory">Manage Inventory</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
            <DialogDescription>Sale completed successfully.</DialogDescription>
          </DialogHeader>
          {receiptData && (
            <div className="space-y-4">
              <div className="border rounded-md p-4 bg-muted/20">
                <div className="text-center mb-4">
                  <h3 className="font-bold">RECEIPT</h3>
                  <p className="text-sm text-muted-foreground">Sale ID: {receiptData.saleId || "N/A"}</p>
                  <p className="text-sm text-muted-foreground">{receiptData.date}</p>
                </div>

                <div className="space-y-2">
                  {receiptData.items.map((item: CartItem, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.quantity} x {item.name}
                      </span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-2" />

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${receiptData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (7%):</span>
                    <span>${receiptData.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${receiptData.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Payment Method:</span>
                    <span className="capitalize">{receiptData.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-center mt-4 text-sm text-muted-foreground">
                  <p>Thank you for your purchase!</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
              Close
            </Button>
            <Button onClick={printReceipt}>
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

