// Define the Product type to match what's used in the POS page
type Product = {
    id: string
    name: string
    price: number
    barcode: string
    stock: number
    min_stock: number
    category_id?: string | null
    image?: string | null
    purchase_price?: number | null
    expiry_date?: string | null
    expiry_notification_days?: number | null
  }
  
  /**
   * Processes an array of products to ensure consistent data structure
   * Filters out null values and ensures all required fields are present
   */
  export function processProductsArray(products: any[]): Product[] {
    if (!Array.isArray(products)) {
      console.error("Expected products to be an array, got:", typeof products)
      return []
    }
  
    // Filter out null values and process each product
    return products
      .filter((product) => product !== null)
      .map((product) => formatProductForDisplay(product))
      .filter((product): product is Product => product !== null) // Type guard to ensure no nulls
  }
  
  /**
   * Formats a single product with default values for missing fields
   */
  export function formatProductForDisplay(product: any): Product | null {
    if (!product || typeof product !== "object") {
      console.warn("Invalid product data:", product)
      return null
    }
  
    try {
      // Ensure all required fields have valid values
      return {
        id: product.id?.toString() || "",
        name: product.name?.toString() || "Unnamed Product",
        price: typeof product.price === "number" ? product.price : Number.parseFloat(product.price) || 0,
        barcode: product.barcode?.toString() || "",
        stock: typeof product.stock === "number" ? product.stock : Number.parseInt(product.stock, 10) || 0,
        min_stock:
          typeof product.min_stock === "number" ? product.min_stock : Number.parseInt(product.min_stock, 10) || 0,
        category_id: product.category_id || null,
        image: product.image || null,
        purchase_price:
          typeof product.purchase_price === "number"
            ? product.purchase_price
            : Number.parseFloat(product.purchase_price) || null,
        expiry_date: product.expiry_date || null,
        expiry_notification_days:
          typeof product.expiry_notification_days === "number"
            ? product.expiry_notification_days
            : Number.parseInt(product.expiry_notification_days, 10) || null,
      }
    } catch (error) {
      console.error("Error formatting product:", error, product)
      return null
    }
  }
  
  