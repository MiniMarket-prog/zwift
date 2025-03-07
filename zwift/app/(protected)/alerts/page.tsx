"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, ArrowUpRight, Package, Search, ShoppingCart } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getLowStockProducts } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"
import Link from "next/link"

export default function AlertsPage() {
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Mock categories - replace with data from Supabase
  const categories = [
    { id: "1", name: "Electronics" },
    { id: "2", name: "Clothing" },
    { id: "3", name: "Food" },
    { id: "4", name: "Home" },
    { id: "5", name: "Beauty" },
  ]

  // Mock expiring products - replace with data from Supabase
  const expiringProducts = [
    {
      id: 1,
      name: "Milk",
      expiry_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      stock: 15,
      category_id: "3",
      image: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 2,
      name: "Yogurt",
      expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      stock: 8,
      category_id: "3",
      image: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 3,
      name: "Fresh Bread",
      expiry_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      stock: 12,
      category_id: "3",
      image: "/placeholder.svg?height=40&width=40",
    },
  ]

  useEffect(() => {
    fetchLowStockProducts()
  }, [])

  const fetchLowStockProducts = async () => {
    setIsLoading(true)
    try {
      const data = await getLowStockProducts()
      setLowStockProducts(data)
      setFilteredProducts(data)
    } catch (error) {
      console.error("Error fetching low stock products:", error)
      toast({
        title: "Error",
        description: "Failed to fetch low stock products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    filterProducts()
  }, [searchTerm, categoryFilter, lowStockProducts])

  const filterProducts = () => {
    let filtered = [...lowStockProducts]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((product) => product.category_id === categoryFilter)
    }

    setFilteredProducts(filtered)
  }

  const handleAddToCart = (productId: string) => {
    // Implement add to cart functionality
    toast({
      title: "Added to cart",
      description: "Product has been added to the cart.",
    })
  }

  const handleRestock = (productId: string) => {
    // Implement restock functionality
    toast({
      title: "Restock initiated",
      description: "Product has been marked for restocking.",
    })
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const getDaysUntilExpiry = (expiryDate: Date) => {
    const today = new Date()
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Alerts</h2>
        </div>

        <Alert variant="destructive" className="border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Attention Required</AlertTitle>
          <AlertDescription>
            {filteredProducts.length} products are below minimum stock levels and need to be restocked.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="low-stock" className="space-y-4">
          <TabsList>
            <TabsTrigger value="low-stock" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>Low Stock</span>
              <Badge variant="destructive" className="ml-1">
                {lowStockProducts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="expiring" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Expiring Soon</span>
              <Badge variant="destructive" className="ml-1">
                {expiringProducts.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="low-stock" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Low Stock Products</CardTitle>
                <CardDescription>Products that need to be restocked soon.</CardDescription>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search products..."
                      className="pl-8 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select defaultValue="all" onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Category" />
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
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Image</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min Stock</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          Loading low stock products...
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          {searchTerm || categoryFilter !== "all"
                            ? "No products match your filters."
                            : "No low stock products found."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Image
                              src={product.image || "/placeholder.svg?height=40&width=40"}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="rounded-md object-cover"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-destructive font-medium">{product.stock}</TableCell>
                          <TableCell>{product.min_stock}</TableCell>
                          <TableCell>{categories.find((c) => c.id === product.category_id)?.name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">Low Stock</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleAddToCart(product.id)}>
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Add to Cart
                              </Button>
                              <Button size="sm" onClick={() => handleRestock(product.id)}>
                                Restock
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredProducts.length} of {lowStockProducts.length} low stock products
                </p>
                <Button asChild>
                  <Link href="/inventory">
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Manage Inventory
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="expiring" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Expiring Products</CardTitle>
                <CardDescription>Products that will expire soon.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Image</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Left</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          No expiring products found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      expiringProducts.map((product) => {
                        const daysLeft = getDaysUntilExpiry(product.expiry_date)
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <Image
                                src={product.image || "/placeholder.svg?height=40&width=40"}
                                alt={product.name}
                                width={40}
                                height={40}
                                className="rounded-md object-cover"
                              />
                            </TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{formatDate(product.expiry_date)}</TableCell>
                            <TableCell>
                              <Badge variant={daysLeft <= 1 ? "destructive" : daysLeft <= 3 ? "outline" : "secondary"}>
                                {daysLeft} {daysLeft === 1 ? "day" : "days"}
                              </Badge>
                            </TableCell>
                            <TableCell>{product.stock}</TableCell>
                            <TableCell>{categories.find((c) => c.id === product.category_id)?.name || "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddToCart(product.id.toString())}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-1" />
                                  Add to Cart
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    // Implement discard functionality
                                    toast({
                                      title: "Product marked for discard",
                                      description: "The product has been marked for discard.",
                                    })
                                  }}
                                >
                                  Discard
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex justify-between">
                <p className="text-sm text-muted-foreground">Showing {expiringProducts.length} expiring products</p>
                <Button asChild>
                  <Link href="/inventory">
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Manage Inventory
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

