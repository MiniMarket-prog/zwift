import { createClient } from "./supabase-client3"
import type { Sale, SaleItem, Product, Category } from "./types"
import { format, parseISO } from "date-fns"

export interface COGSData {
  totalCOGS: number
  totalRevenue: number
  grossProfit: number
  grossMargin: number
  salesCount: number
  itemsSold: number
  cogsByDay: Record<string, number>
  cogsByCategory: Record<string, number>
  cogsByProduct: Record<
    string,
    {
      name: string
      cost: number
      revenue: number
      profit: number
      margin: number
      quantity: number
    }
  >
  dailyData: Array<{
    date: string
    cogs: number
    revenue: number
    profit: number
    formattedDate?: string
  }>
}

export async function fetchCOGSData(from: Date, to: Date): Promise<COGSData> {
  const supabase = createClient()

  // Format dates for Supabase query
  const fromDate = from.toISOString().split("T")[0]
  const toDate = to.toISOString().split("T")[0] + " 23:59:59"

  try {
    // Implement pagination to fetch all sales data
    let allRawSalesData: any[] = []
    let hasMore = true
    let page = 0
    const PAGE_SIZE = 1000 // Supabase's maximum limit

    console.log("Fetching sales data with pagination...")

    while (hasMore) {
      const { data: pageData, error: pageError } = await supabase
        .from("sales")
        .select(`
          id,
          total,
          tax,
          payment_method,
          user_id,
          created_at,
          updated_at,
          sale_items (
            id, 
            sale_id, 
            product_id, 
            quantity, 
            price, 
            discount,
            created_at,
            products:product_id (
              id, 
              name, 
              price, 
              purchase_price, 
              category_id
            )
          )
        `)
        .gte("created_at", fromDate)
        .lte("created_at", toDate)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (pageError) {
        console.error(`Error fetching sales page ${page}:`, pageError)
        throw pageError
      }

      if (pageData && pageData.length > 0) {
        allRawSalesData = [...allRawSalesData, ...pageData]
        console.log(`Fetched ${pageData.length} sales records (page ${page + 1})`)
        page++
        hasMore = pageData.length === PAGE_SIZE
      } else {
        hasMore = false
      }
    }

    console.log(`Total sales records fetched: ${allRawSalesData.length}`)

    // Fetch categories for category names
    const { data: categoriesData, error: categoriesError } = await supabase.from("categories").select("id, name")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      throw categoriesError
    }

    // Create a map of category IDs to names
    const categoryMap = new Map<string, string>()
    categoriesData?.forEach((category: Category) => {
      categoryMap.set(category.id, category.name)
    })

    // Process sales data
    const processedSales: Sale[] = (allRawSalesData || []).map((rawSale: any) => {
      // Transform sale_items to items with product property
      const items: SaleItem[] = (rawSale.sale_items || []).map((rawItem: any) => {
        // Handle both cases: when products is an array or a single object
        let product: Product | undefined = undefined

        if (rawItem.products) {
          if (Array.isArray(rawItem.products)) {
            // If it's an array, take the first product
            product = rawItem.products[0]
          } else {
            // If it's a single object, use it directly
            product = rawItem.products
          }
        }

        return {
          id: rawItem.id,
          sale_id: rawItem.sale_id,
          product_id: rawItem.product_id,
          quantity: rawItem.quantity,
          price: rawItem.price,
          discount: rawItem.discount,
          created_at: rawItem.created_at,
          product: product,
        }
      })

      // Return the transformed sale
      return {
        id: rawSale.id,
        created_at: rawSale.created_at,
        total: rawSale.total,
        tax: rawSale.tax,
        payment_method: rawSale.payment_method,
        user_id: rawSale.user_id,
        updated_at: rawSale.updated_at,
        items: items,
      }
    })

    // Calculate COGS data
    const cogsData: COGSData = {
      totalCOGS: 0,
      totalRevenue: 0,
      grossProfit: 0,
      grossMargin: 0,
      salesCount: processedSales.length,
      itemsSold: 0,
      cogsByDay: {},
      cogsByCategory: {},
      cogsByProduct: {},
      dailyData: [],
    }

    // Process each sale
    processedSales.forEach((sale) => {
      // Add to total revenue
      cogsData.totalRevenue += sale.total

      // Get the day string for this sale
      const saleDate = new Date(sale.created_at)
      const dayStr = format(saleDate, "yyyy-MM-dd")

      // Initialize day data if not exists
      if (!cogsData.cogsByDay[dayStr]) {
        cogsData.cogsByDay[dayStr] = 0
      }

      // Process each item in the sale
      sale.items?.forEach((item) => {
        // Skip if no product or no purchase price
        if (!item.product || item.product.purchase_price === undefined || item.product.purchase_price === null) {
          return
        }

        // Calculate item cost (purchase price * quantity)
        const itemCost = item.product.purchase_price * item.quantity

        // Calculate item revenue after discount
        const discount = item.discount || 0
        const itemRevenue = item.price * item.quantity * (1 - discount / 100)

        // Calculate item profit
        const itemProfit = itemRevenue - itemCost

        // Add to total COGS
        cogsData.totalCOGS += itemCost

        // Add to items sold count
        cogsData.itemsSold += item.quantity

        // Add to COGS by day
        cogsData.cogsByDay[dayStr] = (cogsData.cogsByDay[dayStr] || 0) + itemCost

        // Add to COGS by category
        const categoryId = item.product.category_id || "uncategorized"
        const categoryName = categoryId === "uncategorized" ? "Uncategorized" : categoryMap.get(categoryId) || "Unknown"

        if (!cogsData.cogsByCategory[categoryName]) {
          cogsData.cogsByCategory[categoryName] = 0
        }
        cogsData.cogsByCategory[categoryName] += itemCost

        // Add to COGS by product
        const productId = item.product.id
        const productName = item.product.name

        if (!cogsData.cogsByProduct[productId]) {
          cogsData.cogsByProduct[productId] = {
            name: productName,
            cost: 0,
            revenue: 0,
            profit: 0,
            margin: 0,
            quantity: 0,
          }
        }

        cogsData.cogsByProduct[productId].cost += itemCost
        cogsData.cogsByProduct[productId].revenue += itemRevenue
        cogsData.cogsByProduct[productId].profit += itemProfit
        cogsData.cogsByProduct[productId].quantity += item.quantity
      })
    })

    // Calculate gross profit and margin
    cogsData.grossProfit = cogsData.totalRevenue - cogsData.totalCOGS
    cogsData.grossMargin = cogsData.totalRevenue > 0 ? (cogsData.grossProfit / cogsData.totalRevenue) * 100 : 0

    // Calculate margin for each product
    Object.keys(cogsData.cogsByProduct).forEach((productId) => {
      const product = cogsData.cogsByProduct[productId]
      product.margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0
    })

    // Convert cogsByDay to dailyData array for charts
    cogsData.dailyData = Object.entries(cogsData.cogsByDay)
      .map(([date, cogs]) => {
        // Find the corresponding revenue for this day
        let revenue = 0
        let profit = 0

        // Sum up revenue from sales on this day
        processedSales.forEach((sale) => {
          const saleDate = new Date(sale.created_at)
          const saleDayStr = format(saleDate, "yyyy-MM-dd")

          if (saleDayStr === date) {
            revenue += sale.total
          }
        })

        // Calculate profit
        profit = revenue - cogs

        return {
          date,
          cogs,
          revenue,
          profit,
          formattedDate: format(parseISO(date), "MMM dd"),
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    return cogsData
  } catch (error) {
    console.error("Error in fetchCOGSData:", error)
    throw error
  }
}
