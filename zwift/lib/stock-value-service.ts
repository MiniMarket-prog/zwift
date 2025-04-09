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

export interface Category {
  id: string
  name: string
  total_value: number
  total_cost: number
  product_count: number
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

/**
 * Calculates stock summary with separate values for active (sold) and inactive inventory
 */
export function calculateStockSummary(products: Product[]): StockSummary {
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

  // Add these counters to track active products
  let activeProductCount = 0
  let activeUnitCount = 0
  let activeCostValue = 0
  let activeRetailValue = 0

  // Category map to aggregate values
  const categoryMap = new Map<string, Category>()

  // Current date for expiry calculations
  const currentDate = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(currentDate.getDate() + 30)

  products.forEach((product) => {
    // Calculate product values
    const retailValue = product.price * product.stock
    const costValue = (product.purchase_price || 0) * product.stock
    const profitPotential = retailValue - costValue

    // Add to totals
    summary.total_retail_value += retailValue
    summary.total_cost_value += costValue
    summary.total_profit_potential += profitPotential
    summary.total_units += product.stock

    // Track active vs inactive inventory value
    if (product.has_sales) {
      summary.active_inventory_value += retailValue
      summary.active_cost_value += costValue
      summary.active_profit_potential += profitPotential
      activeProductCount++
      activeUnitCount += product.stock
      activeRetailValue += retailValue
      activeCostValue += costValue
    } else {
      summary.inactive_inventory_value += retailValue
    }

    // Check stock levels
    if (product.stock <= product.min_stock) {
      summary.low_stock_value += retailValue
    } else if (product.stock > product.min_stock * 3) {
      summary.high_stock_value += retailValue
    }

    // Check expiry
    if (product.expiry_date) {
      const expiryDate = new Date(product.expiry_date)
      if (expiryDate < currentDate) {
        summary.expired_value += retailValue
      } else if (expiryDate <= thirtyDaysFromNow) {
        summary.expiring_soon_value += retailValue
      }
    }

    // Aggregate by category
    const categoryId = product.category_id || "uncategorized"
    const categoryName = product.category_name || "Uncategorized"

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        id: categoryId,
        name: categoryName,
        total_value: 0,
        total_cost: 0,
        product_count: 0,
      })
    }

    const category = categoryMap.get(categoryId)!
    category.total_value += retailValue
    category.total_cost += costValue
    category.product_count += 1
  })

  // Add these properties to the summary
  summary.active_product_count = activeProductCount
  summary.active_unit_count = activeUnitCount

  // Convert category map to array
  summary.categories = Array.from(categoryMap.values()).sort((a, b) => b.total_value - a.total_value)

  return summary
}
