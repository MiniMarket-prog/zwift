import { streamText, convertToCoreMessages, tool } from "ai"
import { openai } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  // Check for OpenAI API key first
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY environment variable is not set")
    return NextResponse.json(
      {
        error: "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.",
        details: "Check your Vercel environment variables or .env.local file",
      },
      { status: 500 },
    )
  }

  let messages
  try {
    const body = await req.json()
    if (!body.messages || !Array.isArray(body.messages)) {
      throw new Error("Invalid or missing 'messages' in request body.")
    }

    // Convert messages to the correct format for the AI SDK
    messages = convertToCoreMessages(body.messages)
    console.log("Messages received and converted:", JSON.stringify(messages, null, 2))
  } catch (parseError: any) {
    console.error("Request parsing or validation error:", parseError)
    return NextResponse.json(
      { error: `Invalid request: ${parseError.message || "Could not parse request body."}` },
      { status: 400 },
    )
  }

  try {
    const result = await streamText({
      model: openai("gpt-4o-mini"), // Use gpt-4o-mini for better rate limits and lower cost
      messages: messages,
      maxTokens: 2000, // Limit response length to avoid rate limits
      temperature: 0.7,
      system: `You are an AI assistant for a mini-market inventory management system. You have access to real-time data about products, sales, and inventory levels through various tools.

CURRENT CONTEXT: The system is running in 2025. When users ask about "this month" or current periods, assume they mean the current month/year (2025).

Your role is to:
- Use the available tools to fetch and analyze inventory data
- Provide actionable insights based on real data from the database
- Help identify trends in sales and stock levels
- Suggest improvements for inventory management
- Answer questions about product performance with specific data
- Provide recommendations for restocking and purchasing
- Update product information when requested
- Calculate and analyze profit data for different time periods
- Analyze daily sales performance and identify best/worst performing days
- Search for specific products by name (including different languages like "cajou" for cashews)

IMPORTANT: 
- When users ask about their data, inventory, products, or sales, you MUST use the appropriate tools to fetch the actual data from their database
- When users ask about "this month", "current month", or similar, they mean the current month in 2025
- Don't give generic responses - always try to use real data
- Be efficient with tool calls - avoid making multiple similar calls simultaneously
- If asked about multiple products, try to use batch queries when possible
- When users ask to change/update product information, use the updateProduct tool
- For profit questions, use calculateProfitAnalysis with appropriate parameters
- For daily performance questions like "best day this month", use getDailySalesAnalysis
- If no data is found for a specific period, provide context with all-time data when available
- Always specify the exact date range you're analyzing in your response
- For product searches, use searchInventory tool which supports partial name matching

Available tools:
- getLowStockProducts: Get products below minimum stock
- getMostSoldProducts: Get best-selling products over a period
- getSlowMovingProducts: Get slow-moving products
- getAllProducts: Get all products summary
- getDashboardStats: Get overall business statistics
- getCategories: Get product categories
- queryProducts: Flexible product queries - search, filter, analyze
- calculateProfitAnalysis: Calculate profit metrics for products or sales (supports monthly, period-based, and product-specific analysis)
- updateProduct: Update product information including stock levels, prices, etc.
- getDailySalesAnalysis: Analyze daily sales performance to find best/worst days, daily breakdowns, and comparisons
- searchInventory: Search for products by name, category, or other criteria with detailed stock information
- checkProductStock: Quick stock check for specific products

Always be helpful, accurate, and provide specific data-driven recommendations when possible. Format your responses clearly and include relevant numbers and statistics. If no data is available for a requested period, explain this clearly and offer alternative time periods or context.`,

      tools: {
        getLowStockProducts: tool({
          description: "Get all products that are currently below their minimum stock level",
          parameters: z.object({}),
          execute: async () => {
            try {
              console.log("Executing getLowStockProducts tool...")
              const supabase = createClient()

              const { data: products, error } = await supabase
                .from("products")
                .select(`
                  id,
                  name,
                  stock,
                  min_stock,
                  price,
                  category_id,
                  categories (
                    name
                  )
                `)
                .filter("stock", "lt", "min_stock")
                .order("stock", { ascending: true })

              if (error) {
                console.error("Error in getLowStockProducts:", error)
                throw error
              }

              console.log("getLowStockProducts result:", products?.length || 0, "products")

              // Limit to top 15 most critical to reduce token usage
              const limitedProducts = (products || [])
                .sort((a, b) => a.stock / a.min_stock - b.stock / b.min_stock)
                .slice(0, 15)
                .map((product) => ({
                  id: product.id,
                  name: product.name,
                  current_stock: product.stock,
                  min_stock: product.min_stock,
                  price: product.price,
                  category: (product.categories as any)?.name || "Uncategorized",
                  stock_deficit: product.min_stock - product.stock,
                }))

              return {
                success: true,
                data: limitedProducts,
                total_count: products?.length || 0,
                showing_count: limitedProducts.length,
                message: `Found ${products?.length || 0} products below minimum stock level (showing top ${limitedProducts.length} most critical)`,
              }
            } catch (error: any) {
              console.error("Error in getLowStockProducts tool:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to fetch low stock products",
              }
            }
          },
        }),

        getMostSoldProducts: tool({
          description: "Get the most sold products over a specified period",
          parameters: z.object({
            periodDays: z.number().min(1).max(365).default(30).describe("Number of days to analyze (default: 30)"),
          }),
          execute: async ({ periodDays }) => {
            try {
              console.log(`Executing getMostSoldProducts tool with period: ${periodDays} days...`)
              const supabase = createClient()

              const startDate = new Date()
              startDate.setDate(startDate.getDate() - periodDays)

              const { data: salesData, error } = await supabase
                .from("sale_items")
                .select(`
                  quantity,
                  products (
                    id,
                    name,
                    categories (
                      name
                    )
                  ),
                  sales!inner (
                    created_at
                  )
                `)
                .gte("sales.created_at", startDate.toISOString())

              if (error) {
                console.error("Error in getMostSoldProducts:", error)
                throw error
              }

              // Aggregate sales by product
              const productSales: Record<string, any> = {}

              salesData?.forEach((item: any) => {
                const productId = item.products?.id
                const productName = item.products?.name || "Unknown Product"
                const categoryName = (item.products?.categories as any)?.name || "Uncategorized"

                if (!productSales[productId]) {
                  productSales[productId] = {
                    product_id: productId,
                    product_name: productName,
                    category_name: categoryName,
                    total_quantity_sold: 0,
                  }
                }

                productSales[productId].total_quantity_sold += item.quantity
              })

              const sortedProducts = Object.values(productSales)
                .sort((a: any, b: any) => b.total_quantity_sold - a.total_quantity_sold)
                .slice(0, 15)

              console.log("getMostSoldProducts result:", sortedProducts.length, "products")

              return {
                success: true,
                data: sortedProducts,
                total_count: sortedProducts.length,
                showing_count: sortedProducts.length,
                periodDays,
                message: `Found ${sortedProducts.length} products with sales data over the last ${periodDays} days`,
              }
            } catch (error: any) {
              console.error("Error in getMostSoldProducts tool:", error)
              return {
                success: false,
                error: error.message,
                message: `Failed to fetch most sold products for ${periodDays} days`,
              }
            }
          },
        }),

        getSlowMovingProducts: tool({
          description: "Get products that are selling slowly or not moving",
          parameters: z.object({
            periodDays: z.number().min(1).max(365).default(30).describe("Number of days to analyze (default: 30)"),
          }),
          execute: async ({ periodDays }) => {
            try {
              console.log(`Executing getSlowMovingProducts tool with period: ${periodDays} days...`)
              const supabase = createClient()

              const startDate = new Date()
              startDate.setDate(startDate.getDate() - periodDays)

              // Get all products with their sales data
              const { data: products, error } = await supabase.from("products").select(`
                  id,
                  name,
                  stock,
                  categories (
                    name
                  )
                `)

              if (error) throw error

              // Get sales data for the period
              const { data: salesData, error: salesError } = await supabase
                .from("sale_items")
                .select(`
                  product_id,
                  quantity,
                  sales!inner (
                    created_at
                  )
                `)
                .gte("sales.created_at", startDate.toISOString())

              if (salesError) throw salesError

              // Calculate sales for each product
              const productSales: Record<string, number> = {}
              salesData?.forEach((item: any) => {
                productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity
              })

              // Find slow-moving products
              const slowMovingProducts = (products || [])
                .map((product: any) => ({
                  id: product.id,
                  name: product.name,
                  category_name: (product.categories as any)?.name || "Uncategorized",
                  current_stock: product.stock,
                  total_quantity_sold_in_period: productSales[product.id] || 0,
                  avg_daily_velocity: (productSales[product.id] || 0) / periodDays,
                }))
                .filter((product: any) => product.avg_daily_velocity < 1) // Less than 1 unit per day
                .sort((a: any, b: any) => a.avg_daily_velocity - b.avg_daily_velocity)
                .slice(0, 15)

              console.log("getSlowMovingProducts result:", slowMovingProducts.length, "products")

              return {
                success: true,
                data: slowMovingProducts,
                total_count: slowMovingProducts.length,
                showing_count: slowMovingProducts.length,
                periodDays,
                message: `Found ${slowMovingProducts.length} slow-moving products over the last ${periodDays} days`,
              }
            } catch (error: any) {
              console.error("Error in getSlowMovingProducts tool:", error)
              return {
                success: false,
                error: error.message,
                message: `Failed to fetch slow-moving products for ${periodDays} days`,
              }
            }
          },
        }),

        getAllProducts: tool({
          description: "Get summary information about all products in the inventory",
          parameters: z.object({}),
          execute: async () => {
            try {
              console.log("Executing getAllProducts tool...")
              const supabase = createClient()

              const { data: products, error } = await supabase
                .from("products")
                .select("id, name, stock, min_stock, price, purchase_price")

              if (error) throw error

              console.log("getAllProducts result count:", products?.length || 0)

              // Return summary statistics instead of all products
              const totalProducts = products?.length || 0
              const inStock = products?.filter((p) => p.stock > 0).length || 0
              const outOfStock = products?.filter((p) => p.stock === 0).length || 0
              const lowStock = products?.filter((p) => p.stock < p.min_stock).length || 0
              const avgPrice = totalProducts > 0 ? products!.reduce((sum, p) => sum + p.price, 0) / totalProducts : 0
              const totalValue = products?.reduce((sum, p) => sum + p.price * p.stock, 0) || 0

              return {
                success: true,
                summary: {
                  total_products: totalProducts,
                  in_stock: inStock,
                  out_of_stock: outOfStock,
                  low_stock: lowStock,
                  average_price: Math.round(avgPrice * 100) / 100,
                  total_inventory_value: Math.round(totalValue * 100) / 100,
                },
                message: `Retrieved summary for ${totalProducts} total products`,
              }
            } catch (error: any) {
              console.error("Error in getAllProducts tool:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to fetch all products",
              }
            }
          },
        }),

        getDashboardStats: tool({
          description: "Get overall dashboard statistics including sales, expenses, and inventory metrics",
          parameters: z.object({
            fromDate: z.string().optional().describe("Start date for analysis (YYYY-MM-DD format)"),
            toDate: z.string().optional().describe("End date for analysis (YYYY-MM-DD format)"),
          }),
          execute: async ({ fromDate, toDate }) => {
            try {
              console.log(`Executing getDashboardStats tool with dates: ${fromDate} to ${toDate}...`)
              const supabase = createClient()

              let salesQuery = supabase.from("sales").select("total, created_at")
              let expensesQuery = supabase.from("expenses").select("amount, created_at")

              if (fromDate && toDate) {
                salesQuery = salesQuery.gte("created_at", fromDate).lte("created_at", toDate)
                expensesQuery = expensesQuery.gte("created_at", fromDate).lte("created_at", toDate)
              }

              const [salesResult, expensesResult, productsResult] = await Promise.all([
                salesQuery,
                expensesQuery,
                supabase.from("products").select("id, stock, min_stock"),
              ])

              if (salesResult.error) throw salesResult.error
              if (expensesResult.error) throw expensesResult.error
              if (productsResult.error) throw productsResult.error

              const totalSales = salesResult.data?.reduce((sum, sale) => sum + sale.total, 0) || 0
              const totalExpenses = expensesResult.data?.reduce((sum, expense) => sum + expense.amount, 0) || 0
              const profit = totalSales - totalExpenses
              const salesCount = salesResult.data?.length || 0
              const expensesCount = expensesResult.data?.length || 0
              const totalProducts = productsResult.data?.length || 0
              const lowStockCount = productsResult.data?.filter((p) => p.stock < p.min_stock).length || 0
              const outOfStockCount = productsResult.data?.filter((p) => p.stock === 0).length || 0

              const stats = {
                totalSales: Math.round(totalSales * 100) / 100,
                totalExpenses: Math.round(totalExpenses * 100) / 100,
                profit: Math.round(profit * 100) / 100,
                salesCount,
                expensesCount,
                totalProducts,
                lowStockCount,
                outOfStockCount,
              }

              console.log("getDashboardStats result:", stats)

              return {
                success: true,
                data: stats,
                dateRange: fromDate && toDate ? { fromDate, toDate } : "all time",
                message: `Retrieved dashboard statistics for ${fromDate && toDate ? `${fromDate} to ${toDate}` : "all time"}`,
              }
            } catch (error: any) {
              console.error("Error in getDashboardStats tool:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to fetch dashboard statistics",
              }
            }
          },
        }),

        getCategories: tool({
          description: "Get all product categories",
          parameters: z.object({}),
          execute: async () => {
            try {
              console.log("Executing getCategories tool...")
              const supabase = createClient()

              const { data: categories, error } = await supabase.from("categories").select("id, name").order("name")

              if (error) throw error

              console.log("getCategories result:", categories?.length || 0, "categories")

              const limitedCategories = (categories || []).map((cat) => ({
                id: cat.id,
                name: cat.name,
              }))

              return {
                success: true,
                data: limitedCategories,
                count: categories?.length || 0,
                message: `Retrieved ${categories?.length || 0} product categories`,
              }
            } catch (error: any) {
              console.error("Error in getCategories tool:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to fetch categories",
              }
            }
          },
        }),

        searchInventory: tool({
          description:
            "Search for products by name, category, or other criteria with detailed stock information. Perfect for finding specific products like 'cajou' (cashews).",
          parameters: z.object({
            searchTerm: z.string().optional().describe("Product name to search for (supports partial matching)"),
            category: z.string().optional().describe("Category to filter by"),
            stockStatus: z
              .enum(["all", "in_stock", "low_stock", "out_of_stock"])
              .optional()
              .describe("Stock status filter"),
            sortBy: z.enum(["name", "stock", "price", "category"]).optional().describe("Sort results by field"),
            limit: z.number().optional().describe("Maximum number of results to return (default 20)"),
          }),
          execute: async ({ searchTerm, category, stockStatus = "all", sortBy = "name", limit = 20 }) => {
            try {
              console.log(`Executing searchInventory tool with searchTerm: ${searchTerm}...`)
              const supabase = createClient()

              let query = supabase.from("products").select(`
                  id,
                  name,
                  stock,
                  min_stock,
                  price,
                  purchase_price,
                  barcode,
                  category_id,
                  categories (
                    name
                  )
                `)

              // Apply search term filter
              if (searchTerm) {
                query = query.ilike("name", `%${searchTerm}%`)
              }

              // Apply category filter
              if (category) {
                const { data: categoryData } = await supabase
                  .from("categories")
                  .select("id")
                  .ilike("name", `%${category}%`)
                  .single()

                if (categoryData) {
                  query = query.eq("category_id", categoryData.id)
                }
              }

              // Apply sorting
              switch (sortBy) {
                case "stock":
                  query = query.order("stock", { ascending: false })
                  break
                case "price":
                  query = query.order("price", { ascending: false })
                  break
                case "category":
                  query = query.order("category_id")
                  break
                default:
                  query = query.order("name")
              }

              // Apply limit
              query = query.limit(limit)

              const { data: products, error } = await query

              if (error) {
                console.error("Error searching inventory:", error)
                throw error
              }

              if (!products || products.length === 0) {
                return {
                  success: true,
                  message: `No products found matching your search criteria${searchTerm ? ` for "${searchTerm}"` : ""}`,
                  products: [],
                  filters_applied: { searchTerm, category, stockStatus, sortBy },
                }
              }

              // Format and filter results
              let formattedProducts = products.map((product: any) => {
                const categoryName = (product.categories as any)?.name || "Uncategorized"
                const profitMargin =
                  product.purchase_price && product.price
                    ? (((product.price - product.purchase_price) / product.price) * 100).toFixed(1)
                    : null

                const stockStatusValue =
                  product.stock > product.min_stock ? "in_stock" : product.stock > 0 ? "low_stock" : "out_of_stock"

                return {
                  id: product.id,
                  name: product.name,
                  current_stock: product.stock,
                  min_stock: product.min_stock,
                  stock_status: stockStatusValue,
                  stock_status_text:
                    product.stock > product.min_stock ? "In Stock" : product.stock > 0 ? "Low Stock" : "Out of Stock",
                  price: product.price,
                  purchase_price: product.purchase_price,
                  profit_margin: profitMargin ? `${profitMargin}%` : "N/A",
                  category: categoryName,
                  barcode: product.barcode,
                  needs_restock: product.stock <= product.min_stock,
                  stock_value: Math.round(product.price * product.stock * 100) / 100,
                }
              })

              // Apply stock status filter
              if (stockStatus !== "all") {
                formattedProducts = formattedProducts.filter((product) => product.stock_status === stockStatus)
              }

              // Calculate summary statistics
              const totalProducts = formattedProducts.length
              const inStockCount = formattedProducts.filter((p) => p.stock_status === "in_stock").length
              const lowStockCount = formattedProducts.filter((p) => p.stock_status === "low_stock").length
              const outOfStockCount = formattedProducts.filter((p) => p.stock_status === "out_of_stock").length
              const totalStockValue = formattedProducts.reduce((sum, p) => sum + p.stock_value, 0)

              return {
                success: true,
                message: `Found ${totalProducts} product(s)${searchTerm ? ` matching "${searchTerm}"` : ""}`,
                products: formattedProducts,
                summary: {
                  total_products: totalProducts,
                  in_stock: inStockCount,
                  low_stock: lowStockCount,
                  out_of_stock: outOfStockCount,
                  total_stock_value: Math.round(totalStockValue * 100) / 100,
                },
                filters_applied: { searchTerm, category, stockStatus, sortBy, limit },
              }
            } catch (error: any) {
              console.error("Error in searchInventory:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to search inventory",
                products: [],
              }
            }
          },
        }),

        checkProductStock: tool({
          description:
            "Quick stock check for a specific product by name. Perfect for simple questions like 'Do we have cajou in stock?'",
          parameters: z.object({
            productName: z.string().describe("The name of the product to check (supports partial matching)"),
          }),
          execute: async ({ productName }) => {
            try {
              console.log(`Executing checkProductStock tool for: ${productName}...`)
              const supabase = createClient()

              const { data: products, error } = await supabase
                .from("products")
                .select(`
                  id,
                  name,
                  stock,
                  min_stock,
                  price,
                  categories (
                    name
                  )
                `)
                .ilike("name", `%${productName}%`)
                .limit(5)

              if (error) {
                console.error("Error fetching product stock:", error)
                throw error
              }

              if (!products || products.length === 0) {
                return {
                  success: true,
                  message: `Product "${productName}" not found in inventory.`,
                  found: false,
                  products: [],
                }
              }

              const formattedProducts = products.map((product: any) => ({
                name: product.name,
                current_stock: product.stock,
                min_stock: product.min_stock,
                price: product.price,
                category: (product.categories as any)?.name || "Uncategorized",
                status:
                  product.stock > product.min_stock ? "In Stock" : product.stock > 0 ? "Low Stock" : "Out of Stock",
                needs_restock: product.stock <= product.min_stock,
              }))

              const stockInfo = formattedProducts
                .map((p) => `${p.name}: ${p.current_stock} units (${p.status})`)
                .join(", ")

              return {
                success: true,
                message: `Found ${products.length} product(s) matching "${productName}": ${stockInfo}`,
                found: true,
                products: formattedProducts,
              }
            } catch (error: any) {
              console.error("Error in checkProductStock:", error)
              return {
                success: false,
                error: error.message,
                message: `Failed to check stock for "${productName}"`,
                found: false,
                products: [],
              }
            }
          },
        }),

        queryProducts: tool({
          description: "Flexible product queries - search, filter, and analyze products based on various criteria",
          parameters: z.object({
            query_type: z
              .enum([
                "missing_images",
                "missing_barcodes",
                "missing_purchase_prices",
                "expiring_soon",
                "high_profit_margin",
                "low_profit_margin",
                "by_category",
                "price_range",
                "stock_analysis",
                "search",
              ])
              .describe("Type of query to perform"),
            category: z.string().optional().describe("Filter by category name"),
            min_price: z.number().optional().describe("Minimum price filter"),
            max_price: z.number().optional().describe("Maximum price filter"),
            min_stock: z.number().optional().describe("Minimum stock filter"),
            max_stock: z.number().optional().describe("Maximum stock filter"),
            search_term: z.string().optional().describe("Search term for product names"),
            days_threshold: z.number().optional().describe("Days threshold for expiry analysis"),
            limit: z.number().min(1).max(50).default(20).describe("Maximum number of results to return (max 50)"),
          }),
          execute: async ({
            query_type,
            category,
            min_price,
            max_price,
            min_stock,
            max_stock,
            search_term,
            days_threshold,
            limit,
          }) => {
            try {
              console.log(`Executing queryProducts tool with type: ${query_type}...`)
              const supabase = createClient()

              let query = supabase.from("products").select(`
                  *,
                  categories (
                    name
                  )
                `)

              // Apply filters based on query type
              switch (query_type) {
                case "missing_images":
                  query = query.or("image.is.null,image.eq.")
                  break

                case "missing_barcodes":
                  query = query.or("barcode.is.null,barcode.eq.")
                  break

                case "missing_purchase_prices":
                  query = query.is("purchase_price", null)
                  break

                case "expiring_soon":
                  const thresholdDate = new Date()
                  thresholdDate.setDate(thresholdDate.getDate() + (days_threshold || 30))
                  query = query.not("expiry_date", "is", null).lte("expiry_date", thresholdDate.toISOString())
                  break

                case "by_category":
                  if (category) {
                    // We'll filter by category after getting the data since we need to join
                  }
                  break

                case "price_range":
                  if (min_price !== undefined) query = query.gte("price", min_price)
                  if (max_price !== undefined) query = query.lte("price", max_price)
                  break

                case "stock_analysis":
                  if (min_stock !== undefined) query = query.gte("stock", min_stock)
                  if (max_stock !== undefined) query = query.lte("stock", max_stock)
                  break

                case "search":
                  if (search_term) {
                    query = query.ilike("name", `%${search_term}%`)
                  }
                  break
              }

              const { data: products, error } = await query.limit(limit)

              if (error) {
                console.error("Error in queryProducts:", error)
                throw error
              }

              if (!products) {
                return {
                  success: false,
                  message: "No products found",
                }
              }

              // Post-process results based on query type
              let processedProducts = products

              // Filter by category if specified
              if (category) {
                processedProducts = products.filter(
                  (product: any) =>
                    (product.categories as any)?.name?.toLowerCase().includes(category.toLowerCase()) ||
                    product.category_id === category,
                )
              }

              // Calculate additional metrics for specific query types
              let analysisResults: any = {}

              switch (query_type) {
                case "missing_images":
                  const { count: totalCount } = await supabase
                    .from("products")
                    .select("*", { count: "exact", head: true })
                  analysisResults = {
                    total_products: totalCount || 0,
                    missing_images: processedProducts.length,
                    percentage_missing: totalCount
                      ? ((processedProducts.length / totalCount) * 100).toFixed(2) + "%"
                      : "0%",
                  }
                  break

                case "high_profit_margin":
                case "low_profit_margin":
                  processedProducts = processedProducts
                    .filter((p: any) => p.purchase_price && p.price > p.purchase_price)
                    .map((p: any) => ({
                      ...p,
                      profit_margin: (((p.price - p.purchase_price) / p.price) * 100).toFixed(2),
                    }))
                    .sort((a: any, b: any) =>
                      query_type === "high_profit_margin"
                        ? b.profit_margin - a.profit_margin
                        : a.profit_margin - b.profit_margin,
                    )
                  break

                case "stock_analysis":
                  const stockStats = {
                    total_products: processedProducts.length,
                    total_stock_value: processedProducts.reduce((sum: number, p: any) => sum + p.price * p.stock, 0),
                    avg_stock_level:
                      processedProducts.length > 0
                        ? processedProducts.reduce((sum: number, p: any) => sum + p.stock, 0) / processedProducts.length
                        : 0,
                    out_of_stock: processedProducts.filter((p: any) => p.stock === 0).length,
                    low_stock: processedProducts.filter((p: any) => p.stock < p.min_stock).length,
                  }
                  analysisResults = stockStats
                  break
              }

              // Format the response data (reduced fields to save tokens)
              const formattedProducts = processedProducts.slice(0, limit).map((product: any) => ({
                id: product.id,
                name: product.name,
                price: product.price,
                purchase_price: product.purchase_price,
                profit_margin: product.purchase_price
                  ? (((product.price - product.purchase_price) / product.price) * 100).toFixed(2) + "%"
                  : "N/A",
                stock: product.stock,
                category: (product.categories as any)?.name || "Uncategorized",
                image_status: product.image ? "Has Image" : "Missing Image",
                barcode_status: product.barcode ? "Has Barcode" : "Missing Barcode",
              }))

              return {
                success: true,
                query_type,
                data: formattedProducts,
                analysis: analysisResults,
                total_found: processedProducts.length,
                showing: Math.min(limit, processedProducts.length),
                message: `Found ${processedProducts.length} products matching query type: ${query_type}`,
              }
            } catch (error: any) {
              console.error("Error in queryProducts tool:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to execute product query",
              }
            }
          },
        }),

        calculateProfitAnalysis: tool({
          description:
            "Calculate profit analysis for the business - total profit, profit by period, or profit by product",
          parameters: z.object({
            analysis_type: z
              .enum(["total_profit", "profit_by_period", "profit_by_product", "monthly_profit"])
              .describe("Type of profit analysis to perform"),
            period_days: z.number().min(1).max(365).default(30).describe("Number of days to analyze (default: 30)"),
            product_names: z
              .array(z.string())
              .optional()
              .describe("Specific product names to analyze (for profit_by_product)"),
            month: z.number().min(1).max(12).optional().describe("Specific month to analyze (1-12)"),
            year: z.number().optional().describe("Specific year to analyze (defaults to current year)"),
          }),
          execute: async ({ analysis_type, period_days, product_names, month, year }) => {
            try {
              console.log(`Executing calculateProfitAnalysis tool with type: ${analysis_type}...`)
              const supabase = createClient()

              let startDate: Date
              let endDate: Date

              // Handle different date ranges based on analysis type
              if (analysis_type === "monthly_profit" && month) {
                const currentYear = year || new Date().getFullYear()
                startDate = new Date(currentYear, month - 1, 1) // month - 1 because JS months are 0-indexed
                endDate = new Date(currentYear, month, 0, 23, 59, 59) // Last day of the month
              } else if (analysis_type === "monthly_profit") {
                // Current month if no specific month provided
                const now = new Date()
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
              } else {
                // Default period-based analysis
                endDate = new Date()
                startDate = new Date()
                startDate.setDate(startDate.getDate() - period_days)
              }

              console.log(`Analyzing period: ${startDate.toISOString()} to ${endDate.toISOString()}`)

              // Get sales data with product information
              const { data: salesData, error: salesError } = await supabase
                .from("sales")
                .select(`
          id,
          total,
          created_at,
          sale_items (
            product_id,
            quantity,
            price,
            products (
              name,
              purchase_price
            )
          )
        `)
                .gte("created_at", startDate.toISOString())
                .lte("created_at", endDate.toISOString())

              if (salesError) {
                console.error("Error fetching sales data for profit analysis:", salesError)
                throw salesError
              }

              console.log(`Found ${salesData?.length || 0} sales in the specified period`)

              // If no sales in the specified period, try to get all-time data for context
              let allTimeSales = null
              if (!salesData || salesData.length === 0) {
                console.log("No sales found in specified period, fetching all-time data...")
                const { data: allTimeData, error: allTimeError } = await supabase
                  .from("sales")
                  .select(`
            id,
            total,
            created_at,
            sale_items (
              product_id,
              quantity,
              price,
              products (
                name,
                purchase_price
              )
            )
          `)
                  .order("created_at", { ascending: false })
                  .limit(100) // Get last 100 sales for context

                if (!allTimeError && allTimeData && allTimeData.length > 0) {
                  allTimeSales = allTimeData
                }
              }

              let analysisResult: any = {}

              // Calculate profit for the specified period
              let totalRevenue = 0
              let totalCost = 0
              let totalProfit = 0
              let salesCount = 0

              const dataToAnalyze = salesData || []

              dataToAnalyze.forEach((sale) => {
                salesCount++
                sale.sale_items?.forEach((item: any) => {
                  const revenue = item.quantity * item.price
                  const cost = item.quantity * (item.products?.purchase_price || 0)
                  totalRevenue += revenue
                  totalCost += cost
                  totalProfit += revenue - cost
                })
              })

              // Calculate all-time context if no data in period
              let allTimeContext = null
              if (allTimeSales && allTimeSales.length > 0) {
                let allTimeRevenue = 0
                let allTimeCost = 0
                let allTimeProfit = 0

                allTimeSales.forEach((sale) => {
                  sale.sale_items?.forEach((item: any) => {
                    const revenue = item.quantity * item.price
                    const cost = item.quantity * (item.products?.purchase_price || 0)
                    allTimeRevenue += revenue
                    allTimeCost += cost
                    allTimeProfit += revenue - cost
                  })
                })

                allTimeContext = {
                  total_sales: allTimeSales.length,
                  total_revenue: Math.round(allTimeRevenue * 100) / 100,
                  total_cost: Math.round(allTimeCost * 100) / 100,
                  total_profit: Math.round(allTimeProfit * 100) / 100,
                  profit_margin: allTimeRevenue > 0 ? ((allTimeProfit / allTimeRevenue) * 100).toFixed(2) + "%" : "0%",
                  latest_sale_date: allTimeSales[0]?.created_at,
                  oldest_sale_date: allTimeSales[allTimeSales.length - 1]?.created_at,
                }
              }

              const periodName =
                analysis_type === "monthly_profit"
                  ? `${month ? new Date(0, month - 1).toLocaleString("default", { month: "long" }) : "current month"} ${year || new Date().getFullYear()}`
                  : `last ${period_days} days`

              analysisResult = {
                period: periodName,
                period_start: startDate.toISOString().split("T")[0],
                period_end: endDate.toISOString().split("T")[0],
                sales_count: salesCount,
                total_revenue: Math.round(totalRevenue * 100) / 100,
                total_cost: Math.round(totalCost * 100) / 100,
                total_profit: Math.round(totalProfit * 100) / 100,
                profit_margin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) + "%" : "0%",
                has_data: salesCount > 0,
                all_time_context: allTimeContext,
              }

              // Add product-level analysis if requested
              if (analysis_type === "profit_by_product" && dataToAnalyze.length > 0) {
                const productProfits: Record<string, any> = {}

                dataToAnalyze.forEach((sale) => {
                  sale.sale_items?.forEach((item: any) => {
                    const productName = item.products?.name || "Unknown Product"

                    // Filter by specific product names if provided
                    if (product_names && product_names.length > 0) {
                      const matchesFilter = product_names.some((name: string) =>
                        productName.toLowerCase().includes(name.toLowerCase()),
                      )
                      if (!matchesFilter) return
                    }

                    if (!productProfits[productName]) {
                      productProfits[productName] = {
                        product_name: productName,
                        total_quantity_sold: 0,
                        total_revenue: 0,
                        total_cost: 0,
                        total_profit: 0,
                        sales_count: 0,
                      }
                    }

                    const revenue = item.quantity * item.price
                    const cost = item.quantity * (item.products?.purchase_price || 0)

                    productProfits[productName].total_quantity_sold += item.quantity
                    productProfits[productName].total_revenue += revenue
                    productProfits[productName].total_cost += cost
                    productProfits[productName].total_profit += revenue - cost
                    productProfits[productName].sales_count += 1
                  })
                })

                // Convert to array and sort by profit
                const sortedProductProfits = Object.values(productProfits)
                  .map((product: any) => ({
                    ...product,
                    total_revenue: Math.round(product.total_revenue * 100) / 100,
                    total_cost: Math.round(product.total_cost * 100) / 100,
                    total_profit: Math.round(product.total_profit * 100) / 100,
                    profit_margin:
                      product.total_revenue > 0
                        ? ((product.total_profit / product.total_revenue) * 100).toFixed(2) + "%"
                        : "0%",
                  }))
                  .sort((a: any, b: any) => b.total_profit - a.total_profit)
                  .slice(0, 15) // Limit to top 15 to save tokens

                analysisResult.products = sortedProductProfits
                analysisResult.total_products_analyzed = sortedProductProfits.length
              }

              return {
                success: true,
                analysis_type,
                data: analysisResult,
                message:
                  salesCount > 0
                    ? `Found ${salesCount} sales in ${periodName} with total profit of ${analysisResult.total_profit}`
                    : `No sales found in ${periodName}. ${allTimeContext ? `All-time data shows ${allTimeContext.total_sales} total sales.` : "No sales data available."}`,
              }
            } catch (error: any) {
              console.error("Error in calculateProfitAnalysis tool:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to calculate profit analysis",
              }
            }
          },
        }),

        updateProduct: tool({
          description: "Update product information including stock levels, prices, name, category, etc.",
          parameters: z.object({
            product_name: z.string().describe("Name of the product to update"),
            updates: z
              .object({
                stock: z.number().optional().describe("New stock level"),
                price: z.number().optional().describe("New selling price"),
                purchase_price: z.number().optional().describe("New purchase price"),
                min_stock: z.number().optional().describe("New minimum stock level"),
                name: z.string().optional().describe("New product name"),
                barcode: z.string().optional().describe("New barcode"),
                image: z.string().optional().describe("New image URL"),
                category_id: z.string().optional().describe("New category ID"),
              })
              .describe("Object containing the fields to update"),
          }),
          execute: async ({ product_name, updates }) => {
            try {
              console.log(`Executing updateProduct tool for: ${product_name}...`)
              console.log("Updates to apply:", updates)

              const supabase = createClient()

              // First, find the product by name
              const { data: products, error: searchError } = await supabase
                .from("products")
                .select("*")
                .ilike("name", `%${product_name}%`)

              if (searchError) {
                console.error("Error searching for product:", searchError)
                throw searchError
              }

              if (!products || products.length === 0) {
                return {
                  success: false,
                  message: `No product found with name containing "${product_name}"`,
                }
              }

              // If multiple products found, use the first exact match or the first result
              const targetProduct =
                products.find((p: any) => p.name.toLowerCase() === product_name.toLowerCase()) || products[0]

              console.log(`Found product: ${targetProduct.name} (ID: ${targetProduct.id})`)

              // Prepare the update object
              const updateData: any = {}

              if (updates.stock !== undefined) updateData.stock = updates.stock
              if (updates.price !== undefined) updateData.price = updates.price
              if (updates.purchase_price !== undefined) updateData.purchase_price = updates.purchase_price
              if (updates.min_stock !== undefined) updateData.min_stock = updates.min_stock
              if (updates.name !== undefined) updateData.name = updates.name
              if (updates.barcode !== undefined) updateData.barcode = updates.barcode
              if (updates.image !== undefined) updateData.image = updates.image
              if (updates.category_id !== undefined) updateData.category_id = updates.category_id

              console.log("Applying updates:", updateData)

              // Update the product
              const { data: updatedProduct, error: updateError } = await supabase
                .from("products")
                .update(updateData)
                .eq("id", targetProduct.id)
                .select()
                .single()

              if (updateError) {
                console.error("Error updating product:", updateError)
                throw updateError
              }

              console.log("Product updated successfully:", updatedProduct)

              // Format the response
              const changes = Object.keys(updateData)
                .map((key) => {
                  const oldValue = targetProduct[key]
                  const newValue = updateData[key]
                  return `${key}: ${oldValue} → ${newValue}`
                })
                .join(", ")

              return {
                success: true,
                data: {
                  product_id: updatedProduct.id,
                  product_name: updatedProduct.name,
                  changes_made: changes,
                  updated_fields: Object.keys(updateData),
                  old_values: Object.keys(updateData).reduce((acc: any, key) => {
                    acc[key] = targetProduct[key]
                    return acc
                  }, {}),
                  new_values: updateData,
                },
                message: `Successfully updated ${targetProduct.name}. Changes: ${changes}`,
              }
            } catch (error: any) {
              console.error("Error in updateProduct tool:", error)
              return {
                success: false,
                error: error.message,
                message: `Failed to update product "${product_name}": ${error.message}`,
              }
            }
          },
        }),

        getDailySalesAnalysis: tool({
          description: "Get detailed daily sales analysis to find best/worst performing days",
          parameters: z.object({
            analysis_type: z
              .enum(["best_day", "worst_day", "daily_breakdown", "day_comparison"])
              .describe("Type of daily analysis to perform"),
            period_days: z.number().min(1).max(365).default(30).describe("Number of days to analyze (default: 30)"),
            month: z.number().min(1).max(12).optional().describe("Specific month to analyze (1-12)"),
            year: z.number().optional().describe("Specific year to analyze (defaults to current year)"),
            metric: z
              .enum(["revenue", "profit", "transactions", "items_sold"])
              .default("revenue")
              .describe("Metric to use for ranking days"),
          }),
          execute: async ({ analysis_type, period_days, month, year, metric }) => {
            try {
              console.log(`Executing getDailySalesAnalysis tool with type: ${analysis_type}...`)
              const supabase = createClient()

              let startDate: Date
              let endDate: Date

              // Handle different date ranges - FIXED VERSION
              if (month && year) {
                // Specific month and year provided
                startDate = new Date(year, month - 1, 1)
                endDate = new Date(year, month, 0, 23, 59, 59)
                console.log(`Using specified month/year: ${year}-${month}`)
              } else if (month) {
                // Only month provided, use current year
                const currentYear = new Date().getFullYear()
                startDate = new Date(currentYear, month - 1, 1)
                endDate = new Date(currentYear, month, 0, 23, 59, 59)
                console.log(`Using month ${month} with current year: ${currentYear}`)
              } else {
                // No specific month - use current month of current year
                const now = new Date()
                const currentYear = now.getFullYear()
                const currentMonth = now.getMonth() // 0-indexed
                startDate = new Date(currentYear, currentMonth, 1)
                endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
                console.log(
                  `Using current month: ${currentYear}-${currentMonth + 1} (${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })})`,
                )
              }

              console.log(`Final date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)

              let salesData

              const { data, error: salesError } = await supabase
                .from("sales")
                .select(`
                  id,
                  total,
                  created_at,
                  payment_method,
                  sale_items (
                    product_id,
                    quantity,
                    price,
                    discount,
                    products (
                      name,
                      purchase_price
                    )
                  )
                `)
                .gte("created_at", startDate.toISOString())
                .lte("created_at", endDate.toISOString())
                .order("created_at", { ascending: true })

              if (salesError) {
                console.error("Error fetching sales data:", salesError)
                throw salesError
              }

              salesData = data

              if (!salesData || salesData.length === 0) {
                console.log("No sales data found for current month, trying last 30 days...")

                // Try last 30 days as fallback
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

                const { data: fallbackData, error: fallbackError } = await supabase
                  .from("sales")
                  .select(`
                    id,
                    total,
                    created_at,
                    payment_method,
                    sale_items (
                      product_id,
                      quantity,
                      price,
                      discount,
                      products (
                        name,
                        purchase_price
                      )
                    )
                  `)
                  .gte("created_at", thirtyDaysAgo.toISOString())
                  .order("created_at", { ascending: true })

                if (!fallbackError && fallbackData && fallbackData.length > 0) {
                  console.log(`Found ${fallbackData.length} sales in last 30 days`)
                  salesData = fallbackData
                  startDate = thirtyDaysAgo
                  endDate = new Date()
                }
              }

              if (!salesData || salesData.length === 0) {
                return {
                  success: false,
                  message: `No sales data found for the specified period or last 30 days`,
                  period: {
                    start: startDate.toISOString().split("T")[0],
                    end: endDate.toISOString().split("T")[0],
                  },
                  suggestion: "Try asking for a specific month/year or check if there are any sales in the system",
                }
              }

              // Process daily data
              const dailyStats: Record<
                string,
                {
                  date: string
                  revenue: number
                  profit: number
                  transactions: number
                  items_sold: number
                  payment_methods: Record<string, number>
                  top_products: Record<string, { name: string; quantity: number; revenue: number }>
                }
              > = {}

              salesData.forEach((sale) => {
                const saleDate = new Date(sale.created_at)
                const dateKey = saleDate.toISOString().split("T")[0] // YYYY-MM-DD format
                const dayName = saleDate.toLocaleDateString("en-US", { weekday: "long" })
                const displayDate = `${dayName}, ${saleDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}`

                if (!dailyStats[dateKey]) {
                  dailyStats[dateKey] = {
                    date: displayDate,
                    revenue: 0,
                    profit: 0,
                    transactions: 0,
                    items_sold: 0,
                    payment_methods: {},
                    top_products: {},
                  }
                }

                const dayData = dailyStats[dateKey]
                dayData.revenue += sale.total
                dayData.transactions += 1

                // Track payment methods
                dayData.payment_methods[sale.payment_method] = (dayData.payment_methods[sale.payment_method] || 0) + 1

                // Process sale items
                if (sale.sale_items && sale.sale_items.length > 0) {
                  sale.sale_items.forEach((item: any) => {
                    dayData.items_sold += item.quantity

                    // Calculate profit
                    const purchasePrice = item.products?.purchase_price || 0
                    const discount = item.discount || 0
                    const priceAfterDiscount = item.price * (1 - discount / 100)
                    const itemRevenue = priceAfterDiscount * item.quantity
                    const itemCost = purchasePrice * item.quantity
                    const itemProfit = itemRevenue - itemCost
                    dayData.profit += itemProfit

                    // Track top products
                    const productName = item.products?.name || "Unknown Product"
                    if (!dayData.top_products[productName]) {
                      dayData.top_products[productName] = {
                        name: productName,
                        quantity: 0,
                        revenue: 0,
                      }
                    }
                    dayData.top_products[productName].quantity += item.quantity
                    dayData.top_products[productName].revenue += itemRevenue
                  })
                }
              })

              // Convert to array and sort by the specified metric
              const dailyArray = Object.entries(dailyStats).map(([dateKey, stats]) => ({
                date_key: dateKey,
                date_display: stats.date,
                revenue: Math.round(stats.revenue * 100) / 100,
                profit: Math.round(stats.profit * 100) / 100,
                transactions: stats.transactions,
                items_sold: stats.items_sold,
                avg_transaction_value:
                  stats.transactions > 0 ? Math.round((stats.revenue / stats.transactions) * 100) / 100 : 0,
                profit_margin: stats.revenue > 0 ? ((stats.profit / stats.revenue) * 100).toFixed(2) + "%" : "0%",
                payment_methods: stats.payment_methods,
                top_products: Object.values(stats.top_products)
                  .sort((a, b) => b.revenue - a.revenue)
                  .slice(0, 3),
              }))

              // Sort by the specified metric
              const sortedDays = dailyArray.sort((a, b) => {
                switch (metric) {
                  case "revenue":
                    return b.revenue - a.revenue
                  case "profit":
                    return b.profit - a.profit
                  case "transactions":
                    return b.transactions - a.transactions
                  case "items_sold":
                    return b.items_sold - a.items_sold
                  default:
                    return b.revenue - a.revenue
                }
              })

              const result: any = {
                period: {
                  start: startDate.toISOString().split("T")[0],
                  end: endDate.toISOString().split("T")[0],
                  total_days: sortedDays.length,
                },
                metric_used: metric,
                total_summary: {
                  total_revenue: sortedDays.reduce((sum, day) => sum + day.revenue, 0),
                  total_profit: sortedDays.reduce((sum, day) => sum + day.profit, 0),
                  total_transactions: sortedDays.reduce((sum, day) => sum + day.transactions, 0),
                  total_items_sold: sortedDays.reduce((sum, day) => sum + day.items_sold, 0),
                  avg_daily_revenue:
                    sortedDays.length > 0
                      ? Math.round((sortedDays.reduce((sum, day) => sum + day.revenue, 0) / sortedDays.length) * 100) /
                        100
                      : 0,
                },
              }

              switch (analysis_type) {
                case "best_day":
                  result.best_day = sortedDays[0]
                  result.message = `Best performing day by ${metric}: ${sortedDays[0]?.date_display} with ${
                    metric === "revenue"
                      ? `$${sortedDays[0]?.revenue}`
                      : metric === "profit"
                        ? `$${sortedDays[0]?.profit} profit`
                        : metric === "transactions"
                          ? `${sortedDays[0]?.transactions} transactions`
                          : `${sortedDays[0]?.items_sold} items sold`
                  }`
                  break

                case "worst_day":
                  result.worst_day = sortedDays[sortedDays.length - 1]
                  result.message = `Worst performing day by ${metric}: ${sortedDays[sortedDays.length - 1]?.date_display}`
                  break

                case "daily_breakdown":
                  result.daily_breakdown = sortedDays.slice(0, 10) // Top 10 days
                  result.message = `Daily breakdown for ${sortedDays.length} days, showing top 10 by ${metric}`
                  break

                case "day_comparison":
                  result.best_day = sortedDays[0]
                  result.worst_day = sortedDays[sortedDays.length - 1]
                  result.median_day = sortedDays[Math.floor(sortedDays.length / 2)]
                  result.comparison = {
                    best_vs_worst_difference:
                      sortedDays[0] && sortedDays[sortedDays.length - 1]
                        ? (() => {
                            const bestValue =
                              metric === "revenue"
                                ? sortedDays[0].revenue
                                : metric === "profit"
                                  ? sortedDays[0].profit
                                  : metric === "transactions"
                                    ? sortedDays[0].transactions
                                    : sortedDays[0].items_sold
                            const worstValue =
                              metric === "revenue"
                                ? sortedDays[sortedDays.length - 1].revenue
                                : metric === "profit"
                                  ? sortedDays[sortedDays.length - 1].profit
                                  : metric === "transactions"
                                    ? sortedDays[sortedDays.length - 1].transactions
                                    : sortedDays[sortedDays.length - 1].items_sold
                            return Math.round((bestValue - worstValue) * 100) / 100
                          })()
                        : 0,
                    performance_range: (() => {
                      const worstValue =
                        metric === "revenue"
                          ? sortedDays[sortedDays.length - 1]?.revenue
                          : metric === "profit"
                            ? sortedDays[sortedDays.length - 1]?.profit
                            : metric === "transactions"
                              ? sortedDays[sortedDays.length - 1]?.transactions
                              : sortedDays[sortedDays.length - 1]?.items_sold
                      const bestValue =
                        metric === "revenue"
                          ? sortedDays[0]?.revenue
                          : metric === "profit"
                            ? sortedDays[0]?.profit
                            : metric === "transactions"
                              ? sortedDays[0]?.transactions
                              : sortedDays[0]?.items_sold
                      return `${worstValue} - ${bestValue}`
                    })(),
                  }
                  result.message = `Comparison of best vs worst days by ${metric}`
                  break
              }

              return {
                success: true,
                analysis_type,
                data: result,
                message: result.message,
              }
            } catch (error: any) {
              console.error("Error in getDailySalesAnalysis tool:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to analyze daily sales data",
              }
            }
          },
        }),
      },

      maxSteps: 3, // Reduce max steps to avoid too many tool calls
      toolChoice: "auto",
    })

    return result.toDataStreamResponse()
  } catch (error: any) {
    console.error("Critical AI chat API error:", error)

    let clientErrorMessage = "A critical error occurred with the AI assistant."
    let statusCode = 500

    if (error.name === "AI_APICallError" || error.name === "AI_RetryError") {
      statusCode = error.statusCode || 500
      if (statusCode === 429) {
        clientErrorMessage = "Rate limit reached. Please try again in a few seconds."
      } else if (statusCode === 401) {
        clientErrorMessage =
          "OpenAI API key is invalid or expired. Please check your OPENAI_API_KEY environment variable."
      } else {
        clientErrorMessage = `OpenAI API Error: ${error.message || "Unknown error"}`
      }
    } else if (error instanceof Error) {
      clientErrorMessage = `Server error: ${error.message}`
    }

    return NextResponse.json({ error: clientErrorMessage }, { status: statusCode })
  }
}
