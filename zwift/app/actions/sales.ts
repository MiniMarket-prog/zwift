"use server"

import { createClient } from "@/utils/supabase/server"
import { format } from "date-fns"
import { cache } from "react"

export type SalesByDay = {
  date: string
  total: number
  count: number
}

export type SalesByPaymentMethod = {
  method: string
  total: number
  count: number
}

export type CategorySales = {
  category: string
  total: number
  count: number
}

export type TopProduct = {
  id: string
  name: string
  total_sold: number
  revenue: number
  image?: string | null
  stock?: number
  min_stock?: number
}

export type Category = {
  id: string
  name: string
}

// Add caching to prevent repeated fetches
export const getSalesTrend = cache(async (dateRange: { from: Date; to: Date }) => {
  try {
    const supabase = createClient()

    // Format dates for query
    const fromDate = format(dateRange.from, "yyyy-MM-dd")
    const toDate = format(dateRange.to, "yyyy-MM-dd 23:59:59")

    console.log(`Fetching sales trend from ${fromDate} to ${toDate}...`)

    const { data, error } = await supabase
      .from("sales")
      .select("id, created_at, total")
      .gte("created_at", fromDate)
      .lte("created_at", toDate)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching sales trend:", error)
      return []
    }

    // Group sales by day
    const salesByDayMap = new Map<string, { total: number; count: number }>()

    data.forEach((sale) => {
      const day = format(new Date(sale.created_at), "yyyy-MM-dd")
      const dayStats = salesByDayMap.get(day) || { total: 0, count: 0 }
      salesByDayMap.set(day, {
        total: dayStats.total + sale.total,
        count: dayStats.count + 1,
      })
    })

    // Convert map to array and sort by date
    const salesByDayArray = Array.from(salesByDayMap, ([date, stats]) => ({
      date,
      total: stats.total,
      count: stats.count,
    })).sort((a, b) => a.date.localeCompare(b.date))

    console.log(`Successfully fetched sales trend with ${salesByDayArray.length} data points`)
    return salesByDayArray as SalesByDay[]
  } catch (err) {
    console.error("Exception in getSalesTrend:", err)
    return []
  }
})

export const getSalesByPaymentMethod = cache(async (dateRange: { from: Date; to: Date }) => {
  try {
    const supabase = createClient()

    // Format dates for query
    const fromDate = format(dateRange.from, "yyyy-MM-dd")
    const toDate = format(dateRange.to, "yyyy-MM-dd 23:59:59")

    console.log(`Fetching sales by payment method from ${fromDate} to ${toDate}...`)

    const { data, error } = await supabase
      .from("sales")
      .select("id, payment_method, total")
      .gte("created_at", fromDate)
      .lte("created_at", toDate)

    if (error) {
      console.error("Error fetching sales by payment method:", error)
      return []
    }

    // Group sales by payment method
    const salesByMethodMap = new Map<string, { total: number; count: number }>()

    data.forEach((sale) => {
      const method = sale.payment_method || "Unknown"
      const methodStats = salesByMethodMap.get(method) || { total: 0, count: 0 }
      salesByMethodMap.set(method, {
        total: methodStats.total + sale.total,
        count: methodStats.count + 1,
      })
    })

    // Convert map to array and sort by total
    const salesByMethodArray = Array.from(salesByMethodMap, ([method, stats]) => ({
      method,
      total: stats.total,
      count: stats.count,
    })).sort((a, b) => b.total - a.total)

    console.log(`Successfully fetched sales by payment method with ${salesByMethodArray.length} methods`)
    return salesByMethodArray as SalesByPaymentMethod[]
  } catch (err) {
    console.error("Exception in getSalesByPaymentMethod:", err)
    return []
  }
})

export const getSalesByCategory = cache(async (dateRange: { from: Date; to: Date }) => {
  try {
    const supabase = createClient()

    // Format dates for query
    const fromDate = format(dateRange.from, "yyyy-MM-dd")
    const toDate = format(dateRange.to, "yyyy-MM-dd 23:59:59")

    console.log(`Fetching sales by category from ${fromDate} to ${toDate}...`)

    // First, get all sale items in the date range
    const { data: saleItems, error: saleItemsError } = await supabase
      .from("sale_items")
      .select(`
        quantity, 
        price,
        product_id,
        created_at
      `)
      .gte("created_at", fromDate)
      .lte("created_at", toDate)

    if (saleItemsError) {
      console.error("Error fetching sale items:", saleItemsError)
      return []
    }

    if (saleItems.length === 0) {
      console.log("No sale items found in the date range")
      return []
    }

    // Get all product IDs from the sale items
    const productIds = [...new Set(saleItems.map((item) => item.product_id))]

    // Get product details including category_id
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        id,
        category_id
      `)
      .in("id", productIds)

    if (productsError) {
      console.error("Error fetching products:", productsError)
      return []
    }

    // Get all category IDs
    const categoryIds = [...new Set(products.map((product) => product.category_id).filter(Boolean))]

    // Get category names
    let categories: Category[] = []
    if (categoryIds.length > 0) {
      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("id, name")
        .in("id", categoryIds)

      if (categoryError) {
        console.error("Error fetching categories:", categoryError)
      } else {
        categories = (categoryData as Category[]) || []
      }
    }

    // Create a map of category IDs to names
    const categoryMap = new Map()
    categories.forEach((category) => {
      categoryMap.set(category.id, category.name)
    })

    // Create a map of product IDs to category IDs
    const productCategoryMap = new Map()
    products.forEach((product) => {
      productCategoryMap.set(product.id, product.category_id)
    })

    // Group sales by category
    const salesByCategoryMap = new Map<string, { total: number; count: number }>()

    saleItems.forEach((item) => {
      const categoryId = productCategoryMap.get(item.product_id) || "uncategorized"
      const categoryName = categoryMap.get(categoryId) || "Uncategorized"
      const itemTotal = item.price * item.quantity

      const categoryStats = salesByCategoryMap.get(categoryName) || { total: 0, count: 0 }
      salesByCategoryMap.set(categoryName, {
        total: categoryStats.total + itemTotal,
        count: categoryStats.count + item.quantity,
      })
    })

    // Convert map to array and sort by total
    const salesByCategoryArray = Array.from(salesByCategoryMap, ([category, stats]) => ({
      category,
      total: stats.total,
      count: stats.count,
    })).sort((a, b) => b.total - a.total)

    console.log(`Successfully fetched sales by category with ${salesByCategoryArray.length} categories`)
    return salesByCategoryArray as CategorySales[]
  } catch (err) {
    console.error("Exception in getSalesByCategory:", err)
    // If there's an error, return some default categories to avoid breaking the UI
    return []
  }
})

export const getTopSellingProducts = cache(async (dateRange: { from: Date; to: Date }, limit = 5) => {
  try {
    const supabase = createClient()

    // Format dates for query
    const fromDate = format(dateRange.from, "yyyy-MM-dd")
    const toDate = format(dateRange.to, "yyyy-MM-dd 23:59:59")

    console.log(`Fetching top selling products from ${fromDate} to ${toDate}...`)

    // This query assumes you have a sales_items table that links to products
    const { data, error } = await supabase
      .from("sale_items")
      .select(`
        quantity, 
        price,
        product_id,
        products:product_id (
          id,
          name,
          image,
          stock,
          min_stock
        )
      `)
      .gte("created_at", fromDate)
      .lte("created_at", toDate)

    if (error) {
      console.error("Error fetching top selling products:", error)
      return []
    }

    // Group sales by product
    const productSalesMap = new Map<string, TopProduct>()

    data.forEach((item: any) => {
      if (!item.products || typeof item.products !== "object") return

      // Use product_id from the sales_items table
      const productId = item.product_id
      // Access properties directly from the products object
      const productName = item.products.name
      const itemTotal = item.price * item.quantity

      const existingProduct = productSalesMap.get(productId)

      productSalesMap.set(productId, {
        id: productId,
        name: productName,
        total_sold: (existingProduct?.total_sold || 0) + item.quantity,
        revenue: (existingProduct?.revenue || 0) + itemTotal,
        image: item.products.image,
        stock: item.products.stock,
        min_stock: item.products.min_stock,
      })
    })

    // Convert map to array and sort by revenue
    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)

    console.log(`Successfully fetched ${topProducts.length} top selling products`)
    return topProducts
  } catch (err) {
    console.error("Exception in getTopSellingProducts:", err)
    return []
  }
})

