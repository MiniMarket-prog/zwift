import { tool } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabaseAI"
import { registerTool } from "./index"

// Low Stock Products Tool
const getLowStockProducts = tool({
  description: "Get all products that are currently below their minimum stock level",
  parameters: z.object({
    limit: z.number().min(1).max(100).default(50).describe("Maximum number of products to return"),
    urgency_filter: z.enum(["all", "critical", "high", "medium"]).default("all").describe("Filter by urgency level"),
  }),
  execute: async ({ limit, urgency_filter }) => {
    try {
      console.log("Executing getLowStockProducts tool...")
      const supabase = createClient()

      // First, get all products with their stock and min_stock values
      const { data: products, error } = await supabase
        .from("products")
        .select(`
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
        .order("stock", { ascending: true })

      if (error) {
        console.error("Error in getLowStockProducts:", error)
        throw error
      }

      if (!products || products.length === 0) {
        return {
          success: true,
          data: [],
          total_count: 0,
          message: "No products found in the database",
        }
      }

      // Filter products where stock is less than min_stock
      const lowStockProducts = products
        .filter((product) => {
          const stock = product.stock || 0
          const minStock = product.min_stock || 0
          return stock < minStock
        })
        .map((product) => {
          const stock = product.stock || 0
          const minStock = product.min_stock || 0
          const stockDeficit = minStock - stock

          // Calculate urgency level
          let urgencyLevel = "Medium"
          if (stock === 0) {
            urgencyLevel = "Critical"
          } else if (stock < minStock * 0.3) {
            urgencyLevel = "High"
          } else if (stock < minStock * 0.7) {
            urgencyLevel = "Medium"
          }

          return {
            id: product.id,
            name: product.name,
            barcode: product.barcode || "Barcode not available",
            current_stock: stock,
            min_stock: minStock,
            price: product.price || 0,
            purchase_price: product.purchase_price || 0,
            category: (product.categories as any)?.name || "Uncategorized",
            stock_deficit: stockDeficit,
            urgency_level: urgencyLevel,
            stock_percentage: minStock > 0 ? Math.round((stock / minStock) * 100) : 0,
            restock_value: (product.purchase_price || 0) * stockDeficit,
          }
        })

      // Apply urgency filter
      let filteredProducts = lowStockProducts
      if (urgency_filter !== "all") {
        const urgencyMap = {
          critical: "Critical",
          high: "High",
          medium: "Medium",
        }
        filteredProducts = lowStockProducts.filter((product) => product.urgency_level === urgencyMap[urgency_filter])
      }

      // Sort by urgency (Critical first, then by stock percentage)
      filteredProducts.sort((a, b) => {
        const urgencyOrder = { Critical: 0, High: 1, Medium: 2 }
        const aUrgency = urgencyOrder[a.urgency_level as keyof typeof urgencyOrder] || 3
        const bUrgency = urgencyOrder[b.urgency_level as keyof typeof urgencyOrder] || 3

        if (aUrgency !== bUrgency) {
          return aUrgency - bUrgency
        }
        return a.stock_percentage - b.stock_percentage
      })

      // Limit results
      const limitedProducts = filteredProducts.slice(0, limit)

      // Calculate summary statistics
      const criticalCount = lowStockProducts.filter((p) => p.urgency_level === "Critical").length
      const highCount = lowStockProducts.filter((p) => p.urgency_level === "High").length
      const mediumCount = lowStockProducts.filter((p) => p.urgency_level === "Medium").length
      const totalRestockValue = limitedProducts.reduce((sum, p) => sum + p.restock_value, 0)

      console.log(
        `getLowStockProducts result: ${limitedProducts.length} products (${criticalCount} critical, ${highCount} high, ${mediumCount} medium priority)`,
      )

      return {
        success: true,
        data: limitedProducts,
        total_count: lowStockProducts.length,
        showing_count: limitedProducts.length,
        summary: {
          critical_count: criticalCount,
          high_priority_count: highCount,
          medium_priority_count: mediumCount,
          total_restock_value: Math.round(totalRestockValue * 100) / 100,
        },
        urgency_filter_applied: urgency_filter,
        message: `Found ${lowStockProducts.length} products below minimum stock level (showing ${limitedProducts.length}). ${criticalCount} critical, ${highCount} high priority, ${mediumCount} medium priority.`,
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
})

// Inventory Overview Tool
const getInventoryOverview = tool({
  description: "Get comprehensive inventory overview with key metrics and insights",
  parameters: z.object({
    include_categories: z.boolean().default(true).describe("Include category breakdown"),
    include_value_analysis: z.boolean().default(true).describe("Include inventory value analysis"),
  }),
  execute: async ({ include_categories, include_value_analysis }) => {
    try {
      console.log("Executing getInventoryOverview tool...")
      const supabase = createClient()

      // Get all products with category information
      const { data: products, error } = await supabase.from("products").select(`
          id,
          name,
          stock,
          min_stock,
          price,
          purchase_price,
          barcode,
          category_id,
          categories (
            id,
            name
          )
        `)

      if (error) {
        console.error("Error fetching products:", error)
        throw error
      }

      if (!products || products.length === 0) {
        return {
          success: true,
          message: "No products found in inventory",
          data: {
            total_products: 0,
            summary: {},
          },
        }
      }

      // Calculate basic metrics
      const totalProducts = products.length
      const inStock = products.filter((p) => p.stock > 0).length
      const outOfStock = products.filter((p) => p.stock === 0).length
      const lowStock = products.filter((p) => p.stock < p.min_stock && p.stock > 0).length
      const criticalStock = products.filter((p) => p.stock === 0).length
      const withBarcodes = products.filter((p) => p.barcode && p.barcode.trim() !== "").length
      const withPurchasePrices = products.filter((p) => p.purchase_price && p.purchase_price > 0).length

      // Value calculations
      const totalInventoryValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0)
      const totalCostValue = products.reduce((sum, p) => sum + (p.purchase_price || 0) * (p.stock || 0), 0)
      const potentialProfit = totalInventoryValue - totalCostValue

      // Stock distribution
      const stockDistribution = {
        zero_stock: products.filter((p) => p.stock === 0).length,
        low_stock_1_10: products.filter((p) => p.stock >= 1 && p.stock <= 10).length,
        medium_stock_11_50: products.filter((p) => p.stock >= 11 && p.stock <= 50).length,
        high_stock_51_plus: products.filter((p) => p.stock >= 51).length,
      }

      const overview: any = {
        summary: {
          total_products: totalProducts,
          in_stock: inStock,
          out_of_stock: outOfStock,
          low_stock: lowStock,
          critical_stock: criticalStock,
          stock_health_percentage: totalProducts > 0 ? Math.round((inStock / totalProducts) * 100) : 0,
        },
        data_quality: {
          with_barcodes: withBarcodes,
          without_barcodes: totalProducts - withBarcodes,
          barcode_completion: totalProducts > 0 ? Math.round((withBarcodes / totalProducts) * 100) : 0,
          with_purchase_prices: withPurchasePrices,
          purchase_price_completion: totalProducts > 0 ? Math.round((withPurchasePrices / totalProducts) * 100) : 0,
        },
        stock_distribution: stockDistribution,
      }

      if (include_value_analysis) {
        overview.value_analysis = {
          total_inventory_value: Math.round(totalInventoryValue * 100) / 100,
          total_cost_value: Math.round(totalCostValue * 100) / 100,
          potential_profit: Math.round(potentialProfit * 100) / 100,
          avg_product_value: totalProducts > 0 ? Math.round((totalInventoryValue / totalProducts) * 100) / 100 : 0,
          profit_margin_percentage:
            totalInventoryValue > 0 ? Math.round((potentialProfit / totalInventoryValue) * 100) : 0,
        }
      }

      if (include_categories) {
        // Category breakdown
        const categoryStats: Record<string, any> = {}

        products.forEach((product) => {
          const categoryName = (product.categories as any)?.name || "Uncategorized"
          const categoryId = (product.categories as any)?.id || "uncategorized"

          if (!categoryStats[categoryId]) {
            categoryStats[categoryId] = {
              category_name: categoryName,
              total_products: 0,
              in_stock: 0,
              out_of_stock: 0,
              low_stock: 0,
              total_value: 0,
              total_stock_units: 0,
            }
          }

          const stats = categoryStats[categoryId]
          stats.total_products += 1
          stats.total_stock_units += product.stock || 0
          stats.total_value += (product.price || 0) * (product.stock || 0)

          if (product.stock === 0) {
            stats.out_of_stock += 1
          } else if (product.stock < product.min_stock) {
            stats.low_stock += 1
          } else {
            stats.in_stock += 1
          }
        })

        overview.category_breakdown = Object.values(categoryStats)
          .map((cat: any) => ({
            ...cat,
            total_value: Math.round(cat.total_value * 100) / 100,
            stock_health_percentage: cat.total_products > 0 ? Math.round((cat.in_stock / cat.total_products) * 100) : 0,
          }))
          .sort((a: any, b: any) => b.total_value - a.total_value)
      }

      // Generate insights
      const insights = []
      if (outOfStock > totalProducts * 0.1) {
        insights.push(`${outOfStock} products (${Math.round((outOfStock / totalProducts) * 100)}%) are out of stock`)
      }
      if (lowStock > totalProducts * 0.15) {
        insights.push(`${lowStock} products need restocking soon`)
      }
      if (withBarcodes < totalProducts * 0.8) {
        insights.push(`${totalProducts - withBarcodes} products missing barcodes`)
      }
      if (withPurchasePrices < totalProducts * 0.7) {
        insights.push(`${totalProducts - withPurchasePrices} products missing purchase prices`)
      }

      overview.insights = insights

      return {
        success: true,
        data: overview,
        message: `Inventory overview: ${totalProducts} total products, ${inStock} in stock, ${outOfStock} out of stock, ${lowStock} low stock`,
      }
    } catch (error: any) {
      console.error("Error in getInventoryOverview tool:", error)
      return {
        success: false,
        error: error.message,
        message: "Failed to fetch inventory overview",
      }
    }
  },
})

// Search Inventory Tool
const searchInventory = tool({
  description:
    "Search for products by name, category, or other criteria with detailed stock information. Perfect for finding specific products like 'cajou' (cashews).",
  parameters: z.object({
    searchTerm: z.string().optional().describe("Product name to search for (supports partial matching)"),
    category: z.string().optional().describe("Category to filter by"),
    stockStatus: z.enum(["all", "in_stock", "low_stock", "out_of_stock"]).optional().describe("Stock status filter"),
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
          out_of_stock: outOfStockCount,
          low_stock: lowStockCount,
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
})

// Check Product Stock Tool
const checkProductStock = tool({
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
        status: product.stock > product.min_stock ? "In Stock" : product.stock > 0 ? "Low Stock" : "Out of Stock",
        needs_restock: product.stock <= product.min_stock,
      }))

      const stockInfo = formattedProducts.map((p) => `${p.name}: ${p.current_stock} units (${p.status})`).join(", ")

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
})

// Get All Products Tool
const getAllProducts = tool({
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
})

// Bulk Update Minimum Stock Tool
const bulkUpdateMinimumStock = tool({
  description:
    "Update minimum stock levels for multiple products at once, especially useful for setting products with 0 min_stock to a new value",
  parameters: z.object({
    filter_criteria: z
      .object({
        current_min_stock: z.number().optional().describe("Filter products by current minimum stock level (e.g., 0)"),
        product_names: z.array(z.string()).optional().describe("Specific product names to update"),
        category: z.string().optional().describe("Update products in specific category"),
      })
      .describe("Criteria to filter which products to update"),
    new_min_stock: z.number().min(0).describe("New minimum stock level to set"),
    confirm_update: z.boolean().default(false).describe("Set to true to actually perform the update (safety check)"),
  }),
  execute: async ({ filter_criteria, new_min_stock, confirm_update }) => {
    try {
      console.log(`Executing bulkUpdateMinimumStock tool...`)
      console.log("Filter criteria:", filter_criteria)
      console.log("New min stock:", new_min_stock)
      console.log("Confirm update:", confirm_update)

      const supabase = createClient()

      // First, find products that match the criteria
      let query = supabase.from("products").select(`
        id,
        name,
        stock,
        min_stock,
        barcode,
        category_id,
        categories (
          name
        )
      `)

      // Apply filters
      if (filter_criteria.current_min_stock !== undefined) {
        query = query.eq("min_stock", filter_criteria.current_min_stock)
      }

      if (filter_criteria.category) {
        const { data: categoryData } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", `%${filter_criteria.category}%`)
          .single()

        if (categoryData) {
          query = query.eq("category_id", categoryData.id)
        }
      }

      const { data: products, error: fetchError } = await query

      if (fetchError) {
        console.error("Error fetching products:", fetchError)
        throw fetchError
      }

      if (!products || products.length === 0) {
        return {
          success: false,
          message: "No products found matching the specified criteria",
          criteria_used: filter_criteria,
        }
      }

      // Filter by product names if specified
      let filteredProducts = products
      if (filter_criteria.product_names && filter_criteria.product_names.length > 0) {
        filteredProducts = products.filter((product) =>
          filter_criteria.product_names!.some((name) => product.name.toLowerCase().includes(name.toLowerCase())),
        )
      }

      if (filteredProducts.length === 0) {
        return {
          success: false,
          message: "No products found matching the product name criteria",
          total_products_found: products.length,
          criteria_used: filter_criteria,
        }
      }

      // Show preview of what will be updated
      const updatePreview = filteredProducts.map((product) => ({
        id: product.id,
        name: product.name,
        barcode: product.barcode || "No barcode",
        current_stock: product.stock,
        current_min_stock: product.min_stock,
        new_min_stock: new_min_stock,
        category: (product.categories as any)?.name || "Uncategorized",
      }))

      // If not confirmed, just return preview
      if (!confirm_update) {
        return {
          success: true,
          preview_mode: true,
          message: `Found ${filteredProducts.length} products that would be updated. Set confirm_update=true to proceed.`,
          products_to_update: updatePreview,
          total_found: filteredProducts.length,
          criteria_used: filter_criteria,
          warning: "This is a preview. No changes have been made yet.",
        }
      }

      // Perform the actual updates
      console.log(`Updating ${filteredProducts.length} products...`)
      const updateResults = []
      let successCount = 0
      let errorCount = 0

      for (const product of filteredProducts) {
        try {
          const { data: updatedProduct, error: updateError } = await supabase
            .from("products")
            .update({ min_stock: new_min_stock })
            .eq("id", product.id)
            .select("id, name, min_stock")
            .single()

          if (updateError) {
            console.error(`Error updating product ${product.name}:`, updateError)
            updateResults.push({
              product_id: product.id,
              product_name: product.name,
              success: false,
              error: updateError.message,
            })
            errorCount++
          } else {
            console.log(`Successfully updated ${product.name}: min_stock = ${updatedProduct.min_stock}`)
            updateResults.push({
              product_id: product.id,
              product_name: product.name,
              success: true,
              old_min_stock: product.min_stock,
              new_min_stock: updatedProduct.min_stock,
            })
            successCount++
          }
        } catch (error: any) {
          console.error(`Exception updating product ${product.name}:`, error)
          updateResults.push({
            product_id: product.id,
            product_name: product.name,
            success: false,
            error: error.message,
          })
          errorCount++
        }
      }

      return {
        success: successCount > 0,
        message: `Bulk update completed: ${successCount} successful, ${errorCount} failed`,
        summary: {
          total_processed: filteredProducts.length,
          successful_updates: successCount,
          failed_updates: errorCount,
          new_min_stock_value: new_min_stock,
        },
        update_results: updateResults,
        criteria_used: filter_criteria,
      }
    } catch (error: any) {
      console.error("Error in bulkUpdateMinimumStock tool:", error)
      return {
        success: false,
        error: error.message,
        message: "Failed to perform bulk minimum stock update",
      }
    }
  },
})

// Verify Product Updates Tool
const verifyProductUpdates = tool({
  description: "Verify that product updates were actually applied by checking current database values",
  parameters: z.object({
    product_names: z.array(z.string()).describe("Names of products to verify"),
    expected_min_stock: z.number().optional().describe("Expected minimum stock value to verify"),
  }),
  execute: async ({ product_names, expected_min_stock }) => {
    try {
      console.log(`Verifying updates for products:`, product_names)
      const supabase = createClient()

      const verificationResults = []

      for (const productName of product_names) {
        const { data: products, error } = await supabase
          .from("products")
          .select("id, name, stock, min_stock, barcode")
          .ilike("name", `%${productName}%`)

        if (error) {
          verificationResults.push({
            search_term: productName,
            success: false,
            error: error.message,
          })
          continue
        }

        if (!products || products.length === 0) {
          verificationResults.push({
            search_term: productName,
            success: false,
            message: "Product not found",
          })
          continue
        }

        // Find exact or closest match
        const exactMatch = products.find((p) => p.name.toLowerCase() === productName.toLowerCase())
        const product = exactMatch || products[0]

        const verification: any = {
          search_term: productName,
          found_product: {
            id: product.id,
            name: product.name,
            barcode: product.barcode || "No barcode",
            current_stock: product.stock,
            current_min_stock: product.min_stock,
          },
          success: true,
        }

        if (expected_min_stock !== undefined) {
          verification.expected_min_stock = expected_min_stock
          verification.min_stock_matches = product.min_stock === expected_min_stock
          verification.update_successful = product.min_stock === expected_min_stock
        }

        verificationResults.push(verification)
      }

      const successfulVerifications = verificationResults.filter((r) => r.success).length
      const matchingMinStock =
        expected_min_stock !== undefined
          ? verificationResults.filter((r) => r.success && r.min_stock_matches === true).length
          : null

      return {
        success: true,
        message: `Verified ${successfulVerifications} out of ${product_names.length} products`,
        verification_results: verificationResults,
        summary: {
          total_requested: product_names.length,
          products_found: successfulVerifications,
          products_not_found: product_names.length - successfulVerifications,
          min_stock_matches: matchingMinStock,
          expected_min_stock: expected_min_stock,
        },
      }
    } catch (error: any) {
      console.error("Error in verifyProductUpdates tool:", error)
      return {
        success: false,
        error: error.message,
        message: "Failed to verify product updates",
      }
    }
  },
})

// Register inventory tools
registerTool("getLowStockProducts", getLowStockProducts)
registerTool("getInventoryOverview", getInventoryOverview)
registerTool("searchInventory", searchInventory)
registerTool("checkProductStock", checkProductStock)
registerTool("getAllProducts", getAllProducts)
registerTool("bulkUpdateMinimumStock", bulkUpdateMinimumStock)
registerTool("verifyProductUpdates", verifyProductUpdates)
