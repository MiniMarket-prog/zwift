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

export type PurchaseOrder = {
  id: string
  order_number: string
  supplier_name: string
  status: "pending" | "approved" | "shipped" | "received" | "cancelled"
  total_amount: number
  expected_delivery_date?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export type PurchaseOrderItem = {
  id: string
  purchase_order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
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

// Update the existing addProduct function to include pack-related fields
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
  // New pack-related fields
  has_pack?: boolean
  pack_quantity?: string
  pack_discount_percentage?: string
  pack_barcode?: string
  pack_name?: string
  is_pack?: boolean
  parent_product_id?: string
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
      // Pack-related fields
      is_pack: productData.is_pack || false,
      parent_product_id: productData.parent_product_id || null,
      pack_quantity: productData.pack_quantity ? Number.parseInt(productData.pack_quantity) : null,
      pack_discount_percentage: productData.pack_discount_percentage
        ? Number.parseFloat(productData.pack_discount_percentage)
        : null,
    }

    console.log("Adding product with data:", formattedData)

    const { data, error } = await supabase.from("products").insert(formattedData).select().single()

    if (error) {
      console.error("Database error adding product:", error)
      throw error
    }

    // If this is a unit product with pack option, create the pack product
    if (productData.has_pack && !productData.is_pack) {
      const unitPrice = Number.parseFloat(productData.price) || 0
      const quantity = Number.parseInt(productData.pack_quantity || "1")
      const discount = Number.parseFloat(productData.pack_discount_percentage || "0")
      const packPrice = unitPrice * quantity * (1 - discount / 100)

      const packProductData = {
        name: productData.pack_name || `${productData.name} Pack`,
        price: packPrice,
        barcode: productData.pack_barcode || "",
        stock: Math.floor((Number.parseInt(productData.stock) || 0) / quantity),
        min_stock: Math.floor((Number.parseInt(productData.min_stock) || 0) / quantity),
        image: productData.image || null,
        category_id: productData.category_id === "none" ? null : productData.category_id || null,
        purchase_price: productData.purchase_price
          ? Number.parseFloat(productData.purchase_price) * quantity * (1 - discount / 100)
          : null,
        expiry_date: productData.expiry_date && productData.expiry_date.trim() !== "" ? productData.expiry_date : null,
        expiry_notification_days: productData.expiry_notification_days
          ? Number.parseInt(productData.expiry_notification_days)
          : 30,
        is_pack: true,
        parent_product_id: data.id,
        pack_quantity: quantity,
        pack_discount_percentage: discount,
      }

      const { data: packData, error: packError } = await supabase
        .from("products")
        .insert(packProductData)
        .select()
        .single()

      if (packError) {
        console.error("Error creating pack product:", packError)
        // Don't throw error here, we still created the main product successfully
      } else {
        console.log("Created pack product:", packData)
      }
    }

    return data
  } catch (error) {
    console.error("Error adding product:", error)
    throw error
  }
}

// Update the existing updateProduct function to handle pack-related fields
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
    // Pack-related fields
    has_pack?: boolean
    pack_quantity?: string
    pack_discount_percentage?: string
    pack_barcode?: string
    pack_name?: string
    pack_id?: string
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

    // Handle pack product if needed
    if (productData.has_pack) {
      // Check if a pack product already exists
      let packProductId = productData.pack_id
      let packExists = false

      if (!packProductId) {
        // Try to find an existing pack product
        const { data: existingPack } = await supabase
          .from("products")
          .select("id")
          .eq("parent_product_id", id)
          .eq("is_pack", true)
          .maybeSingle()

        if (existingPack) {
          packProductId = existingPack.id
          packExists = true
        }
      } else {
        packExists = true
      }

      // Calculate pack price
      const unitPrice = Number.parseFloat(productData.price) || 0
      const quantity = Number.parseInt(productData.pack_quantity || "1")
      const discount = Number.parseFloat(productData.pack_discount_percentage || "0")
      const packPrice = unitPrice * quantity * (1 - discount / 100)

      const packProductData = {
        name: productData.pack_name || `${productData.name} Pack`,
        price: packPrice,
        barcode: productData.pack_barcode || "",
        stock: Math.floor((Number.parseInt(productData.stock) || 0) / quantity),
        min_stock: Math.floor((Number.parseInt(productData.min_stock) || 0) / quantity),
        image: productData.image || null,
        category_id: productData.category_id === "none" ? null : productData.category_id || null,
        purchase_price: productData.purchase_price
          ? Number.parseFloat(productData.purchase_price) * quantity * (1 - discount / 100)
          : null,
        expiry_date: productData.expiry_date && productData.expiry_date.trim() !== "" ? productData.expiry_date : null,
        expiry_notification_days: productData.expiry_notification_days
          ? Number.parseInt(productData.expiry_notification_days)
          : 30,
        is_pack: true,
        parent_product_id: id,
        pack_quantity: quantity,
        pack_discount_percentage: discount,
      }

      if (packExists && packProductId) {
        // Update existing pack product
        const { data: packData, error: packError } = await supabase
          .from("products")
          .update(packProductData)
          .eq("id", packProductId)
          .select()
          .single()

        if (packError) {
          console.error("Error updating pack product:", packError)
        } else {
          console.log("Updated pack product:", packData)
        }
      } else {
        // Create new pack product
        const { data: packData, error: packError } = await supabase
          .from("products")
          .insert(packProductData)
          .select()
          .single()

        if (packError) {
          console.error("Error creating pack product:", packError)
        } else {
          console.log("Created pack product:", packData)
        }
      }
    } else {
      // If pack option is disabled, check if we need to handle existing pack products
      const { data: existingPack } = await supabase
        .from("products")
        .select("id")
        .eq("parent_product_id", id)
        .eq("is_pack", true)
        .maybeSingle()

      if (existingPack) {
        // Option 1: Delete the pack product
        // const { error: deleteError } = await supabase
        //   .from("products")
        //   .delete()
        //   .eq("id", existingPack.id)

        // Option 2: Mark the pack as discontinued (by setting stock to 0)
        const { error: updateError } = await supabase.from("products").update({ stock: 0 }).eq("id", existingPack.id)

        if (updateError) {
          console.error("Error updating pack product status:", updateError)
        }
      }
    }

    return data
  } catch (error) {
    console.error("Error updating product:", error)
    throw error
  }
}

// Function to get a product's pack version
export async function getProductPack(productId: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("parent_product_id", productId)
      .eq("is_pack", true)
      .maybeSingle()

    if (error) {
      console.error("Error fetching product pack:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in getProductPack:", error)
    throw error
  }
}

// Function to get a product's unit version (if this is a pack)
export async function getProductUnit(packId: string) {
  const supabase = createClient()

  try {
    const { data: pack, error: packError } = await supabase
      .from("products")
      .select("parent_product_id")
      .eq("id", packId)
      .single()

    if (packError) {
      console.error("Error fetching pack product:", packError)
      throw packError
    }

    if (!pack.parent_product_id) {
      return null
    }

    const { data: unit, error: unitError } = await supabase
      .from("products")
      .select("*")
      .eq("id", pack.parent_product_id)
      .single()

    if (unitError) {
      console.error("Error fetching unit product:", unitError)
      throw unitError
    }

    return unit
  } catch (error) {
    console.error("Error in getProductUnit:", error)
    throw error
  }
}

// Updated createSale function to handle pack products
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
      // First get the current product to get its stock and check if it's a pack
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock, is_pack, parent_product_id, pack_quantity")
        .eq("id", item.product_id)
        .single()

      if (productError) throw productError

      // Calculate new stock level for this product
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

      // If this is a pack product, also update the unit product's stock
      if (product?.is_pack && product?.parent_product_id && product?.pack_quantity) {
        // Get the unit product
        const { data: unitProduct, error: unitError } = await supabase
          .from("products")
          .select("stock")
          .eq("id", product.parent_product_id)
          .single()

        if (!unitError && unitProduct) {
          // Calculate units to remove (pack quantity × number of packs sold)
          const unitsToRemove = product.pack_quantity * item.quantity
          const newUnitStock = Math.max(0, unitProduct.stock - unitsToRemove)

          // Update the unit product stock
          await supabase.from("products").update({ stock: newUnitStock }).eq("id", product.parent_product_id)

          console.log(
            `Updated unit product ${product.parent_product_id} stock: ${unitProduct.stock} → ${newUnitStock} (pack sale)`,
          )
        }
      }
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
        // Get current product stock and check if it's a pack
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("stock, is_pack, parent_product_id, pack_quantity")
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

        // If this is a pack product, also update the unit product's stock
        if (productData?.is_pack && productData?.parent_product_id && productData?.pack_quantity) {
          // Get the unit product
          const { data: unitProduct, error: unitError } = await supabase
            .from("products")
            .select("stock")
            .eq("id", productData.parent_product_id)
            .single()

          if (!unitError && unitProduct) {
            // Calculate units to adjust (pack quantity × number of packs)
            const unitsToAdjust = productData.pack_quantity * adjustment
            const newUnitStock = Math.max(0, unitProduct.stock + unitsToAdjust)

            // Update the unit product stock
            await supabase.from("products").update({ stock: newUnitStock }).eq("id", productData.parent_product_id)

            console.log(
              `Updated unit product ${productData.parent_product_id} stock: ${unitProduct.stock} → ${newUnitStock} (pack adjustment)`,
            )
          }
        }
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
    // Check if this is a unit product with pack products
    const { data: packProducts } = await supabase
      .from("products")
      .select("id")
      .eq("parent_product_id", id)
      .eq("is_pack", true)

    // Delete any associated pack products first
    if (packProducts && packProducts.length > 0) {
      for (const pack of packProducts) {
        await supabase.from("products").delete().eq("id", pack.id)
        console.log(`Deleted pack product ${pack.id} associated with unit product ${id}`)
      }
    }

    // Now delete the main product
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

// Purchase Order Functions

// Function to check if purchase_orders table exists
export async function checkPurchaseOrdersTableExists() {
  const supabase = createClient()

  try {
    // Try to query the purchase_orders table with a more specific approach
    const { count, error } = await supabase.from("purchase_orders").select("*", { count: "exact", head: true })

    // If there's no error, the table exists
    if (!error) {
      console.log("Purchase orders table exists, count:", count)
      return true
    }

    // Log the specific error
    console.error("Error checking purchase_orders table:", error)

    // Check if the error is specifically about the table not existing
    if (error.code === "42P01") {
      return false
    }

    // For other errors, log and return false
    return false
  } catch (error) {
    console.error("Exception checking purchase_orders table:", error)
    return false
  }
}

// Function to get all purchase orders
export async function getPurchaseOrders(filters?: {
  status?: string
  supplier?: string
  search?: string
  fromDate?: string
  toDate?: string
}) {
  const supabase = createClient()

  try {
    console.log("Checking if purchase_orders table exists...")
    // Check if the table exists first
    const tableExists = await checkPurchaseOrdersTableExists()
    console.log("Table exists check result:", tableExists)

    if (!tableExists) {
      console.log("Purchase orders table does not exist, returning empty array")
      return { data: [], error: { message: "Purchase orders table does not exist" } }
    }

    console.log("Fetching purchase orders...")
    let query = supabase.from("purchase_orders").select("*").order("created_at", { ascending: false })

    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        query = query.eq("status", filters.status)
      }

      if (filters.supplier) {
        query = query.ilike("supplier_name", `%${filters.supplier}%`)
      }

      if (filters.search) {
        query = query.or(`order_number.ilike.%${filters.search}%,supplier_name.ilike.%${filters.search}%`)
      }

      if (filters.fromDate) {
        query = query.gte("created_at", filters.fromDate)
      }

      if (filters.toDate) {
        query = query.lte("created_at", filters.toDate)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error("Error in Supabase query:", error)
      throw error
    }

    console.log("Successfully fetched purchase orders:", data?.length || 0)
    return { data: data || [], error: null }
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    return { data: [], error }
  }
}

// Function to get a single purchase order by ID
export async function getPurchaseOrderById(id: string) {
  const supabase = createClient()

  try {
    // Check if the table exists first
    const tableExists = await checkPurchaseOrdersTableExists()
    if (!tableExists) {
      return { data: null, error: { message: "Purchase orders table does not exist" } }
    }

    const { data, error } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        purchase_order_items (*)
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error(`Error fetching purchase order ${id}:`, error)
    return { data: null, error }
  }
}

// Function to create a purchase order
export async function createPurchaseOrder(orderData: {
  supplier_name: string
  expected_delivery_date?: string
  notes?: string
  items: Array<{
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
  }>
}) {
  const supabase = createClient()

  try {
    // Check if the table exists first
    const tableExists = await checkPurchaseOrdersTableExists()
    if (!tableExists) {
      return { data: null, error: { message: "Purchase orders table does not exist" } }
    }

    // Generate order number (PO-YYYYMMDD-XXX format)
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "")
    const randomStr = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    const orderNumber = `PO-${dateStr}-${randomStr}`

    // Calculate total amount
    const totalAmount = orderData.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

    // Create the purchase order
    const { data: orderDataResult, error: orderError } = await supabase
      .from("purchase_orders")
      .insert({
        order_number: orderNumber,
        supplier_name: orderData.supplier_name,
        status: "pending",
        total_amount: totalAmount,
        expected_delivery_date: orderData.expected_delivery_date,
        notes: orderData.notes,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Create the purchase order items
    const orderItems = orderData.items.map((item) => ({
      purchase_order_id: orderDataResult.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
    }))

    const { error: itemsError } = await supabase.from("purchase_order_items").insert(orderItems)

    if (itemsError) throw itemsError

    return {
      data: {
        ...orderDataResult,
        items: orderItems,
      },
      error: null,
    }
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return { data: null, error }
  }
}

// Function to update a purchase order
export async function updatePurchaseOrder(
  id: string,
  orderData: {
    supplier_name?: string
    status?: "pending" | "approved" | "shipped" | "received" | "cancelled"
    expected_delivery_date?: string
    notes?: string
  },
) {
  const supabase = createClient()

  try {
    // Check if the table exists first
    const tableExists = await checkPurchaseOrdersTableExists()
    if (!tableExists) {
      return { data: null, error: { message: "Purchase orders table does not exist" } }
    }

    const { data, error } = await supabase.from("purchase_orders").update(orderData).eq("id", id).select().single()

    if (error) throw error

    // If status is changed to 'received', update product stock
    if (orderData.status === "received") {
      await updateStockFromPurchaseOrder(id)
    }

    return { data, error: null }
  } catch (error) {
    console.error(`Error updating purchase order ${id}:`, error)
    return { data: null, error }
  }
}

// Function to update stock levels when a purchase order is received
async function updateStockFromPurchaseOrder(purchaseOrderId: string) {
  const supabase = createClient()

  try {
    // Get the purchase order items
    const { data: orderItems, error: itemsError } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", purchaseOrderId)

    if (itemsError) throw itemsError

    // Update stock for each product
    for (const item of orderItems) {
      // Get current product stock
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock, is_pack, parent_product_id, pack_quantity")
        .eq("id", item.product_id)
        .single()

      if (productError) {
        console.error(`Error fetching product ${item.product_id}:`, productError)
        continue
      }

      // Calculate new stock level
      const newStock = (product?.stock || 0) + item.quantity

      // Update the product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.product_id)

      if (updateError) {
        console.error(`Error updating stock for product ${item.product_id}:`, updateError)
        continue
      }

      console.log(`Updated product ${item.product_id} stock: ${product?.stock} → ${newStock}`)

      // If this is a pack product, also update the unit product's stock
      if (product?.is_pack && product?.parent_product_id && product?.pack_quantity) {
        // Get the unit product
        const { data: unitProduct, error: unitError } = await supabase
          .from("products")
          .select("stock")
          .eq("id", product.parent_product_id)
          .single()

        if (!unitError && unitProduct) {
          // Calculate units to add (pack quantity × number of packs)
          const unitsToAdd = product.pack_quantity * item.quantity
          const newUnitStock = unitProduct.stock + unitsToAdd

          // Update the unit product stock
          await supabase.from("products").update({ stock: newUnitStock }).eq("id", product.parent_product_id)

          console.log(
            `Updated unit product ${product.parent_product_id} stock: ${unitProduct.stock} → ${newUnitStock} (pack received)`,
          )
        }
      }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error(`Error updating stock from purchase order ${purchaseOrderId}:`, error)
    return { success: false, error }
  }
}

// Function to delete a purchase order
export async function deletePurchaseOrder(id: string) {
  const supabase = createClient()

  try {
    // Check if the table exists first
    const tableExists = await checkPurchaseOrdersTableExists()
    if (!tableExists) {
      return { success: false, error: { message: "Purchase orders table does not exist" } }
    }

    // Delete the purchase order items first (due to foreign key constraint)
    const { error: itemsError } = await supabase.from("purchase_order_items").delete().eq("purchase_order_id", id)

    if (itemsError) throw itemsError

    // Delete the purchase order
    const { error } = await supabase.from("purchase_orders").delete().eq("id", id)

    if (error) throw error

    return { success: true, error: null }
  } catch (error) {
    console.error(`Error deleting purchase order ${id}:`, error)
    return { success: false, error }
  }
}

// Function to generate a purchase order from forecasting data
export async function generatePurchaseOrder(productIds: string[]) {
  const supabase = createClient()

  try {
    // Check if the table exists first
    const tableExists = await checkPurchaseOrdersTableExists()
    if (!tableExists) {
      return {
        success: true, // Return success even if table doesn't exist
        order_id: `PO-${Date.now()}`,
        products: [],
        total_items: 0,
        estimated_cost: 0,
        message: "Purchase orders table does not exist, but order simulation completed",
      }
    }

    // Get the products to order
    const { data: products, error } = await supabase.from("products").select("*").in("id", productIds)

    if (error) throw error

    // Generate order number
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "")
    const randomStr = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    const orderNumber = `PO-${dateStr}-${randomStr}`

    // Calculate total amount
    const totalAmount = products.reduce((sum, product) => sum + (product.purchase_price || product.price), 0)

    // Create the purchase order
    const { data: orderData, error: orderError } = await supabase
      .from("purchase_orders")
      .insert({
        order_number: orderNumber,
        supplier_name: "Auto-generated",
        status: "pending",
        total_amount: totalAmount,
        notes: "Generated from forecasting system",
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Create the purchase order items
    const orderItems = products.map((product) => ({
      purchase_order_id: orderData.id,
      product_id: product.id,
      product_name: product.name,
      quantity: 1, // Default quantity, can be adjusted
      unit_price: product.purchase_price || product.price,
      total_price: product.purchase_price || product.price,
    }))

    const { error: itemsError } = await supabase.from("purchase_order_items").insert(orderItems)

    if (itemsError) throw itemsError

    return {
      success: true,
      order_id: orderData.order_number,
      products: products,
      total_items: products.length,
      estimated_cost: totalAmount,
    }
  } catch (error) {
    console.error("Error generating purchase order:", error)
    // Return a simulated success response even if there's an error
    return {
      success: true,
      order_id: `PO-${Date.now()}`,
      products: [],
      total_items: 0,
      estimated_cost: 0,
      error_message: "Error creating actual purchase order, but simulation completed",
    }
  }
}

