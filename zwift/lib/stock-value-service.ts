import { createClient } from "@/lib/supabase-client"

// Define types based on your database schema
export interface Product {
  id: string
  name: string
  price: number
  barcode: string
  stock: number
  min_stock: number
  image: string | null
  category_id: string | null
  created_at: string
  purchase_price: number | null
  expiry_date: string | null
  expiry_notification_days: number | null
  is_pack: boolean
  parent_product_id: string | null
  pack_quantity: number | null
  pack_discount_percentage: number | null
  category_name?: string
  has_sales?: boolean // New field to track if product has sales history
}

// Update the Category interface to include active product counts

export interface Category {
  id: string
  name: string
  total_value: number
  total_cost: number
  product_count: number
  has_sold_products?: boolean // Track if category has products with sales
  active_product_count?: number // Count of products with sales in this category
  active_total_value?: number // Total value of products with sales in this category
  active_total_cost?: number // Total cost of products with sales in this category
}

export interface StockSummary {
  total_retail_value: number
  total_cost_value: number
  total_profit_potential: number
  total_products: number
  total_units: number
  categories: Category[]
  low_stock_value: number
  high_stock_value: number
  expired_value: number
  expiring_soon_value: number
  active_inventory_value: number // Value of products with sales history
  inactive_inventory_value: number // Value of products without sales history
  active_product_count: number // Count of products with sales history
  active_unit_count: number // Count of units with sales history
  active_cost_value: number // Cost value of products with sales history
  active_profit_potential: number // Profit potential of products with sales history
}

/**
 * Fetches all products and enriches them with sales history data
 */
export async function fetchProductsWithSalesData(): Promise<Product[]> {
  const supabase = createClient()
  const PAGE_SIZE = 1000 // Supabase's maximum limit
  let allProducts: Product[] = []
  let hasMore = true
  let page = 0

  // First, get products that have sales history
  const { data: productsWithSales, error: salesError } = await supabase.from("sale_items").select("product_id")

  if (salesError) {
    console.error("Error fetching products with sales:", salesError)
    throw salesError
  }

  // Create a Set of product IDs that have sales for quick lookup
  const productIdsWithSales = new Set(
    productsWithSales ? productsWithSales.map((item: { product_id: string }) => item.product_id) : [],
  )

  // Now fetch all products with pagination
  while (hasMore) {
    try {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories:category_id (
            id,
            name
          )
        `)
        .range(from, to)

      if (error) throw error

      if (data && data.length > 0) {
        // Process products data and add the has_sales flag
        const processedProducts = data.map((product) => ({
          ...product,
          category_name: product.categories?.name || "Uncategorized",
          has_sales: productIdsWithSales.has(product.id),
        }))

        allProducts = [...allProducts, ...processedProducts]
        page++

        // Check if we've reached the end
        hasMore = data.length === PAGE_SIZE
      } else {
        hasMore = false
      }
    } catch (error) {
      console.error("Error fetching products batch:", error)
      hasMore = false
    }
  }

  return allProducts
}

// Update the calculateStockSummary function to properly track products with sales in each category

export function calculateStockSummary(products: Product[], showOnlySoldProducts = false): StockSummary {
  // Initialize summary object
  const summary: StockSummary = {
    total_retail_value: 0,
    total_cost_value: 0,
    total_profit_potential: 0,
    total_products: products.length,
    total_units: 0,
    categories: [],
    low_stock_value: 0,
    high_stock_value: 0,
    expired_value: 0,
    expiring_soon_value: 0,
    active_inventory_value: 0,
    inactive_inventory_value: 0,
    active_product_count: 0,
    active_unit_count: 0,
    active_cost_value: 0,
    active_profit_potential: 0,
  }

  // Create a map to store category data
  const categoryMap = new Map<string, Category>()

  // First, initialize all categories with zero counts
  const uniqueCategories = new Set<string>()
  products.forEach((product) => {
    const categoryId = product.category_id || "uncategorized"
    const categoryName = product.category_name || "Uncategorized"
    uniqueCategories.add(categoryId)

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        id: categoryId,
        name: categoryName,
        product_count: 0,
        total_value: 0,
        total_cost: 0,
        has_sold_products: false,
        active_product_count: 0,
        active_total_value: 0,
        active_total_cost: 0,
      })
    }
  })

  // Process each product
  products.forEach((product) => {
    const retailValue = product.price * product.stock
    const costValue = (product.purchase_price || 0) * product.stock
    const profitPotential = retailValue - costValue

    // Add to total units
    summary.total_units += product.stock

    // Add to retail and cost values
    summary.total_retail_value += retailValue
    summary.total_cost_value += costValue
    summary.total_profit_potential += profitPotential

    // Track active (sold) vs inactive (never sold) inventory
    if (product.has_sales) {
      summary.active_inventory_value += retailValue
      summary.active_cost_value += costValue
      summary.active_profit_potential += profitPotential
      summary.active_product_count++
      summary.active_unit_count += product.stock
    } else {
      summary.inactive_inventory_value += retailValue
    }

    // Track low and high stock values
    if (product.stock <= product.min_stock && product.stock > 0) {
      summary.low_stock_value += retailValue
    } else if (product.stock > product.min_stock * 3) {
      summary.high_stock_value += retailValue
    }

    // Track expired and expiring soon values
    if (product.expiry_date) {
      const expiryDate = new Date(product.expiry_date)
      const now = new Date()
      if (expiryDate < now) {
        summary.expired_value += retailValue
      } else {
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntilExpiry <= 30) {
          summary.expiring_soon_value += retailValue
        }
      }
    }

    // Process category data
    const categoryId = product.category_id || "uncategorized"
    const category = categoryMap.get(categoryId)!

    // Always update the total counts
    category.product_count++
    category.total_value += retailValue
    category.total_cost += costValue

    // Update active counts only for products with sales
    if (product.has_sales) {
      category.has_sold_products = true
      category.active_product_count = (category.active_product_count || 0) + 1
      category.active_total_value = (category.active_total_value || 0) + retailValue
      category.active_total_cost = (category.active_total_cost || 0) + costValue
    }
  })

  // Convert category map to array and sort by total value
  summary.categories = Array.from(categoryMap.values()).sort((a, b) => b.total_value - a.total_value)

  return summary
}
