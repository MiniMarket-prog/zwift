"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Search, Loader2, Plus, Grid, List } from "lucide-react"
import { ProductList } from "./product-list"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase-client"
import type { SupportedCurrency } from "@/lib/format-currency"
import { EditProductDialog } from "@/app/(protected)/products/add-product-dialog"
import { Progress } from "@/components/ui/progress"

interface Category {
  id: string
  name: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [viewType, setViewType] = useState<"list" | "grid">("grid")
  const [currency, setCurrency] = useState<SupportedCurrency>("USD")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [totalProductCount, setTotalProductCount] = useState(0)

  const supabase = createClient()
  const { toast } = useToast()

  const fetchProducts = async () => {
    setIsLoading(true)
    setLoadingProgress(0)

    try {
      // First, get the total count of products
      const { count, error: countError } = await supabase.from("products").select("*", { count: "exact", head: true })

      if (countError) {
        throw countError
      }

      const totalCount = count || 0
      setTotalProductCount(totalCount)

      // Calculate how many pages we need to fetch
      const PAGE_SIZE = 1000 // Supabase's maximum limit
      const totalPages = Math.ceil(totalCount / PAGE_SIZE)

      let allProducts: any[] = []

      // Set up progress tracking
      const progressIncrement = 90 / totalPages
      let currentProgress = 0

      // Fetch products page by page
      for (let page = 0; page < totalPages; page++) {
        const from = page * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        const { data: pageData, error } = await supabase.from("products").select("*").order("name").range(from, to)

        if (error) throw error

        if (pageData) {
          allProducts = [...allProducts, ...pageData]
        }

        // Update progress
        currentProgress += progressIncrement
        setLoadingProgress(Math.min(Math.round(currentProgress), 90))
      }

      setLoadingProgress(95)
      setProducts(allProducts)

      toast({
        title: "Products loaded",
        description: `Successfully loaded ${allProducts.length} products`,
      })

      setLoadingProgress(100)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name")
      if (error) {
        console.error("Error fetching categories:", error)
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive",
        })
      } else {
        setCategories(data || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  // Fetch currency setting
  const fetchCurrency = useCallback(async () => {
    try {
      // First try to get global settings
      let { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("*")
        .eq("type", "global")
        .single()

      // If no global settings, try system settings
      if (settingsError || !settingsData) {
        const { data: systemData, error: systemError } = await supabase
          .from("settings")
          .select("*")
          .eq("type", "system")
          .single()

        if (!systemError && systemData) {
          settingsData = systemData
          settingsError = null
        }
      }

      if (!settingsError && settingsData) {
        // First check if settings.settings exists and has currency
        let currencyValue = "USD"

        if (settingsData.settings && typeof settingsData.settings === "object" && settingsData.settings !== null) {
          // Check for currency in settings.settings
          if ("currency" in settingsData.settings && typeof settingsData.settings.currency === "string") {
            currencyValue = settingsData.settings.currency
          }
        }

        // Fallback to top-level currency field if it exists
        if (settingsData.currency && typeof settingsData.currency === "string") {
          currencyValue = settingsData.currency
        }

        setCurrency(currencyValue as SupportedCurrency)
      }
    } catch (error) {
      console.error("Error fetching currency setting:", error)
      setCurrency("USD") // Default fallback
    }
  }, [supabase])

  // Handle search with server-side filtering
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value
    setSearchQuery(searchValue)

    if (searchValue.length > 2) {
      setIsLoading(true)
      setLoadingProgress(10)

      try {
        // First, get the total count of filtered products
        const { count, error: countError } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .or(`name.ilike.%${searchValue}%,barcode.ilike.%${searchValue}%`)

        if (countError) throw countError

        const totalCount = count || 0
        const PAGE_SIZE = 1000
        const totalPages = Math.ceil(totalCount / PAGE_SIZE)

        let filteredProducts: any[] = []
        const progressIncrement = 80 / totalPages
        let currentProgress = 10

        // Fetch filtered products page by page
        for (let page = 0; page < totalPages; page++) {
          const from = page * PAGE_SIZE
          const to = from + PAGE_SIZE - 1

          const { data: pageData, error } = await supabase
            .from("products")
            .select("*")
            .or(`name.ilike.%${searchValue}%,barcode.ilike.%${searchValue}%`)
            .order("name")
            .range(from, to)

          if (error) throw error

          if (pageData) {
            filteredProducts = [...filteredProducts, ...pageData]
          }

          // Update progress
          currentProgress += progressIncrement
          setLoadingProgress(Math.min(Math.round(currentProgress), 90))
        }

        setLoadingProgress(95)
        setProducts(filteredProducts)
        setLoadingProgress(100)
      } catch (error) {
        console.error("Error searching products:", error)
        toast({
          title: "Error",
          description: "Failed to search products",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    } else if (searchValue.length === 0) {
      // If search is cleared, fetch all products again
      fetchProducts()
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchCategories()
    fetchCurrency()
  }, [fetchCurrency])

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value)
  }

  const toggleViewType = () => {
    setViewType(viewType === "grid" ? "list" : "grid")
  }

  // Filter products on client side for immediate response
  const filteredProducts = products.filter((product) => {
    const categoryMatch = categoryFilter === "all" || product.category_id === categoryFilter
    return categoryMatch
  })

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your store products and categories</p>
        </div>

        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name or barcode..."
            className="pl-8"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>

        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
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

          <Button variant="outline" onClick={toggleViewType} title={viewType === "grid" ? "List View" : "Grid View"}>
            {viewType === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>

          <Button variant="outline" onClick={fetchProducts} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Progress bar for loading state */}
      {isLoading && loadingProgress > 0 && loadingProgress < 100 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Loading products...</span>
            <span>{Math.round(loadingProgress)}%</span>
          </div>
          <Progress value={loadingProgress} className="h-2" />
        </div>
      )}

      {isLoading && loadingProgress === 0 ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Loading products...</p>
        </div>
      ) : (
        <ProductList
          initialProducts={filteredProducts}
          categories={categories}
          viewType={viewType}
          currency={currency}
          totalProductCount={totalProductCount}
        />
      )}

      {isDialogOpen && (
        <EditProductDialog
          product={{
            id: "",
            name: "",
            price: 0,
            barcode: "",
            stock: 0,
            min_stock: 0,
          }}
          categories={categories}
          onClose={() => {
            setIsDialogOpen(false)
            fetchProducts() // Refresh products after dialog closes
          }}
          onSave={fetchProducts}
        />
      )}
    </div>
  )
}
