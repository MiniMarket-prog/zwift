import { parseISO } from "date-fns"

// Define types based on your Supabase schema
interface Product {
  id: string
  name: string
  price: number
  purchase_price?: number // Changed from cost_price to purchase_price to match DB schema
  barcode?: string
  stock?: number // Changed from quantity to stock to match DB schema
  category_id?: string
  created_at?: string
  updated_at?: string
  expiry_date?: string
  expiry_notification_days?: number
  is_pack?: boolean
  parent_product_id?: string
  pack_quantity?: number
  pack_discount_percentage?: number
  min_stock?: number
}

interface Category {
  id: string
  name: string
  created_at?: string
  updated_at?: string
}

interface SaleItem {
  id?: string
  sale_id?: string
  product_id: string
  quantity: number
  price: number
  discount?: number
}

interface Sale {
  id: string
  total: number
  payment_method?: string
  created_at: string
  updated_at?: string
  sale_items?: SaleItem[] // Changed from items to sale_items to match Supabase structure
}

interface ProductPerformance {
  productId: string
  productName: string
  categoryId?: string
  categoryName: string
  barcode?: string
  cost: number
  price: number
  totalQuantity: number
  totalSales: number
  totalCost: number
  totalProfit: number
  profitMargin: number
  stockLevel: number
  daysInStock: number
  stockTurnover: number
}

// Update the CategoryPerformance interface to match the properties being used
export interface CategoryPerformance {
  categoryId: string
  categoryName: string
  productCount: number
  totalQuantity: number
  totalSales: number
  totalCost: number
  totalProfit: number
  profitMargin: number
}

interface OverallMetrics {
  totalSales: number
  totalCost: number
  totalProfit: number
  totalQuantity: number
  averageProfitMargin: number
  totalInventoryValue: number
  averageStockTurnover: number
}

interface AnalyticsResult {
  productPerformance: ProductPerformance[]
  categoryPerformance: CategoryPerformance[]
  overallMetrics: OverallMetrics
}

export function calculateProductMetrics(
  salesData: Sale[],
  products: Product[],
  categories: Category[],
): AnalyticsResult {
  // Initialize product performance map
  const productPerformanceMap = new Map<string, ProductPerformance>()

  // Initialize product data with all products, even those with no sales
  products.forEach((product: Product) => {
    productPerformanceMap.set(product.id, {
      productId: product.id,
      productName: product.name,
      categoryId: product.category_id,
      categoryName: getCategoryName(product.category_id, categories),
      barcode: product.barcode,
      cost: product.purchase_price || 0, // Changed from cost_price to purchase_price
      price: product.price || 0,
      totalQuantity: 0,
      totalSales: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,
      stockLevel: product.stock || 0, // Changed from quantity to stock
      daysInStock: calculateDaysInStock(product.created_at),
      stockTurnover: 0,
    })
  })

  // Process sales data
  salesData.forEach((sale: Sale) => {
    const saleDate = parseISO(sale.created_at)

    // Check if sale_items exists and is an array before processing
    const saleItems = sale.sale_items || []

    // Process each item in the sale
    saleItems.forEach((item: SaleItem) => {
      const product = products.find((p) => p.id === item.product_id)
      if (!product) return

      const quantity = item.quantity || 0
      const price = item.price || 0
      const discount = item.discount || 0
      const cost = product.purchase_price || 0 // Changed from cost_price to purchase_price

      // Calculate item-level metrics
      const itemRevenue = price * quantity * (1 - discount / 100)
      const itemCost = cost * quantity
      const itemProfit = itemRevenue - itemCost

      // Get or initialize product performance data
      const productPerf = productPerformanceMap.get(item.product_id) || {
        productId: item.product_id,
        productName: product.name,
        categoryId: product.category_id,
        categoryName: getCategoryName(product.category_id, categories),
        barcode: product.barcode,
        cost: product.purchase_price || 0, // Changed from cost_price to purchase_price
        price: product.price || 0,
        totalQuantity: 0,
        totalSales: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMargin: 0,
        stockLevel: product.stock || 0, // Changed from quantity to stock
        daysInStock: calculateDaysInStock(product.created_at),
        stockTurnover: 0,
      }

      // Update product performance metrics
      productPerf.totalQuantity += quantity
      productPerf.totalSales += itemRevenue
      productPerf.totalCost += itemCost
      productPerf.totalProfit += itemProfit

      // Save updated product performance
      productPerformanceMap.set(item.product_id, productPerf)
    })
  })

  // Calculate additional metrics and convert map to array
  const productPerformance = Array.from(productPerformanceMap.values()).map((product) => {
    // Calculate profit margin
    product.profitMargin = product.totalSales > 0 ? product.totalProfit / product.totalSales : 0

    // Calculate stock turnover
    product.stockTurnover = calculateStockTurnover(product.totalQuantity, product.stockLevel, product.daysInStock)

    return product
  })

  // Calculate category performance
  const categoryMap = new Map<string, CategoryPerformance>()

  productPerformance.forEach((product) => {
    if (!product.categoryId) return

    const categoryData = categoryMap.get(product.categoryId) || {
      categoryId: product.categoryId,
      categoryName: product.categoryName || "Uncategorized",
      productCount: 0,
      totalQuantity: 0,
      totalSales: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,
    }

    categoryData.productCount++
    categoryData.totalQuantity += product.totalQuantity
    categoryData.totalSales += product.totalSales
    categoryData.totalCost += product.totalCost
    categoryData.totalProfit += product.totalProfit

    categoryMap.set(product.categoryId, categoryData)
  })

  // Calculate category profit margins
  const categoryPerformance = Array.from(categoryMap.values()).map((category) => {
    category.profitMargin = category.totalSales > 0 ? category.totalProfit / category.totalSales : 0

    return category
  })

  // Calculate overall metrics
  const overallMetrics = {
    totalSales: productPerformance.reduce((sum: number, product) => sum + product.totalSales, 0),
    totalCost: productPerformance.reduce((sum: number, product) => sum + product.totalCost, 0),
    totalProfit: productPerformance.reduce((sum: number, product) => sum + product.totalProfit, 0),
    totalQuantity: productPerformance.reduce((sum: number, product) => sum + product.totalQuantity, 0),
    averageProfitMargin: calculateWeightedAverageProfitMargin(productPerformance),
    totalInventoryValue: calculateTotalInventoryValue(products),
    averageStockTurnover: calculateAverageStockTurnover(productPerformance),
  }

  return {
    productPerformance,
    categoryPerformance,
    overallMetrics,
  }
}

// Helper functions
function getCategoryName(categoryId: string | undefined, categories: Category[]): string {
  if (!categoryId) return "Uncategorized"
  const category = categories.find((c) => c.id === categoryId)
  return category ? category.name : "Uncategorized"
}

function calculateDaysInStock(createdAt: string | undefined): number {
  if (!createdAt) return 0
  const creationDate = parseISO(createdAt)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - creationDate.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function calculateStockTurnover(quantitySold: number, currentStock: number, daysInStock: number): number {
  if (currentStock <= 0 || daysInStock <= 0) return 0

  const annualizedSales = quantitySold * (365 / daysInStock)
  const averageInventory = (currentStock + currentStock) / 2 // Simplified; ideally should use historical data

  return annualizedSales / averageInventory
}

function calculateWeightedAverageProfitMargin(products: ProductPerformance[]): number {
  const totalSales = products.reduce((sum: number, product) => sum + product.totalSales, 0)
  if (totalSales <= 0) return 0

  const weightedSum = products.reduce((sum: number, product) => {
    const weight = product.totalSales / totalSales
    return sum + product.profitMargin * weight
  }, 0)

  return weightedSum
}

function calculateTotalInventoryValue(products: Product[]): number {
  return products.reduce((sum: number, product) => {
    const quantity = product.stock || 0 // Changed from quantity to stock
    const cost = product.purchase_price || 0 // Changed from cost_price to purchase_price
    return sum + quantity * cost
  }, 0)
}

function calculateAverageStockTurnover(products: ProductPerformance[]): number {
  const productsWithStock = products.filter((p) => p.stockLevel > 0)
  if (productsWithStock.length === 0) return 0

  const sum = productsWithStock.reduce((acc: number, p) => acc + p.stockTurnover, 0)
  return sum / productsWithStock.length
}

