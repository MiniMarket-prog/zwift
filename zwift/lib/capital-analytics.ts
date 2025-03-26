import { createClient } from "@/lib/supabase-client"

// Define types to avoid 'any' errors
interface Product {
  id: string
  name: string
  price: number
  stock: number
  min_stock?: number
  purchase_price?: number | null
  category_id?: string | null
  image?: string | null
  barcode?: string
}

interface Category {
  id: string
  name: string
  description?: string
}

interface Sale {
  id: string
  created_at: string
  total: number
  sale_items?: SaleItem[]
}

interface SaleItem {
  id: string
  product_id: string
  sale_id: string
  quantity: number
  price: number
  sales?: { created_at: string }
}

interface Expense {
  id: string
  created_at: string
  amount: number
}

interface TimeInterval {
  date: Date
  sales: number
  expenses: number
  profit: number
}

// Function to calculate detailed capital analytics
export async function getCapitalAnalytics() {
  const supabase = createClient()

  try {
    // Get all products with their details - remove any default limit
    const { data: products, error: productsError } = await supabase.from("products").select("*").order("name")

    // Get the total count of products
    const { count: totalProductCount, error: countError } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })

    if (productsError) throw productsError
    if (countError) throw countError

    // Get categories for grouping
    const { data: categories, error: categoriesError } = await supabase.from("categories").select("*")

    if (categoriesError) throw categoriesError

    // Get recent sales for trend analysis
    const { data: recentSales, error: salesError } = await supabase
      .from("sales")
      .select(`
        id,
        created_at,
        total,
        sale_items (
          id,
          product_id,
          quantity,
          price
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    if (salesError) throw salesError

    // Calculate capital metrics
    const totalCapital = (products as Product[]).reduce((sum, product) => {
      return sum + (product.price || 0) * (product.stock || 0)
    }, 0)

    const totalCost = (products as Product[]).reduce((sum, product) => {
      const costPrice =
        product.purchase_price !== null && product.purchase_price !== undefined
          ? product.purchase_price
          : (product.price || 0) * 0.7 // Estimate cost as 70% of selling price if not available
      return sum + costPrice * (product.stock || 0)
    }, 0)

    const estimatedProfit = totalCapital - totalCost

    // Calculate capital by category
    const capitalByCategory = (categories as Category[])
      .map((category) => {
        const categoryProducts = (products as Product[]).filter((p) => p.category_id === category.id)
        const categoryCapital = categoryProducts.reduce((sum, product) => {
          return sum + (product.price || 0) * (product.stock || 0)
        }, 0)
        const categoryCost = categoryProducts.reduce((sum, product) => {
          const costPrice =
            product.purchase_price !== null && product.purchase_price !== undefined
              ? product.purchase_price
              : (product.price || 0) * 0.7
          return sum + costPrice * (product.stock || 0)
        }, 0)

        return {
          id: category.id,
          name: category.name,
          capital: categoryCapital,
          cost: categoryCost,
          profit: categoryCapital - categoryCost,
          productCount: categoryProducts.length,
          totalStock: categoryProducts.reduce((sum, p) => sum + (p.stock || 0), 0),
        }
      })
      .sort((a, b) => b.capital - a.capital)

    // Find high-value products (top 10)
    const highValueProducts = [...(products as Product[])]
      .sort((a, b) => {
        const aValue = (a.price || 0) * (a.stock || 0)
        const bValue = (b.price || 0) * (b.stock || 0)
        return bValue - aValue
      })
      .slice(0, 10)
      .map((product) => {
        const costPrice =
          product.purchase_price !== null && product.purchase_price !== undefined
            ? product.purchase_price
            : (product.price || 0) * 0.7
        return {
          ...product,
          totalValue: (product.price || 0) * (product.stock || 0),
          totalCost: costPrice * (product.stock || 0),
          profit: (product.price || 0) * (product.stock || 0) - costPrice * (product.stock || 0),
        }
      })

    // Find slow-moving inventory (products with high stock but low sales)
    // First, calculate sales frequency for each product
    const productSalesCount: Record<string, number> = {}

    if (recentSales) {
      recentSales.forEach((sale) => {
        if (sale.sale_items) {
          sale.sale_items.forEach((item: { product_id: string; quantity: number }) => {
            productSalesCount[item.product_id] = (productSalesCount[item.product_id] || 0) + item.quantity
          })
        }
      })
    }

    const slowMovingInventory = (products as Product[])
      .filter((product) => product.stock > (product.min_stock || 0) * 2) // Filter products with stock > 2x min_stock
      .map((product) => {
        const salesCount = productSalesCount[product.id] || 0
        const salesRatio = salesCount / (product.stock || 1)
        return {
          ...product,
          salesCount,
          salesRatio,
          capitalTied: (product.price || 0) * (product.stock || 0),
        }
      })
      .sort((a, b) => a.salesRatio - b.salesRatio) // Sort by sales ratio (lowest first)
      .slice(0, 10)

    // Calculate inventory turnover metrics
    // This is a simplified calculation - ideally would use data over time
    const inventoryTurnover =
      (products as Product[]).reduce((sum, product) => {
        const salesCount = productSalesCount[product.id] || 0
        const averageInventory = product.stock || 1
        return sum + salesCount / averageInventory
      }, 0) / ((products as Product[]).length || 1)

    return {
      totalCapital,
      totalCost,
      estimatedProfit,
      profitMargin: (estimatedProfit / totalCapital) * 100,
      capitalByCategory,
      highValueProducts,
      slowMovingInventory,
      inventoryTurnover,
      totalProducts: totalProductCount || (products as Product[]).length,
      totalStock: (products as Product[]).reduce((sum, p) => sum + (p.stock || 0), 0),
    }
  } catch (error) {
    console.error("Error calculating capital analytics:", error)
    throw error
  }
}

// Function to get capital trends over time
export async function getCapitalTrends(period = "month") {
  const supabase = createClient()

  try {
    // Determine date range based on period
    const endDate = new Date()
    const startDate = new Date()
    let interval = ""

    switch (period) {
      case "week":
        startDate.setDate(endDate.getDate() - 7)
        interval = "1 day"
        break
      case "month":
        startDate.setMonth(endDate.getMonth() - 1)
        interval = "1 day"
        break
      case "quarter":
        startDate.setMonth(endDate.getMonth() - 3)
        interval = "1 week"
        break
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1)
        interval = "1 month"
        break
      default:
        startDate.setMonth(endDate.getMonth() - 1)
        interval = "1 day"
    }

    // Get sales data for the period
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("id, created_at, total")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at")

    if (salesError) throw salesError

    // Get expense data for the period
    const { data: expensesData, error: expensesError } = await supabase
      .from("expenses")
      .select("id, created_at, amount")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at")

    if (expensesError) throw expensesError

    // Group data by time intervals
    const timeIntervals: TimeInterval[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      timeIntervals.push({
        date: new Date(currentDate),
        sales: 0,
        expenses: 0,
        profit: 0,
      })

      // Increment based on interval
      if (interval === "1 day") {
        currentDate.setDate(currentDate.getDate() + 1)
      } else if (interval === "1 week") {
        currentDate.setDate(currentDate.getDate() + 7)
      } else if (interval === "1 month") {
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    }

    // Populate sales data
    if (salesData) {
      salesData.forEach((sale) => {
        // Check if created_at exists before creating a Date
        if (sale.created_at) {
          const saleDate = new Date(sale.created_at)
          const intervalIndex = timeIntervals.findIndex((interval, idx) => {
            if (idx === timeIntervals.length - 1) return true

            const nextInterval = timeIntervals[idx + 1]
            return saleDate >= interval.date && saleDate < nextInterval.date
          })

          if (intervalIndex !== -1) {
            timeIntervals[intervalIndex].sales += sale.total || 0
          }
        }
      })
    }

    // Populate expense data
    if (expensesData) {
      expensesData.forEach((expense) => {
        // Check if created_at exists before creating a Date
        if (expense.created_at) {
          const expenseDate = new Date(expense.created_at)
          const intervalIndex = timeIntervals.findIndex((interval, idx) => {
            if (idx === timeIntervals.length - 1) return true

            const nextInterval = timeIntervals[idx + 1]
            return expenseDate >= interval.date && expenseDate < nextInterval.date
          })

          if (intervalIndex !== -1) {
            timeIntervals[intervalIndex].expenses += expense.amount || 0
          }
        }
      })
    }

    // Calculate profit for each interval
    timeIntervals.forEach((interval) => {
      interval.profit = interval.sales - interval.expenses
    })

    // Get sales data with items to calculate proper profit
    const { data: salesWithItems, error: salesItemsError } = await supabase
      .from("sales")
      .select(`
        id, 
        created_at,
        total,
        sale_items (
          id,
          product_id,
          quantity,
          price,
          products (
            id, 
            name,
            purchase_price
          )
        )
      `)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at")

    if (salesItemsError) throw salesItemsError

    // Calculate actual profit based on purchase prices
    let totalProfit = 0
    if (salesWithItems) {
      salesWithItems.forEach((sale) => {
        if (sale.sale_items && sale.sale_items.length > 0) {
          let saleProfit = 0
          sale.sale_items.forEach(
            (item: { products?: { purchase_price?: number | null }; quantity: number; price: number }) => {
              if (item.products?.purchase_price !== null && item.products?.purchase_price !== undefined) {
                const itemCost = item.products.purchase_price * item.quantity
                const itemRevenue = item.price * item.quantity
                saleProfit += itemRevenue - itemCost
              }
            },
          )
          totalProfit += saleProfit
        }
      })
    }

    // If we couldn't calculate profit from purchase prices, fall back to a simple estimate
    if (totalProfit === 0) {
      // Estimate profit as 15% of sales (based on the margin shown in the reports page)
      totalProfit = (salesData ? salesData.reduce((sum, sale) => sum + (sale.total || 0), 0) : 0) * 0.15
    }

    return {
      timeIntervals,
      totalSales: salesData ? salesData.reduce((sum, sale) => sum + (sale.total || 0), 0) : 0,
      totalExpenses: expensesData ? expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0) : 0,
      totalProfit: totalProfit,
    }
  } catch (error) {
    console.error("Error calculating capital trends:", error)
    throw error
  }
}

// Function to get product profitability analysis
export async function getProductProfitability() {
  const supabase = createClient()

  try {
    // Get all products
    const { data: products, error: productsError } = await supabase.from("products").select("*")

    if (productsError) throw productsError

    // Get sales data for profitability analysis
    const { data: salesItems, error: salesError } = await supabase
      .from("sale_items")
      .select(`
        id,
        product_id,
        quantity,
        price,
        sale_id,
        sales(created_at)
      `)
      .order("sale_id", { ascending: false })
      .limit(1000)

    if (salesError) throw salesError

    // Calculate profitability metrics for each product
    const productProfitability = (products as Product[]).map((product) => {
      // Find sales for this product
      const productSales = salesItems ? (salesItems as SaleItem[]).filter((item) => item.product_id === product.id) : []

      // Calculate total quantity sold
      const quantitySold = productSales.reduce((sum, item) => sum + (item.quantity || 0), 0)

      // Calculate average selling price
      const totalRevenue = productSales.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0)
      const averageSellingPrice = quantitySold > 0 ? totalRevenue / quantitySold : product.price || 0

      // Calculate cost price
      const costPrice =
        product.purchase_price !== null && product.purchase_price !== undefined
          ? product.purchase_price
          : (product.price || 0) * 0.7

      // Calculate profit margin
      const profitMargin = ((averageSellingPrice - costPrice) / averageSellingPrice) * 100

      // Calculate inventory value
      const inventoryValue = (product.stock || 0) * (product.price || 0)

      // Calculate inventory cost
      const inventoryCost = (product.stock || 0) * costPrice

      // Calculate potential profit
      const potentialProfit = inventoryValue - inventoryCost

      return {
        id: product.id,
        name: product.name,
        stock: product.stock || 0,
        price: product.price || 0,
        costPrice,
        quantitySold,
        averageSellingPrice,
        profitMargin,
        inventoryValue,
        inventoryCost,
        potentialProfit,
        turnoverRate: quantitySold / (product.stock || 1),
      }
    })

    return {
      productProfitability: productProfitability.sort((a, b) => b.potentialProfit - a.potentialProfit),
      mostProfitable: productProfitability.sort((a, b) => b.profitMargin - a.profitMargin).slice(0, 10),
      highestTurnover: productProfitability.sort((a, b) => b.turnoverRate - a.turnoverRate).slice(0, 10),
      lowestTurnover: productProfitability.sort((a, b) => a.turnoverRate - b.turnoverRate).slice(0, 10),
    }
  } catch (error) {
    console.error("Error calculating product profitability:", error)
    throw error
  }
}

// Function to get inventory optimization recommendations
export async function getInventoryOptimizationRecommendations() {
  const supabase = createClient()

  try {
    // Get all products
    const { data: products, error: productsError } = await supabase.from("products").select("*")

    if (productsError) throw productsError

    // Get sales data for analysis
    const { data: salesItems, error: salesError } = await supabase
      .from("sale_items")
      .select(`
        id,
        product_id,
        quantity,
        price,
        sale_id,
        sales(created_at)
      `)
      .order("sale_id", { ascending: false })
      .limit(1000)

    if (salesError) throw salesError

    // Calculate recommendations
    const recommendations = (products as Product[]).map((product) => {
      // Find sales for this product
      const productSales = salesItems ? (salesItems as SaleItem[]).filter((item) => item.product_id === product.id) : []

      // Calculate total quantity sold
      const quantitySold = productSales.reduce((sum, item) => sum + (item.quantity || 0), 0)

      // Calculate sales frequency (sales per day)
      const salesDates = productSales
        .map((item) => {
          if (item.sales && item.sales.created_at) {
            return new Date(item.sales.created_at).getTime()
          }
          return 0
        })
        .filter((date) => date > 0)

      const uniqueDates = [...new Set(salesDates)].length
      const salesFrequency = uniqueDates > 0 ? quantitySold / uniqueDates : 0

      // Calculate optimal stock level based on sales frequency
      // Assuming we want to keep 14 days of inventory
      const optimalStock = Math.ceil(salesFrequency * 14)

      // Calculate if we should restock or reduce inventory
      const currentStock = product.stock || 0
      const minStock = product.min_stock || 0

      let recommendation = "maintain"
      let actionQuantity = 0

      if (currentStock < optimalStock && currentStock < minStock * 2) {
        recommendation = "restock"
        actionQuantity = optimalStock - currentStock
      } else if (currentStock > optimalStock * 1.5 && quantitySold > 0) {
        recommendation = "reduce"
        actionQuantity = currentStock - optimalStock
      }

      // Calculate capital impact
      const costPrice =
        product.purchase_price !== null && product.purchase_price !== undefined
          ? product.purchase_price
          : (product.price || 0) * 0.7

      const capitalImpact = actionQuantity * costPrice

      return {
        id: product.id,
        name: product.name,
        currentStock,
        minStock,
        optimalStock,
        salesFrequency,
        recommendation,
        actionQuantity,
        capitalImpact,
        priority: Math.abs(capitalImpact),
      }
    })

    return {
      restockRecommendations: recommendations
        .filter((r) => r.recommendation === "restock")
        .sort((a, b) => b.priority - a.priority),
      reduceRecommendations: recommendations
        .filter((r) => r.recommendation === "reduce")
        .sort((a, b) => b.priority - a.priority),
      potentialCapitalRelease: recommendations
        .filter((r) => r.recommendation === "reduce")
        .reduce((sum, r) => sum + r.capitalImpact, 0),
      requiredRestockInvestment: recommendations
        .filter((r) => r.recommendation === "restock")
        .reduce((sum, r) => sum + r.capitalImpact, 0),
    }
  } catch (error) {
    console.error("Error calculating inventory optimization recommendations:", error)
    throw error
  }
}

