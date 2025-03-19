import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a Supabase client
export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseKey)
}

// Define types
export type Category = {
  id: string
  name: string
  created_at?: string
  updated_at?: string
}

export const createClientComponentClient = () => {
  return createClient()
}

export const createSupabaseDirectClient = () => {
  return createClient()
}

// Add or update these functions to ensure proper data fetching and updating

// Function to get all products
export async function getProducts() {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("products").select("*").order("name")

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching products:", error)
    throw error
  }
}

// Update the existing updateCategoryName function
export async function updateCategoryName(categoryId: string, name: string) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.from("categories").update({ name }).eq("id", categoryId).select().single()

    if (error) {
      console.error("Error updating category:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Exception in updateCategoryName:", error)
    throw error
  }
}

// Add this function to update existing products with random barcodes for testing
export async function generateTestBarcodes() {
  const supabase = createClient()

  // Get all products without barcodes
  const { data: products, error } = await supabase.from("products").select("id").is("barcode", null)

  if (error) {
    console.error("Error fetching products:", error)
    return
  }

  // Generate and update barcodes
  for (const product of products) {
    // Generate a random 13-digit EAN barcode
    const barcode = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join("")

    const { error: updateError } = await supabase.from("products").update({ barcode }).eq("id", product.id)

    if (updateError) {
      console.error(`Error updating barcode for product ${product.id}:`, updateError)
    }
  }

  console.log("Barcode generation complete")
}

// Update the existing addProduct function to include expiry_date and expiry_notification_days
export async function addProduct(productData: {
  name: string
  price: string
  barcode: string
  stock: string
  min_stock: string
  image?: string
  category_id?: string
  purchase_price?: string
  expiry_date?: string
  expiry_notification_days?: string
}) {
  const supabase = createClient()

  try {
    // Convert string values to appropriate types
    const formattedData = {
      name: productData.name,
      price: Number.parseFloat(productData.price) || 0,
      barcode: productData.barcode,
      stock: Number.parseInt(productData.stock) || 0,
      min_stock: Number.parseInt(productData.min_stock) || 0,
      image: productData.image || null,
      category_id: productData.category_id === "none" ? null : productData.category_id || null,
      purchase_price: productData.purchase_price ? Number.parseFloat(productData.purchase_price) : null,
      // Ensure expiry_date is properly formatted or null if empty
      expiry_date: productData.expiry_date && productData.expiry_date.trim() !== "" ? productData.expiry_date : null,
      expiry_notification_days: productData.expiry_notification_days
        ? Number.parseInt(productData.expiry_notification_days)
        : 30,
    }

    console.log("Adding product with data:", formattedData)

    const { data, error } = await supabase.from("products").insert(formattedData).select().single()

    if (error) {
      console.error("Database error adding product:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error adding product:", error)
    throw error
  }
}

// Find the updateProduct function and replace it with this version that includes more detailed logging
export async function updateProduct(
  id: string,
  productData: {
    name: string
    price: string
    barcode: string
    stock: string
    min_stock: string
    image?: string
    category_id?: string
    purchase_price?: string
    expiry_date?: string
    expiry_notification_days?: string
  },
) {
  const supabase = createClient()

  try {
    // Log the raw expiry_date value from the form
    console.log("Raw expiry_date from form:", productData.expiry_date)

    // Convert string values to appropriate types
    const formattedData = {
      name: productData.name,
      price: Number.parseFloat(productData.price) || 0,
      barcode: productData.barcode,
      stock: Number.parseInt(productData.stock) || 0,
      min_stock: Number.parseInt(productData.min_stock) || 0,
      image: productData.image || null,
      category_id: productData.category_id === "none" ? null : productData.category_id || null,
      purchase_price: productData.purchase_price ? Number.parseFloat(productData.purchase_price) : null,
      // Ensure expiry_date is properly formatted or null if empty
      expiry_date: productData.expiry_date && productData.expiry_date.trim() !== "" ? productData.expiry_date : null,
      expiry_notification_days: productData.expiry_notification_days
        ? Number.parseInt(productData.expiry_notification_days)
        : 30,
    }

    // Log the formatted expiry_date that will be sent to the database
    console.log("Formatted expiry_date for database:", formattedData.expiry_date)

    console.log("Updating product with data:", formattedData)

    // Log the actual SQL query that will be executed (as close as we can get)
    console.log(
      "Executing equivalent to: UPDATE products SET expiry_date = '" +
        formattedData.expiry_date +
        "' WHERE id = '" +
        id +
        "'",
    )

    const { data, error } = await supabase.from("products").update(formattedData).eq("id", id).select().single()

    if (error) {
      console.error("Database error updating product:", error)
      throw error
    }

    // Log the returned data from the database
    console.log("Updated product data returned from database:", data)
    console.log("Returned expiry_date from database:", data.expiry_date)

    return data
  } catch (error) {
    console.error("Error updating product:", error)
    throw error
  }
}

// Updated function to create a sale with direct stock management
export async function createSale(sale: any, saleItems: any[]) {
  const supabase = createClient()

  try {
    // Insert the sale
    const { data: saleData, error: saleError } = await supabase.from("sales").insert(sale).select().single()

    if (saleError) throw saleError

    // Add the sale_id to each sale item
    const itemsWithSaleId = saleItems.map((item) => ({
      ...item,
      sale_id: saleData.id,
    }))

    // Insert the sale items
    const { error: itemsError } = await supabase.from("sale_items").insert(itemsWithSaleId)

    if (itemsError) throw itemsError

    // Update product stock levels directly
    for (const item of saleItems) {
      // First get the current product to get its stock
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single()

      if (productError) throw productError

      // Calculate new stock level
      const previousStock = product?.stock || 0
      const newStock = Math.max(0, previousStock - item.quantity)

      // Update the product with the new stock level
      const { error: stockError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.product_id)

      if (stockError) throw stockError

      // Log the stock update
      console.log(`Updated product ${item.product_id} stock: ${previousStock} → ${newStock}`)
    }

    return { data: saleData, error: null }
  } catch (error) {
    console.error("Error creating sale:", error)
    return { data: null, error }
  }
}

// Function to update a sale and its items with proper stock management
export async function updateSale(saleId: string, saleData: any, saleItems: any[]) {
  const supabase = createClient()

  try {
    // Start by getting the current sale items to calculate stock adjustments
    const { data: currentItems, error: itemsError } = await supabase
      .from("sale_items")
      .select("id, product_id, quantity")
      .eq("sale_id", saleId)

    if (itemsError) throw itemsError

    // Create a map of current items for easy lookup
    const currentItemsMap = new Map()
    currentItems?.forEach((item) => {
      currentItemsMap.set(item.id, item)
    })

    // Create a map to track stock adjustments (positive means return to stock, negative means remove from stock)
    const stockAdjustments = new Map()

    // Process removed items (return stock)
    currentItems?.forEach((item) => {
      const stillExists = saleItems.some((newItem) => newItem.id && newItem.id === item.id)

      if (!stillExists) {
        // Item was removed, return stock
        const adjustment = stockAdjustments.get(item.product_id) || 0
        stockAdjustments.set(item.product_id, adjustment + item.quantity)
      }
    })

    // Process new and updated items
    saleItems.forEach((item) => {
      if (!item.id || item.id.startsWith("temp_")) {
        // New item, reduce stock
        const adjustment = stockAdjustments.get(item.product_id) || 0
        stockAdjustments.set(item.product_id, adjustment - item.quantity)
      } else {
        // Existing item, adjust stock based on quantity difference
        const currentItem = currentItemsMap.get(item.id)
        if (currentItem) {
          const quantityDiff = currentItem.quantity - item.quantity
          if (quantityDiff !== 0) {
            const adjustment = stockAdjustments.get(item.product_id) || 0
            stockAdjustments.set(item.product_id, adjustment + quantityDiff)
          }
        }
      }
    })

    // Update the sale
    const { error: updateSaleError } = await supabase.from("sales").update(saleData).eq("id", saleId)

    if (updateSaleError) throw updateSaleError

    // Delete all current sale items
    const { error: deleteItemsError } = await supabase.from("sale_items").delete().eq("sale_id", saleId)

    if (deleteItemsError) throw deleteItemsError

    // Insert new sale items
    const itemsWithSaleId = saleItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      sale_id: saleId,
    }))

    const { error: insertItemsError } = await supabase.from("sale_items").insert(itemsWithSaleId)

    if (insertItemsError) throw insertItemsError

    // Apply stock adjustments
    for (const [productId, adjustment] of stockAdjustments.entries()) {
      if (adjustment !== 0) {
        // Get current product stock
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("stock")
          .eq("id", productId)
          .single()

        if (productError) throw productError

        // Calculate new stock level (add adjustment - positive means return to stock)
        const newStock = Math.max(0, (productData?.stock || 0) + adjustment)

        // Update product stock
        const { error: updateError } = await supabase.from("products").update({ stock: newStock }).eq("id", productId)

        if (updateError) throw updateError

        console.log(
          `Updated product ${productId} stock: ${productData?.stock} → ${newStock} (adjustment: ${adjustment})`,
        )
      }
    }

    return { error: null }
  } catch (error) {
    console.error("Error updating sale:", error)
    return { error }
  }
}

// Function to get low stock products
export async function getLowStockProducts() {
  const supabase = createClient()

  try {
    // First, fetch all products
    const { data, error } = await supabase.from("products").select("*").order("stock")

    if (error) throw error

    // Then filter on the client side for products where stock < min_stock
    const lowStockProducts = data?.filter((product) => product.stock < product.min_stock) || []

    return lowStockProducts
  } catch (error) {
    console.error("Error fetching low stock products:", error)
    throw error
  }
}

// Function to get dashboard statistics
export async function getDashboardStats(dateRange?: { from: Date; to: Date }) {
  const supabase = createClient()

  try {
    // Format dates for query if provided
    const fromDate = dateRange?.from ? dateRange.from.toISOString().split("T")[0] : undefined
    const toDate = dateRange?.to ? `${dateRange.to.toISOString().split("T")[0]} 23:59:59` : undefined

    // Get sales stats
    let salesQuery = supabase.from("sales").select("*")
    if (fromDate) salesQuery = salesQuery.gte("created_at", fromDate)
    if (toDate) salesQuery = salesQuery.lte("created_at", toDate)
    const { data: salesData, error: salesError } = await salesQuery

    if (salesError) throw salesError

    // Get expense stats
    let expensesQuery = supabase.from("expenses").select("*")
    if (fromDate) expensesQuery = expensesQuery.gte("created_at", fromDate)
    if (toDate) expensesQuery = expensesQuery.lte("created_at", toDate)
    const { data: expensesData, error: expensesError } = await expensesQuery

    if (expensesError) throw expensesError

    // Get product stats
    const { data: productsData, error: productsError } = await supabase.from("products").select("*")

    if (productsError) throw productsError

    // Get low stock products
    const lowStockProducts = await getLowStockProducts()

    // Calculate statistics
    const totalSales = salesData ? salesData.reduce((sum, sale) => sum + (sale.total || 0), 0) : 0
    const totalExpenses = expensesData ? expensesData.reduce((sum, expense) => sum + (expense.amount || 0), 0) : 0
    const profit = totalSales - totalExpenses
    const totalProducts = productsData ? productsData.length : 0
    const lowStockCount = lowStockProducts ? lowStockProducts.length : 0
    const outOfStockCount = productsData ? productsData.filter((product) => product.stock === 0).length : 0

    // Get recent sales
    const recentSales = salesData
      ? [...salesData]
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 5)
      : []

    // Get recent expenses
    const recentExpenses = expensesData
      ? [...expensesData]
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 5)
      : []

    return {
      totalSales,
      totalExpenses,
      profit,
      salesCount: salesData ? salesData.length : 0,
      expensesCount: expensesData ? expensesData.length : 0,
      totalProducts,
      lowStockCount,
      outOfStockCount,
      recentSales,
      recentExpenses,
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    throw error
  }
}

// Category management functions
export async function getCategories() {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching categories:", error)
    throw error
  }
}

export async function addCategory(name: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("categories").insert({ name }).select().single()

    if (error) throw error

    return data
  } catch (error) {
    console.error("Error adding category:", error)
    throw error
  }
}

export async function updateCategory(id: string, name: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("categories").update({ name }).eq("id", id).select().single()

    if (error) throw error

    return data
  } catch (error) {
    console.error("Error updating category:", error)
    throw error
  }
}

export async function deleteCategory(id: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase.from("categories").delete().eq("id", id)

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error deleting category:", error)
    throw error
  }
}

// Function to delete a product
export async function deleteProduct(id: string) {
  const supabase = createClient()

  try {
    const { error } = await supabase.from("products").delete().eq("id", id)

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error deleting product:", error)
    throw error
  }
}

// Helper function to refresh settings
export async function refreshSettings(setSettings: any) {
  const supabase = createClient()
  try {
    // First try to get global settings
    let { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .eq("type", "global")
      .single()

    // If no global settings, try system settings
    if (settingsError || !settingsData) {
      const { data: systemData, error: systemError } = await supabase
        .from("settings")
        .select("*")
        .eq("type", "system")
        .single()

      if (!systemError && systemData) {
        settingsData = systemData
        settingsError = null
      }
    }

    if (!settingsError && settingsData) {
      console.log("Refreshed settings:", settingsData)

      // First check if settings.settings exists and has currency
      let currencyValue = "USD"
      let taxRateValue = 0

      if (settingsData.settings && typeof settingsData.settings === "object" && settingsData.settings !== null) {
        // Check for currency in settings.settings
        if ("currency" in settingsData.settings && typeof settingsData.settings.currency === "string") {
          currencyValue = settingsData.settings.currency
        }

        // Check for taxRate in settings.settings
        if ("taxRate" in settingsData.settings && typeof settingsData.settings.taxRate === "number") {
          taxRateValue = settingsData.settings.taxRate
        }
      }

      // Fallback to top-level currency field if it exists
      if (settingsData.currency && typeof settingsData.currency === "string") {
        currencyValue = settingsData.currency
      }

      // Fallback to top-level tax_rate field if it exists
      if (typeof settingsData.tax_rate === "number") {
        taxRateValue = settingsData.tax_rate
      }

      setSettings({
        id: settingsData.id,
        tax_rate: taxRateValue,
        store_name: settingsData.store_name || "My Store",
        currency: currencyValue,
      })
    }
  } catch (error) {
    console.error("Error refreshing settings:", error)
  }
}

// Function to get expiring products
export async function getExpiringProducts(daysThreshold = 30) {
  const supabase = createClient()

  try {
    // Get all products with expiry dates
    const { data, error } = await supabase.from("products").select("*").not("expiry_date", "is", null).gt("stock", 0) // Only include products with stock > 0

    if (error) throw error

    // Calculate the date threshold
    const today = new Date()
    const thresholdDate = new Date()
    thresholdDate.setDate(today.getDate() + daysThreshold)

    // Filter products that are expiring within the threshold
    const expiringProducts =
      data?.filter((product) => {
        if (!product.expiry_date) return false

        const expiryDate = new Date(product.expiry_date)
        const notificationDays = product.expiry_notification_days || daysThreshold

        // Calculate the notification date for this specific product
        const productThresholdDate = new Date()
        productThresholdDate.setDate(today.getDate() + notificationDays)

        return expiryDate <= productThresholdDate
      }) || []

    return expiringProducts
  } catch (error) {
    console.error("Error fetching expiring products:", error)
    throw error
  }
}

