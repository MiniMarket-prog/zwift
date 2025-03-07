import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

// Create a single supabase client for the entire app
export const supabase = createClientComponentClient<Database>()

// Define a type for form data (string values from inputs)
type ProductFormData = {
  name: string
  price: string
  barcode: string
  stock: string
  min_stock: string
  purchase_price?: string | null
  category_id?: string | null
  image?: string | null
}

// Get all products with optional search
export async function getProducts(searchTerm = "", productId?: string) {
  try {
    let query = supabase.from("products").select("*")

    if (productId) {
      // If productId is provided, fetch that specific product
      query = query.eq("id", productId)
    } else if (searchTerm) {
      // Otherwise use the search term if provided
      query = query.or(`name.ilike.%${searchTerm}%,barcode.eq.${searchTerm}`)
    }

    const { data, error } = await query.order("name")

    if (error) throw error

    // If productId was provided, return the first item or null
    if (productId && data && data.length > 0) {
      return data[0]
    }

    return data || []
  } catch (error) {
    console.error("Error fetching products:", error)
    throw error
  }
}

// Add a new product
export async function addProduct(productForm: ProductFormData) {
  try {
    // Convert string values to numbers where needed
    const formattedProduct = {
      name: productForm.name,
      price: Number.parseFloat(productForm.price),
      barcode: productForm.barcode,
      stock: Number.parseInt(productForm.stock),
      min_stock: productForm.min_stock ? Number.parseInt(productForm.min_stock) : 0, // Default to 0 if not provided
      category_id: productForm.category_id || null,
      image: productForm.image || null,
      purchase_price: productForm.purchase_price ? Number.parseFloat(productForm.purchase_price) : null,
    }

    const { data, error } = await supabase.from("products").insert(formattedProduct).select()

    if (error) throw error

    return data
  } catch (error) {
    console.error("Error adding product:", error)
    throw error
  }
}

// Update an existing product
export async function updateProduct(id: string, productForm: ProductFormData) {
  try {
    // Convert string values to numbers where needed
    const formattedProduct = {
      name: productForm.name,
      price: Number.parseFloat(productForm.price),
      barcode: productForm.barcode,
      stock: Number.parseInt(productForm.stock),
      min_stock: productForm.min_stock ? Number.parseInt(productForm.min_stock) : 0, // Default to 0 if not provided
      category_id: productForm.category_id || null,
      image: productForm.image || null,
      purchase_price: productForm.purchase_price ? Number.parseFloat(productForm.purchase_price) : null,
    }

    const { data, error } = await supabase.from("products").update(formattedProduct).eq("id", id).select()

    if (error) throw error

    return data
  } catch (error) {
    console.error("Error updating product:", error)
    throw error
  }
}

// Delete a product
export async function deleteProduct(id: string) {
  try {
    const { error } = await supabase.from("products").delete().eq("id", id)

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error deleting product:", error)
    throw error
  }
}

// Get low stock products
export async function getLowStockProducts() {
  try {
    // First, get products that have a min_stock value set
    const { data, error } = await supabase.from("products").select("*")

    if (error) throw error

    // Then filter locally for products where stock is less than min_stock
    const lowStock = data?.filter((product) => product.stock < product.min_stock) || []

    return lowStock
  } catch (error) {
    console.error("Error fetching low stock products:", error)
    throw error
  }
}

// Get categories
export async function getCategories() {
  try {
    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching categories:", error)
    throw error
  }
}

export async function createSale(sale: any, saleItems: any[]) {
  try {
    // Insert the sale
    const { data: saleData, error: saleError } = await supabase.from("sales").insert(sale).select().single()

    if (saleError) throw saleError

    // Add sale_id to each item
    const itemsWithSaleId = saleItems.map((item) => ({
      ...item,
      sale_id: saleData.id,
    }))

    // Insert the sale items
    const { error: itemsError } = await supabase.from("sale_items").insert(itemsWithSaleId)

    if (itemsError) throw itemsError

    // Update product stock
    for (const item of saleItems) {
      // Update product stock directly instead of using RPC
      const { data: product } = await supabase.from("products").select("stock").eq("id", item.product_id).single()

      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity)

        const { error: updateError } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", item.product_id)

        if (updateError) throw updateError
      }
    }

    return { data: saleData, error: null }
  } catch (error) {
    console.error("Error creating sale:", error)
    return { data: null, error }
  }
}

// Get a specific sale with its items
export async function getSale(saleId: string) {
  try {
    // Get the sale
    const { data: sale, error: saleError } = await supabase.from("sales").select("*").eq("id", saleId).single()

    if (saleError) throw saleError

    // Get the sale items
    const { data: items, error: itemsError } = await supabase.from("sale_items").select("*").eq("sale_id", saleId)

    if (itemsError) throw itemsError

    return { sale, items }
  } catch (error) {
    console.error("Error fetching sale:", error)
    throw error
  }
}

// Update an existing sale
export async function updateSale(saleId: string, sale: any, saleItems: any[]) {
  try {
    // Update the sale
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .update({
        total: sale.total,
        tax: sale.tax,
        payment_method: sale.payment_method,
      })
      .eq("id", saleId)
      .select()

    if (saleError) throw saleError

    // Delete existing sale items
    const { error: deleteError } = await supabase.from("sale_items").delete().eq("sale_id", saleId)

    if (deleteError) throw deleteError

    // Add sale_id to each item
    const itemsWithSaleId = saleItems.map((item) => ({
      ...item,
      sale_id: saleId,
    }))

    // Insert the new sale items
    const { error: itemsError } = await supabase.from("sale_items").insert(itemsWithSaleId)

    if (itemsError) throw itemsError

    // Update product stock for each item
    for (const item of saleItems) {
      // Get current product stock
      const { data: product } = await supabase.from("products").select("stock").eq("id", item.product_id).single()

      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity)

        const { error: updateError } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", item.product_id)

        if (updateError) throw updateError
      }
    }

    return { data: saleData, error: null }
  } catch (error) {
    console.error("Error updating sale:", error)
    return { data: null, error }
  }
}

