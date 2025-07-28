import { streamText, convertToCoreMessages, tool } from "ai"
import { openai } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabaseAI"

export async function POST(req: NextRequest) {
  let messages

  try {
    const body = await req.json()
    if (!body.messages || !Array.isArray(body.messages)) {
      throw new Error("Invalid or missing 'messages' in request body.")
    }

    messages = convertToCoreMessages(body.messages)
    console.log("Messages received and converted:", JSON.stringify(messages, null, 2))
  } catch (parseError: any) {
    console.error("Request parsing or validation error:", parseError)
    return NextResponse.json(
      { error: `Invalid request: ${parseError.message || "Could not parse request body."}` },
      { status: 400 },
    )
  }

  // Check environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY environment variable")
    return NextResponse.json(
      { error: "OpenAI API key is not configured. Please check your environment variables." },
      { status: 500 },
    )
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Missing Supabase environment variables")
    return NextResponse.json(
      { error: "Supabase configuration is missing. Please check your environment variables." },
      { status: 500 },
    )
  }

  try {
    const result = await streamText({
      model: openai("gpt-4o-mini"), // Using gpt-4o-mini for better rate limits and lower cost
      messages: messages,
      maxTokens: 4000, // Increased token limit for comprehensive responses
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
- Find products sold with zero stock available
- Analyze supplier performance and delivery reliability
- Track comprehensive expense analysis (operating vs regular expenses)
- Monitor inventory activity and stock movements
- Analyze price history and optimization opportunities
- Generate business intelligence dashboards with KPIs and insights

IMPORTANT GUIDELINES:
- When users ask about their data, inventory, products, or sales, you MUST use the appropriate tools to fetch the actual data from their database
- Don't give generic responses - always try to use real data
- Be efficient with tool calls - avoid making multiple similar calls simultaneously
- If asked about multiple products, try to use batch queries when possible
- Always specify the exact date range you're analyzing in your response
- For product searches, use searchInventory tool which supports partial name matching
- Provide clear, actionable recommendations based on the data
- If no data is found for a specific period, provide context with all-time data when available
- Always include barcodes when available in product information
- Format responses clearly with proper structure and bullet points when appropriate

Available tools include comprehensive inventory management, sales analysis, profit calculation, product updates, supplier analysis, expense tracking, inventory activity monitoring, price history analysis, and business intelligence dashboards.`,

      tools: {
        // Test tool for debugging
        testConnection: tool({
          description: "Test database connection and basic functionality",
          parameters: z.object({}),
          execute: async () => {
            try {
              console.log("Testing database connection...")
              const supabase = createClient()

              // Simple query to test connection
              const { data, error } = await supabase.from("products").select("id, name").limit(1)

              if (error) {
                console.error("Database connection test failed:", error)
                return {
                  success: false,
                  error: error.message,
                  message: "Database connection failed",
                }
              }

              console.log("Database connection test successful")
              return {
                success: true,
                message: "Database connection is working properly",
                sample_data: data,
              }
            } catch (error: any) {
              console.error("Test connection error:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to test database connection",
              }
            }
          },
        }),

        // Enhanced tool for finding products sold with zero stock
        getProductsSoldWithZeroStock: tool({
          description:
            "Get products that were sold in the last specified days but had zero stock available at the time of sale, including product names and barcodes",
          parameters: z.object({
            periodDays: z.number().min(1).max(30).default(7).describe("Number of days to analyze (default: 7)"),
          }),
          execute: async ({ periodDays }) => {
            try {
              console.log(`Executing getProductsSoldWithZeroStock tool with period: ${periodDays} days...`)
              const supabase = createClient()
              const startDate = new Date()
              startDate.setDate(startDate.getDate() - periodDays)

              // Get sales data with product information for the specified period
              const { data: salesData, error: salesError } = await supabase
                .from("sales")
                .select(`
                  id,
                  created_at,
                  sale_items (
                    product_id,
                    quantity,
                    price,
                    products (
                      id,
                      name,
                      barcode,
                      stock,
                      categories (
                        name
                      )
                    )
                  )
                `)
                .gte("created_at", startDate.toISOString())
                .order("created_at", { ascending: false })

              if (salesError) {
                console.error("Error fetching sales data:", salesError)
                throw salesError
              }

              if (!salesData || salesData.length === 0) {
                return {
                  success: true,
                  data: [],
                  message: `No sales found in the last ${periodDays} days`,
                  period: `${startDate.toISOString().split("T")[0]} to ${new Date().toISOString().split("T")[0]}`,
                }
              }

              // Process sales to find products sold with zero stock
              const productsWithZeroStock: Record<string, any> = {}

              salesData.forEach((sale) => {
                if (sale.sale_items && sale.sale_items.length > 0) {
                  sale.sale_items.forEach((item: any) => {
                    const product = item.products
                    if (product && product.stock === 0) {
                      const productKey = product.id

                      if (!productsWithZeroStock[productKey]) {
                        productsWithZeroStock[productKey] = {
                          product_id: product.id,
                          product_name: product.name,
                          barcode: product.barcode || "Barcode not available",
                          category: (product.categories as any)?.name || "Uncategorized",
                          current_stock: product.stock,
                          total_quantity_sold: 0,
                          total_sales_count: 0,
                          last_sale_date: sale.created_at,
                        }
                      }

                      productsWithZeroStock[productKey].total_quantity_sold += item.quantity
                      productsWithZeroStock[productKey].total_sales_count += 1

                      // Update last sale date if this sale is more recent
                      if (new Date(sale.created_at) > new Date(productsWithZeroStock[productKey].last_sale_date)) {
                        productsWithZeroStock[productKey].last_sale_date = sale.created_at
                      }
                    }
                  })
                }
              })

              const resultArray = Object.values(productsWithZeroStock).sort(
                (a: any, b: any) => b.total_quantity_sold - a.total_quantity_sold,
              )

              console.log(`Found ${resultArray.length} products sold with zero stock`)

              return {
                success: true,
                data: resultArray,
                total_count: resultArray.length,
                period: `${startDate.toISOString().split("T")[0]} to ${new Date().toISOString().split("T")[0]}`,
                message: `Found ${resultArray.length} products that were sold in the last ${periodDays} days but had zero stock available`,
              }
            } catch (error: any) {
              console.error("Error in getProductsSoldWithZeroStock tool:", error)
              return {
                success: false,
                error: error.message,
                message: `Failed to fetch products sold with zero stock for ${periodDays} days`,
              }
            }
          },
        }),

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
                  barcode,
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

              const limitedProducts = (products || [])
                .sort((a, b) => a.stock / a.min_stock - b.stock / b.min_stock)
                .slice(0, 20)
                .map((product) => ({
                  id: product.id,
                  name: product.name,
                  barcode: product.barcode || "Barcode not available",
                  current_stock: product.stock,
                  min_stock: product.min_stock,
                  price: product.price,
                  category: (product.categories as any)?.name || "Uncategorized",
                  stock_deficit: product.min_stock - product.stock,
                  urgency_level:
                    product.stock === 0 ? "Critical" : product.stock < product.min_stock * 0.5 ? "High" : "Medium",
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
                    barcode,
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

              const productSales: Record<string, any> = {}
              salesData?.forEach((item: any) => {
                const productId = item.products?.id
                const productName = item.products?.name || "Unknown Product"
                const barcode = item.products?.barcode || "Barcode not available"
                const categoryName = (item.products?.categories as any)?.name || "Uncategorized"

                if (!productSales[productId]) {
                  productSales[productId] = {
                    product_id: productId,
                    product_name: productName,
                    barcode: barcode,
                    category_name: categoryName,
                    total_quantity_sold: 0,
                  }
                }
                productSales[productId].total_quantity_sold += item.quantity
              })

              const sortedProducts = Object.values(productSales)
                .sort((a: any, b: any) => b.total_quantity_sold - a.total_quantity_sold)
                .slice(0, 20)

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

              const { data: products, error } = await supabase.from("products").select(`
                  id,
                  name,
                  stock,
                  barcode,
                  categories (
                    name
                  )
                `)

              if (error) throw error

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

              const productSales: Record<string, number> = {}
              salesData?.forEach((item: any) => {
                productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity
              })

              const slowMovingProducts = (products || [])
                .map((product: any) => ({
                  id: product.id,
                  name: product.name,
                  barcode: product.barcode || "Barcode not available",
                  category_name: (product.categories as any)?.name || "Uncategorized",
                  current_stock: product.stock,
                  total_quantity_sold_in_period: productSales[product.id] || 0,
                  avg_daily_velocity: (productSales[product.id] || 0) / periodDays,
                }))
                .filter((product: any) => product.avg_daily_velocity < 1)
                .sort((a: any, b: any) => a.avg_daily_velocity - b.avg_daily_velocity)
                .slice(0, 20)

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
                .select("id, name, stock, min_stock, price, purchase_price, barcode")

              if (error) throw error

              console.log("getAllProducts result count:", products?.length || 0)

              const totalProducts = products?.length || 0
              const inStock = products?.filter((p) => p.stock > 0).length || 0
              const outOfStock = products?.filter((p) => p.stock === 0).length || 0
              const lowStock = products?.filter((p) => p.stock < p.min_stock).length || 0
              const withBarcodes = products?.filter((p) => p.barcode && p.barcode.trim() !== "").length || 0
              const avgPrice = totalProducts > 0 ? products!.reduce((sum, p) => sum + p.price, 0) / totalProducts : 0
              const totalValue = products?.reduce((sum, p) => sum + p.price * p.stock, 0) || 0

              return {
                success: true,
                summary: {
                  total_products: totalProducts,
                  in_stock: inStock,
                  out_of_stock: outOfStock,
                  low_stock: lowStock,
                  with_barcodes: withBarcodes,
                  without_barcodes: totalProducts - withBarcodes,
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

              if (searchTerm) {
                query = query.ilike("name", `%${searchTerm}%`)
              }

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
                  barcode: product.barcode || "Barcode not available",
                  current_stock: product.stock,
                  min_stock: product.min_stock,
                  stock_status: stockStatusValue,
                  stock_status_text:
                    product.stock > product.min_stock ? "In Stock" : product.stock > 0 ? "Low Stock" : "Out of Stock",
                  price: product.price,
                  purchase_price: product.purchase_price,
                  profit_margin: profitMargin ? `${profitMargin}%` : "N/A",
                  category: categoryName,
                  needs_restock: product.stock <= product.min_stock,
                  stock_value: Math.round(product.price * product.stock * 100) / 100,
                }
              })

              if (stockStatus !== "all") {
                formattedProducts = formattedProducts.filter((product) => product.stock_status === stockStatus)
              }

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
                  barcode,
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
                barcode: product.barcode || "Barcode not available",
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

              let processedProducts = products

              if (category) {
                processedProducts = products.filter(
                  (product: any) =>
                    (product.categories as any)?.name?.toLowerCase().includes(category.toLowerCase()) ||
                    product.category_id === category,
                )
              }

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
                case "missing_barcodes":
                  const { count: totalCountBarcodes } = await supabase
                    .from("products")
                    .select("*", { count: "exact", head: true })
                  analysisResults = {
                    total_products: totalCountBarcodes || 0,
                    missing_barcodes: processedProducts.length,
                    percentage_missing: totalCountBarcodes
                      ? ((processedProducts.length / totalCountBarcodes) * 100).toFixed(2) + "%"
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

              const formattedProducts = processedProducts.slice(0, limit).map((product: any) => ({
                id: product.id,
                name: product.name,
                barcode: product.barcode || "Barcode not available",
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

              if (analysis_type === "monthly_profit" && month) {
                const currentYear = year || new Date().getFullYear()
                startDate = new Date(currentYear, month - 1, 1)
                endDate = new Date(currentYear, month, 0, 23, 59, 59)
              } else if (analysis_type === "monthly_profit") {
                const now = new Date()
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
              } else {
                endDate = new Date()
                startDate = new Date()
                startDate.setDate(startDate.getDate() - period_days)
              }

              console.log(`Analyzing period: ${startDate.toISOString()} to ${endDate.toISOString()}`)

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
                  .limit(100)

                if (!allTimeError && allTimeData && allTimeData.length > 0) {
                  allTimeSales = allTimeData
                }
              }

              let analysisResult: any = {}
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

              if (analysis_type === "profit_by_product" && dataToAnalyze.length > 0) {
                const productProfits: Record<string, any> = {}
                dataToAnalyze.forEach((sale) => {
                  sale.sale_items?.forEach((item: any) => {
                    const productName = item.products?.name || "Unknown Product"
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
                  .slice(0, 20)

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

              const targetProduct =
                products.find((p: any) => p.name.toLowerCase() === product_name.toLowerCase()) || products[0]

              console.log(`Found product: ${targetProduct.name} (ID: ${targetProduct.id})`)

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

              if (month && year) {
                startDate = new Date(year, month - 1, 1)
                endDate = new Date(year, month, 0, 23, 59, 59)
                console.log(`Using specified month/year: ${year}-${month}`)
              } else if (month) {
                const currentYear = new Date().getFullYear()
                startDate = new Date(currentYear, month - 1, 1)
                endDate = new Date(currentYear, month, 0, 23, 59, 59)
                console.log(`Using month ${month} with current year: ${currentYear}`)
              } else {
                const now = new Date()
                const currentYear = now.getFullYear()
                const currentMonth = now.getMonth()
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
                const dateKey = saleDate.toISOString().split("T")[0]
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
                dayData.payment_methods[sale.payment_method] = (dayData.payment_methods[sale.payment_method] || 0) + 1

                if (sale.sale_items && sale.sale_items.length > 0) {
                  sale.sale_items.forEach((item: any) => {
                    dayData.items_sold += item.quantity
                    const purchasePrice = item.products?.purchase_price || 0
                    const discount = item.discount || 0
                    const priceAfterDiscount = item.price * (1 - discount / 100)
                    const itemRevenue = priceAfterDiscount * item.quantity
                    const itemCost = purchasePrice * item.quantity
                    const itemProfit = itemRevenue - itemCost
                    dayData.profit += itemProfit

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
                  result.daily_breakdown = sortedDays.slice(0, 15)
                  result.message = `Daily breakdown for ${sortedDays.length} days, showing top 15 by ${metric}`
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

        // NEW ENHANCED TOOLS - Add these 5 powerful new capabilities

        getSupplierAnalysis: tool({
          description: "Analyze supplier performance, delivery times, and cost effectiveness",
          parameters: z.object({
            analysis_type: z
              .enum(["performance", "cost_comparison", "delivery_analysis", "reliability_score"])
              .describe("Type of supplier analysis"),
            supplier_id: z.string().optional().describe("Specific supplier to analyze"),
            period_days: z.number().min(1).max(365).default(90).describe("Period to analyze (default: 90 days)"),
          }),
          execute: async ({ analysis_type, supplier_id, period_days }) => {
            try {
              console.log(`Executing getSupplierAnalysis tool with type: ${analysis_type}...`)
              const supabase = createClient()
              const startDate = new Date()
              startDate.setDate(startDate.getDate() - period_days)

              // Get purchase orders with supplier info
              let query = supabase
                .from("purchase_orders")
                .select(`
                id,
                supplier_id,
                total_amount,
                status,
                order_date,
                delivery_date,
                expected_delivery_date,
                suppliers (
                  id,
                  name,
                  contact_info,
                  address
                ),
                purchase_order_items (
                  product_id,
                  quantity,
                  unit_cost,
                  products (
                    name,
                    categories (name)
                  )
                )
              `)
                .gte("order_date", startDate.toISOString())

              if (supplier_id) {
                query = query.eq("supplier_id", supplier_id)
              }

              const { data: orders, error } = await query

              if (error) throw error

              // Analyze supplier performance
              const supplierStats: Record<string, any> = {}

              orders?.forEach((order) => {
                const supplierId = order.supplier_id
                const supplierName = (order.suppliers as any)?.name || "Unknown Supplier"

                if (!supplierStats[supplierId]) {
                  supplierStats[supplierId] = {
                    supplier_id: supplierId,
                    supplier_name: supplierName,
                    total_orders: 0,
                    total_amount: 0,
                    on_time_deliveries: 0,
                    late_deliveries: 0,
                    avg_delivery_days: 0,
                    total_delivery_days: 0,
                    completed_orders: 0,
                    product_categories: new Set(),
                  }
                }

                const stats = supplierStats[supplierId]
                stats.total_orders += 1
                stats.total_amount += order.total_amount || 0

                // Calculate delivery performance
                if (order.delivery_date && order.expected_delivery_date) {
                  const deliveryDate = new Date(order.delivery_date)
                  const expectedDate = new Date(order.expected_delivery_date)
                  const orderDate = new Date(order.order_date)

                  const deliveryDays = Math.ceil((deliveryDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
                  stats.total_delivery_days += deliveryDays
                  stats.completed_orders += 1

                  if (deliveryDate <= expectedDate) {
                    stats.on_time_deliveries += 1
                  } else {
                    stats.late_deliveries += 1
                  }
                }

                // Track product categories
                order.purchase_order_items?.forEach((item: any) => {
                  const categoryName = item.products?.categories?.name
                  if (categoryName) {
                    stats.product_categories.add(categoryName)
                  }
                })
              })

              // Calculate final metrics
              const supplierAnalysis = Object.values(supplierStats)
                .map((stats: any) => ({
                  ...stats,
                  avg_order_value:
                    stats.total_orders > 0 ? Math.round((stats.total_amount / stats.total_orders) * 100) / 100 : 0,
                  on_time_percentage:
                    stats.completed_orders > 0
                      ? Math.round((stats.on_time_deliveries / stats.completed_orders) * 100)
                      : 0,
                  avg_delivery_days:
                    stats.completed_orders > 0 ? Math.round(stats.total_delivery_days / stats.completed_orders) : 0,
                  reliability_score:
                    stats.completed_orders > 0
                      ? Math.round((stats.on_time_deliveries / stats.completed_orders) * 100)
                      : 0,
                  product_categories: Array.from(stats.product_categories),
                  category_count: stats.product_categories.size,
                }))
                .sort((a, b) => b.reliability_score - a.reliability_score)

              return {
                success: true,
                analysis_type,
                data: supplierAnalysis,
                period_days,
                total_suppliers: supplierAnalysis.length,
                message: `Analyzed ${supplierAnalysis.length} suppliers over ${period_days} days`,
              }
            } catch (error: any) {
              console.error("Error in getSupplierAnalysis:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to analyze supplier performance",
              }
            }
          },
        }),

        getExpenseAnalysis: tool({
          description: "Analyze business expenses by category, trends, and optimization opportunities",
          parameters: z.object({
            analysis_type: z
              .enum(["by_category", "trends", "operating_vs_other", "optimization"])
              .describe("Type of expense analysis"),
            period_days: z.number().min(1).max(365).default(30).describe("Period to analyze (default: 30 days)"),
            category_id: z.string().optional().describe("Specific expense category to analyze"),
          }),
          execute: async ({ analysis_type, period_days, category_id }) => {
            try {
              console.log(`Executing getExpenseAnalysis tool with type: ${analysis_type}...`)
              const supabase = createClient()
              const startDate = new Date()
              startDate.setDate(startDate.getDate() - period_days)

              // Get expenses with category information
              let expenseQuery = supabase
                .from("expenses")
                .select(`
                id,
                amount,
                description,
                created_at,
                category_id,
                expense_categories (
                  id,
                  name
                )
              `)
                .gte("created_at", startDate.toISOString())

              // Get operating expenses
              let operatingQuery = supabase
                .from("operating_expenses")
                .select(`
                id,
                amount,
                description,
                created_at,
                category_id,
                operating_expense_categories (
                  id,
                  name
                )
              `)
                .gte("created_at", startDate.toISOString())

              if (category_id) {
                expenseQuery = expenseQuery.eq("category_id", category_id)
                operatingQuery = operatingQuery.eq("category_id", category_id)
              }

              const [expensesResult, operatingResult] = await Promise.all([expenseQuery, operatingQuery])

              if (expensesResult.error) throw expensesResult.error
              if (operatingResult.error) throw operatingResult.error

              const expenses = expensesResult.data || []
              const operatingExpenses = operatingResult.data || []

              // Combine and analyze expenses
              const categoryTotals: Record<string, any> = {}
              let totalExpenses = 0
              let totalOperatingExpenses = 0

              // Process regular expenses
              expenses.forEach((expense) => {
                const categoryName = (expense.expense_categories as any)?.name || "Uncategorized"
                const categoryId = expense.category_id || "uncategorized"

                if (!categoryTotals[categoryId]) {
                  categoryTotals[categoryId] = {
                    category_id: categoryId,
                    category_name: categoryName,
                    type: "regular",
                    total_amount: 0,
                    transaction_count: 0,
                    avg_amount: 0,
                    expenses: [],
                  }
                }

                categoryTotals[categoryId].total_amount += expense.amount
                categoryTotals[categoryId].transaction_count += 1
                categoryTotals[categoryId].expenses.push({
                  amount: expense.amount,
                  description: expense.description,
                  date: expense.created_at, // Changed from expense_date
                })
                totalExpenses += expense.amount
              })

              // Process operating expenses
              operatingExpenses.forEach((expense) => {
                const categoryName = (expense.operating_expense_categories as any)?.name || "Operating - Uncategorized"
                const categoryId = `operating_${expense.category_id || "uncategorized"}`

                if (!categoryTotals[categoryId]) {
                  categoryTotals[categoryId] = {
                    category_id: categoryId,
                    category_name: categoryName,
                    type: "operating",
                    total_amount: 0,
                    transaction_count: 0,
                    avg_amount: 0,
                    expenses: [],
                  }
                }

                categoryTotals[categoryId].total_amount += expense.amount
                categoryTotals[categoryId].transaction_count += 1
                categoryTotals[categoryId].expenses.push({
                  amount: expense.amount,
                  description: expense.description,
                  date: expense.created_at, // Changed from expense_date
                })
                totalOperatingExpenses += expense.amount
              })

              // Calculate averages and percentages
              const analysisData = Object.values(categoryTotals)
                .map((category: any) => ({
                  ...category,
                  avg_amount:
                    category.transaction_count > 0
                      ? Math.round((category.total_amount / category.transaction_count) * 100) / 100
                      : 0,
                  percentage_of_total:
                    totalExpenses + totalOperatingExpenses > 0
                      ? Math.round((category.total_amount / (totalExpenses + totalOperatingExpenses)) * 100 * 100) / 100
                      : 0,
                }))
                .sort((a, b) => b.total_amount - a.total_amount)

              const summary = {
                total_regular_expenses: Math.round(totalExpenses * 100) / 100,
                total_operating_expenses: Math.round(totalOperatingExpenses * 100) / 100,
                total_all_expenses: Math.round((totalExpenses + totalOperatingExpenses) * 100) / 100,
                regular_vs_operating_ratio:
                  totalOperatingExpenses > 0 ? Math.round((totalExpenses / totalOperatingExpenses) * 100) / 100 : "N/A",
                top_expense_category: analysisData[0]?.category_name || "None",
                category_count: analysisData.length,
                avg_daily_expenses: Math.round(((totalExpenses + totalOperatingExpenses) / period_days) * 100) / 100,
              }

              return {
                success: true,
                analysis_type,
                data: analysisData,
                summary,
                period_days,
                message: `Analyzed ${analysisData.length} expense categories totaling $${summary.total_all_expenses} over ${period_days} days`,
              }
            } catch (error: any) {
              console.error("Error in getExpenseAnalysis:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to analyze expenses",
              }
            }
          },
        }),

        getInventoryActivity: tool({
          description: "Track all inventory movements, stock changes, and activity patterns",
          parameters: z.object({
            activity_type: z
              .enum(["all", "stock_in", "stock_out", "adjustments", "low_stock_alerts"])
              .describe("Type of inventory activity"),
            period_days: z.number().min(1).max(90).default(7).describe("Period to analyze (default: 7 days)"),
            product_id: z.string().optional().describe("Specific product to track"),
          }),
          execute: async ({ activity_type, period_days, product_id }) => {
            try {
              console.log(`Executing getInventoryActivity tool with type: ${activity_type}...`)
              const supabase = createClient()
              const startDate = new Date()
              startDate.setDate(startDate.getDate() - period_days)

              // Get inventory activity
              let query = supabase
                .from("inventory_activity")
                .select(`
                id,
                product_id,
                activity_type,
                quantity_change,
                previous_quantity,
                new_quantity,
                reason,
                created_at,
                products (
                  name,
                  barcode,
                  categories (name)
                )
              `)
                .gte("created_at", startDate.toISOString())
                .order("created_at", { ascending: false })

              if (product_id) {
                query = query.eq("product_id", product_id)
              }

              if (activity_type !== "all") {
                query = query.eq("activity_type", activity_type)
              }

              const { data: activities, error } = await query.limit(100)

              if (error) throw error

              // Also get current stock levels for context
              const { data: currentStock, error: stockError } = await supabase
                .from("products")
                .select("id, name, stock, min_stock")

              if (stockError) throw stockError

              // Analyze activity patterns
              const activitySummary: Record<string, any> = {}
              const productActivity: Record<string, any> = {}

              activities?.forEach((activity) => {
                const actType = activity.activity_type
                const productName = (activity.products as any)?.name || "Unknown Product"
                const productId = activity.product_id

                // Summary by activity type
                if (!activitySummary[actType]) {
                  activitySummary[actType] = {
                    activity_type: actType,
                    total_activities: 0,
                    total_quantity_change: 0,
                    products_affected: new Set(),
                  }
                }
                activitySummary[actType].total_activities += 1
                activitySummary[actType].total_quantity_change += Math.abs(activity.quantity_change || 0)
                activitySummary[actType].products_affected.add(productId)

                // Summary by product
                if (!productActivity[productId]) {
                  productActivity[productId] = {
                    product_id: productId,
                    product_name: productName,
                    barcode: (activity.products as any)?.barcode || "N/A",
                    category: (activity.products as any)?.categories?.name || "Uncategorized",
                    total_activities: 0,
                    stock_increases: 0,
                    stock_decreases: 0,
                    net_change: 0,
                    recent_activities: [],
                  }
                }

                const prodActivity = productActivity[productId]
                prodActivity.total_activities += 1
                prodActivity.net_change += activity.quantity_change || 0

                if ((activity.quantity_change || 0) > 0) {
                  prodActivity.stock_increases += activity.quantity_change
                } else {
                  prodActivity.stock_decreases += Math.abs(activity.quantity_change || 0)
                }

                prodActivity.recent_activities.push({
                  type: activity.activity_type,
                  quantity_change: activity.quantity_change,
                  reason: activity.reason,
                  date: activity.created_at,
                  previous_qty: activity.previous_quantity,
                  new_qty: activity.new_quantity,
                })
              })

              // Convert sets to counts and format data
              const formattedActivitySummary = Object.values(activitySummary).map((summary: any) => ({
                ...summary,
                products_affected_count: summary.products_affected.size,
                avg_quantity_per_activity:
                  summary.total_activities > 0
                    ? Math.round((summary.total_quantity_change / summary.total_activities) * 100) / 100
                    : 0,
              }))

              const formattedProductActivity = Object.values(productActivity)
                .sort((a: any, b: any) => b.total_activities - a.total_activities)
                .slice(0, 20)
                .map((product: any) => ({
                  ...product,
                  recent_activities: product.recent_activities.slice(0, 5), // Show only 5 most recent
                }))

              // Get low stock alerts
              const lowStockProducts =
                currentStock
                  ?.filter((product) => product.stock <= product.min_stock)
                  .map((product) => ({
                    product_id: product.id,
                    product_name: product.name,
                    current_stock: product.stock,
                    min_stock: product.min_stock,
                    deficit: product.min_stock - product.stock,
                    urgency: product.stock === 0 ? "Critical" : "Low",
                  })) || []

              return {
                success: true,
                activity_type,
                data: {
                  activity_summary: formattedActivitySummary,
                  product_activity: formattedProductActivity,
                  low_stock_alerts: lowStockProducts,
                  period_summary: {
                    total_activities: activities?.length || 0,
                    unique_products_affected: Object.keys(productActivity).length,
                    most_active_product: formattedProductActivity[0]?.product_name || "None",
                    low_stock_count: lowStockProducts.length,
                  },
                },
                period_days,
                message: `Found ${activities?.length || 0} inventory activities affecting ${Object.keys(productActivity).length} products over ${period_days} days`,
              }
            } catch (error: any) {
              console.error("Error in getInventoryActivity:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to analyze inventory activity",
              }
            }
          },
        }),

        getPriceHistoryAnalysis: tool({
          description: "Analyze price changes, trends, and optimization opportunities",
          parameters: z.object({
            analysis_type: z
              .enum(["price_trends", "frequent_changes", "price_optimization", "category_pricing"])
              .describe("Type of price analysis"),
            product_id: z.string().optional().describe("Specific product to analyze"),
            period_days: z.number().min(1).max(365).default(90).describe("Period to analyze (default: 90 days)"),
          }),
          execute: async ({ analysis_type, product_id, period_days }) => {
            try {
              console.log(`Executing getPriceHistoryAnalysis tool with type: ${analysis_type}...`)
              const supabase = createClient()
              const startDate = new Date()
              startDate.setDate(startDate.getDate() - period_days)

              // Get price history
              let query = supabase
                .from("price_history")
                .select(`
                id,
                product_id,
                old_price,
                new_price,
                change_reason,
                changed_at,
                products (
                  name,
                  barcode,
                  current_price: price,
                  purchase_price,
                  categories (name)
                )
              `)
                .gte("changed_at", startDate.toISOString())
                .order("changed_at", { ascending: false })

              if (product_id) {
                query = query.eq("product_id", product_id)
              }

              const { data: priceHistory, error } = await query

              if (error) throw error

              if (!priceHistory || priceHistory.length === 0) {
                return {
                  success: true,
                  message: `No price changes found in the last ${period_days} days`,
                  data: [],
                  analysis_type,
                  period_days,
                }
              }

              // Analyze price changes by product
              const productPriceAnalysis: Record<string, any> = {}

              priceHistory.forEach((change) => {
                const productId = change.product_id
                const productName = (change.products as any)?.name || "Unknown Product"
                const currentPrice = (change.products as any)?.current_price || 0
                const purchasePrice = (change.products as any)?.purchase_price || 0

                if (!productPriceAnalysis[productId]) {
                  productPriceAnalysis[productId] = {
                    product_id: productId,
                    product_name: productName,
                    barcode: (change.products as any)?.barcode || "N/A",
                    category: (change.products as any)?.categories?.name || "Uncategorized",
                    current_price: currentPrice,
                    purchase_price: purchasePrice,
                    current_profit_margin:
                      purchasePrice > 0
                        ? Math.round(((currentPrice - purchasePrice) / currentPrice) * 100 * 100) / 100
                        : 0,
                    price_changes: [],
                    total_changes: 0,
                    price_increases: 0,
                    price_decreases: 0,
                    total_increase_amount: 0,
                    total_decrease_amount: 0,
                    price_volatility: 0,
                  }
                }

                const analysis = productPriceAnalysis[productId]
                analysis.total_changes += 1

                const priceChange = (change.new_price || 0) - (change.old_price || 0)
                if (priceChange > 0) {
                  analysis.price_increases += 1
                  analysis.total_increase_amount += priceChange
                } else if (priceChange < 0) {
                  analysis.price_decreases += 1
                  analysis.total_decrease_amount += Math.abs(priceChange)
                }

                analysis.price_changes.push({
                  old_price: change.old_price,
                  new_price: change.new_price,
                  change_amount: priceChange,
                  change_percentage:
                    change.old_price > 0 ? Math.round((priceChange / change.old_price) * 100 * 100) / 100 : 0,
                  reason: change.change_reason,
                  date: change.changed_at,
                })
              })

              // Calculate volatility and format results
              const formattedAnalysis = Object.values(productPriceAnalysis)
                .map((product: any) => {
                  // Calculate price volatility (standard deviation of price changes)
                  if (product.price_changes.length > 1) {
                    const changes = product.price_changes.map((c: any) => c.change_percentage)
                    const mean = changes.reduce((sum: number, change: number) => sum + change, 0) / changes.length
                    const variance =
                      changes.reduce((sum: number, change: number) => sum + Math.pow(change - mean, 2), 0) /
                      changes.length
                    product.price_volatility = Math.round(Math.sqrt(variance) * 100) / 100
                  }

                  return {
                    ...product,
                    avg_price_increase:
                      product.price_increases > 0
                        ? Math.round((product.total_increase_amount / product.price_increases) * 100) / 100
                        : 0,
                    avg_price_decrease:
                      product.price_decreases > 0
                        ? Math.round((product.total_decrease_amount / product.price_decreases) * 100) / 100
                        : 0,
                    net_price_change:
                      Math.round((product.total_increase_amount - product.total_decrease_amount) * 100) / 100,
                    price_changes: product.price_changes.slice(0, 10), // Limit to 10 most recent changes
                  }
                })
                .sort((a, b) => b.total_changes - a.total_changes)

              return {
                success: true,
                analysis_type,
                data: formattedAnalysis.slice(0, 20), // Limit to top 20 products
                summary: {
                  total_products_with_changes: formattedAnalysis.length,
                  total_price_changes: priceHistory.length,
                  avg_changes_per_product:
                    formattedAnalysis.length > 0
                      ? Math.round((priceHistory.length / formattedAnalysis.length) * 100) / 100
                      : 0,
                  period_days,
                },
                message: `Analyzed price history for ${formattedAnalysis.length} products with ${priceHistory.length} total changes over ${period_days} days`,
              }
            } catch (error: any) {
              console.error("Error in getPriceHistoryAnalysis:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to analyze price history",
              }
            }
          },
        }),

        getBusinessIntelligence: tool({
          description: "Get comprehensive business intelligence including KPIs, trends, and actionable insights",
          parameters: z.object({
            dashboard_type: z
              .enum(["overview", "financial", "inventory", "operational", "growth"])
              .describe("Type of business intelligence dashboard"),
            period_days: z.number().min(1).max(365).default(30).describe("Period to analyze (default: 30 days)"),
            compare_previous: z.boolean().default(true).describe("Compare with previous period"),
          }),
          execute: async ({ dashboard_type, period_days, compare_previous }) => {
            try {
              console.log(`Executing getBusinessIntelligence tool with type: ${dashboard_type}...`)
              const supabase = createClient()
              const endDate = new Date()
              const startDate = new Date()
              startDate.setDate(startDate.getDate() - period_days)

              // Previous period for comparison
              const prevEndDate = new Date(startDate)
              const prevStartDate = new Date()
              prevStartDate.setDate(prevEndDate.getDate() - period_days)

              // Fetch all necessary data in parallel
              const [
                salesResult,
                expensesResult,
                operatingExpensesResult,
                productsResult,
                inventoryResult,
                suppliersResult,
                prevSalesResult,
              ] = await Promise.all([
                // Current period sales
                supabase
                  .from("sales")
                  .select(`
                  id, total, created_at,
                  sale_items (quantity, price, products (purchase_price))
                `)
                  .gte("created_at", startDate.toISOString())
                  .lte("created_at", endDate.toISOString()),

                // Current period expenses
                supabase
                  .from("expenses")
                  .select("amount, created_at")
                  .gte("created_at", startDate.toISOString())
                  .lte("created_at", endDate.toISOString()),

                // Current period operating expenses
                supabase
                  .from("operating_expenses")
                  .select("amount, created_at")
                  .gte("created_at", startDate.toISOString())
                  .lte("created_at", endDate.toISOString()),

                // Products data
                supabase
                  .from("products")
                  .select("id, name, stock, min_stock, price, purchase_price"),

                // Inventory activity
                supabase
                  .from("inventory_activity")
                  .select("activity_type, quantity_change, created_at")
                  .gte("created_at", startDate.toISOString()),

                // Suppliers
                supabase
                  .from("suppliers")
                  .select("id, name"),

                // Previous period sales for comparison
                compare_previous
                  ? supabase
                      .from("sales")
                      .select("id, total, created_at")
                      .gte("created_at", prevStartDate.toISOString())
                      .lte("created_at", prevEndDate.toISOString())
                  : Promise.resolve({ data: [], error: null }),
              ])

              if (salesResult.error) throw salesResult.error
              if (expensesResult.error) throw expensesResult.error
              if (operatingExpensesResult.error) throw operatingExpensesResult.error
              if (productsResult.error) throw productsResult.error

              const sales = salesResult.data || []
              const expenses = expensesResult.data || []
              const operatingExpenses = operatingExpensesResult.data || []
              const products = productsResult.data || []
              const inventoryActivity = inventoryResult.data || []
              const suppliers = suppliersResult.data || []
              const prevSales = prevSalesResult.data || []

              // Calculate key metrics
              const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0)
              const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
              const totalOperatingExpenses = operatingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
              const totalCosts = totalExpenses + totalOperatingExpenses

              // Calculate COGS (Cost of Goods Sold)
              let totalCOGS = 0
              sales.forEach((sale) => {
                sale.sale_items?.forEach((item: any) => {
                  const purchasePrice = item.products?.purchase_price || 0
                  totalCOGS += purchasePrice * (item.quantity || 0)
                })
              })

              const grossProfit = totalRevenue - totalCOGS
              const netProfit = grossProfit - totalCosts
              const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
              const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

              // Inventory metrics
              const totalProducts = products.length
              const inStockProducts = products.filter((p) => p.stock > 0).length
              const lowStockProducts = products.filter((p) => p.stock <= p.min_stock).length
              const outOfStockProducts = products.filter((p) => p.stock === 0).length
              const totalInventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)

              // Sales metrics
              const totalTransactions = sales.length
              const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
              const totalItemsSold = sales.reduce((sum, sale) => {
                return (
                  sum +
                  (sale.sale_items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0)
                )
              }, 0)

              // Previous period comparison
              let comparison: any = null
              if (compare_previous && prevSales.length > 0) {
                const prevRevenue = prevSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
                const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
                const transactionGrowth =
                  prevSales.length > 0 ? ((totalTransactions - prevSales.length) / prevSales.length) * 100 : 0

                comparison = {
                  revenue_growth: Math.round(revenueGrowth * 100) / 100,
                  transaction_growth: Math.round(transactionGrowth * 100) / 100,
                  prev_period_revenue: Math.round(prevRevenue * 100) / 100,
                  prev_period_transactions: prevSales.length,
                }
              }

              // Build dashboard data
              const dashboardData: any = {
                period: {
                  start_date: startDate.toISOString().split("T")[0],
                  end_date: endDate.toISOString().split("T")[0],
                  days: period_days,
                },
                key_metrics: {
                  total_revenue: Math.round(totalRevenue * 100) / 100,
                  gross_profit: Math.round(grossProfit * 100) / 100,
                  net_profit: Math.round(netProfit * 100) / 100,
                  gross_margin: Math.round(grossMargin * 100) / 100,
                  net_margin: Math.round(netMargin * 100) / 100,
                  total_transactions: totalTransactions,
                  avg_transaction_value: Math.round(avgTransactionValue * 100) / 100,
                  total_items_sold: totalItemsSold,
                },
                inventory_health: {
                  total_products: totalProducts,
                  in_stock: inStockProducts,
                  low_stock: lowStockProducts,
                  out_of_stock: outOfStockProducts,
                  inventory_value: Math.round(totalInventoryValue * 100) / 100,
                  stock_turnover_rate:
                    totalInventoryValue > 0 ? Math.round((totalCOGS / totalInventoryValue) * 100) / 100 : 0,
                },
                operational_metrics: {
                  total_suppliers: suppliers.length,
                  inventory_activities: inventoryActivity.length,
                  avg_daily_revenue: Math.round((totalRevenue / period_days) * 100) / 100,
                  avg_daily_transactions: Math.round((totalTransactions / period_days) * 100) / 100,
                },
              }

              if (comparison) {
                dashboardData.period_comparison = comparison
              }

              // Generate actionable insights
              const insights = []
              if (netMargin < 10) insights.push("Net profit margin is below 10% - consider cost optimization")
              if (lowStockProducts > totalProducts * 0.2) insights.push(`${lowStockProducts} products need restocking`)
              if (avgTransactionValue < 20)
                insights.push("Average transaction value is low - consider upselling strategies")
              if (comparison && comparison.revenue_growth < 0)
                insights.push("Revenue declined compared to previous period")

              dashboardData.actionable_insights = insights

              return {
                success: true,
                dashboard_type,
                data: dashboardData,
                message: `Generated ${dashboard_type} business intelligence dashboard for ${period_days} days`,
              }
            } catch (error: any) {
              console.error("Error in getBusinessIntelligence:", error)
              return {
                success: false,
                error: error.message,
                message: "Failed to generate business intelligence dashboard",
              }
            }
          },
        }),
      },

      maxSteps: 5, // Increased max steps for more comprehensive responses
      toolChoice: "auto",
    })

    return result.toDataStreamResponse()
  } catch (error: any) {
    console.error("Critical AI chat API error:", error)

    // More detailed error logging
    console.error("Error name:", error.name)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)

    let clientErrorMessage = "A critical error occurred with the AI assistant."
    let statusCode = 500

    // Enhanced error handling for different types of API errors
    if (error.name === "AI_APICallError" || error.name === "AI_RetryError") {
      statusCode = error.statusCode || 500
      if (statusCode === 429) {
        clientErrorMessage = "Rate limit reached. Please try again in a few seconds."
      } else if (statusCode === 400) {
        clientErrorMessage = "Invalid request to AI service. Please try rephrasing your question."
      } else if (statusCode === 401) {
        clientErrorMessage = "Authentication error with AI service. Please check your API key."
      } else if (statusCode === 403) {
        clientErrorMessage = "Access denied to AI service. Please check your permissions."
      } else {
        clientErrorMessage = `AI Service Error: ${error.message || "Unknown error"}`
      }
    } else if (error.message?.includes("fetch")) {
      clientErrorMessage = "Network error. Please check your internet connection and try again."
    } else if (error.message?.includes("Supabase")) {
      clientErrorMessage = "Database connection error. Please check your database configuration."
    } else if (error instanceof Error) {
      clientErrorMessage = `Server error: ${error.message}`
    }

    return NextResponse.json({ error: clientErrorMessage }, { status: statusCode })
  }
}
