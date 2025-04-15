import { createClient } from "@/lib/supabase-client"
import { format, parseISO } from "date-fns"

export interface ProductHistorySummary {
  totalSales: number
  totalQuantity: number
  totalRevenue: number
  totalProfit: number
  averagePrice: number
  bestSellingDay: string | null
  bestSellingHour: number | null
  stockTurnoverRate: number
  daysOutOfStock: number
  lastRestock: {
    date: string
    quantity: number
  } | null
}

export async function getProductHistorySummary(productId: string): Promise<ProductHistorySummary> {
  const supabase = createClient()

  // Get product details
  const { data: product } = await supabase.from("products").select("*").eq("id", productId).single()

  // Get sales data
  const { data: salesData } = await supabase
    .from("sales")
    .select(`
      id,
      created_at,
      sale_items!inner(id, product_id, quantity, price)
    `)
    .eq("sale_items.product_id", productId)

  // Get stock history
  const { data: stockHistory } = await supabase
    .from("stock_history")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })

  // Process sales data
  let totalSales = 0
  let totalQuantity = 0
  let totalRevenue = 0
  let totalProfit = 0

  // Track sales by day and hour
  const salesByDay = new Map<string, number>()
  const salesByHour = new Map<number, number>()

  salesData?.forEach((sale) => {
    const saleDate = format(parseISO(sale.created_at), "yyyy-MM-dd")
    const saleHour = parseISO(sale.created_at).getHours()

    // Get product items from this sale
    const productItems = sale.sale_items.filter((item) => item.product_id === productId)

    productItems.forEach((item) => {
      // Calculate metrics
      const quantity = item.quantity
      const revenue = item.price * quantity
      const cost = (product.purchase_price || 0) * quantity
      const profit = revenue - cost

      totalSales++
      totalQuantity += quantity
      totalRevenue += revenue
      totalProfit += profit

      // Update sales by day
      salesByDay.set(saleDate, (salesByDay.get(saleDate) || 0) + quantity)

      // Update sales by hour
      salesByHour.set(saleHour, (salesByHour.get(saleHour) || 0) + quantity)
    })
  })

  // Find best selling day and hour
  let bestSellingDay: string | null = null
  let maxDailyQuantity = 0

  salesByDay.forEach((quantity, date) => {
    if (quantity > maxDailyQuantity) {
      maxDailyQuantity = quantity
      bestSellingDay = date
    }
  })

  let bestSellingHour: number | null = null
  let maxHourlyQuantity = 0

  salesByHour.forEach((quantity, hour) => {
    if (quantity > maxHourlyQuantity) {
      maxHourlyQuantity = quantity
      bestSellingHour = hour
    }
  })

  // Calculate average price
  const averagePrice = totalQuantity > 0 ? totalRevenue / totalQuantity : product?.price || 0

  // Find last restock
  const lastRestock = stockHistory?.find(
    (entry) => entry.new_stock > entry.previous_stock && entry.change_reason?.toLowerCase().includes("restock"),
  )

  // Calculate stock turnover rate (annual)
  // Formula: Cost of Goods Sold / Average Inventory Value
  const costOfGoodsSold = totalQuantity * (product?.purchase_price || 0)
  const currentInventoryValue = (product?.stock || 0) * (product?.purchase_price || 0)
  const stockTurnoverRate = currentInventoryValue > 0 ? costOfGoodsSold / currentInventoryValue : 0

  // Calculate days out of stock
  // This would require more detailed stock history data
  // For now, we'll estimate based on current stock
  const daysOutOfStock = product?.stock === 0 ? 1 : 0

  return {
    totalSales,
    totalQuantity,
    totalRevenue,
    totalProfit,
    averagePrice,
    bestSellingDay,
    bestSellingHour,
    stockTurnoverRate,
    daysOutOfStock,
    lastRestock: lastRestock
      ? {
          date: lastRestock.created_at,
          quantity: lastRestock.new_stock - lastRestock.previous_stock,
        }
      : null,
  }
}

export async function getProductPriceHistory(productId: string) {
  const supabase = createClient()

  const { data } = await supabase
    .from("price_history")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })

  return data || []
}

export async function getProductStockHistory(productId: string) {
  const supabase = createClient()

  const { data } = await supabase
    .from("stock_history")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })

  return data || []
}
