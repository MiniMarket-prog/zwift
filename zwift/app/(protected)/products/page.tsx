// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic"
export const revalidate = 0

import { getCategories } from "@/lib/supabase"
import { getAllProducts } from "@/lib/products-service"
import { ProductList } from "./product-list"
import { AddProductButton } from "./add-product-button"
import { GenerateBarcodesButton } from "./generate-barcodes-button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Product {
  id: string
  name: string
  price: number
  barcode: string
  stock: number
  min_stock: number
  [key: string]: any // For any additional properties
}

export default async function ProductsPage() {
  // Use the new getAllProducts function without search query initially
  const products = await getAllProducts()
  const categories = await getCategories()

  // Count products without barcodes
  const productsWithoutBarcodes = products.filter((p: Product) => !p.barcode || p.barcode.trim() === "").length

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your inventory and product details</p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          {productsWithoutBarcodes > 0 && <GenerateBarcodesButton count={productsWithoutBarcodes} />}
          <AddProductButton categories={categories} />
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="w-full">
          <Card>
            <CardContent className="p-0">
              <ProductList initialProducts={products} categories={categories} viewType="list" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="grid" className="w-full">
          <ProductList initialProducts={products} categories={categories} viewType="grid" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

