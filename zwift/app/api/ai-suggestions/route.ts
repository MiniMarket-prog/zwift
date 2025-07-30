import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-client"

interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  category: string
}

interface AISuggestion {
  type: "bundle" | "upsell" | "discount" | "reorder" | "alternative"
  title: string
  description: string
  products?: any[]
  confidence: number
  potentialRevenue?: number
  action?: string
}

export async function POST(request: NextRequest) {
  try {
    const { cartItems, recentSales, timeOfDay } = await request.json()
    const supabase = createClient()
    const suggestions: AISuggestion[] = []

    // Get real product data for analysis
    const { data: allProducts, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, stock, category_id, purchase_price")
      .gt("stock", 0)
      .limit(50)

    if (productsError) {
      console.error("Error fetching products:", productsError)
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
    }

    // Get categories for better suggestions
    const { data: categories, error: categoriesError } = await supabase.from("categories").select("id, name")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
    }

    const categoryMap = new Map(categories?.map((cat) => [cat.id, cat.name]) || [])

    // Analyze cart contents for intelligent suggestions
    const cartProductIds = cartItems.map((item: CartItem) => item.product_id)
    const cartCategories = [...new Set(cartItems.map((item: CartItem) => item.category))]
    const cartTotal = cartItems.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)

    // 1. Bundle Suggestions - Find products frequently bought together
    if (recentSales && recentSales.length > 0) {
      const bundleAnalysis = new Map<string, { count: number; products: Set<string> }>()

      recentSales.forEach((sale: any) => {
        if (sale.items && sale.items.length > 1) {
          sale.items.forEach((item: any) => {
            const productId = item.product_id
            if (!bundleAnalysis.has(productId)) {
              bundleAnalysis.set(productId, { count: 0, products: new Set() })
            }

            sale.items.forEach((otherItem: any) => {
              if (otherItem.product_id !== productId) {
                bundleAnalysis.get(productId)?.products.add(otherItem.product_id)
              }
            })
            bundleAnalysis.get(productId)!.count++
          })
        }
      })

      // Find bundle suggestions for current cart items
      cartItems.forEach((cartItem: CartItem) => {
        const bundleData = bundleAnalysis.get(cartItem.product_id)
        if (bundleData && bundleData.products.size > 0) {
          const suggestedProducts = allProducts
            ?.filter((product) => bundleData.products.has(product.id) && !cartProductIds.includes(product.id))
            .slice(0, 2)

          if (suggestedProducts && suggestedProducts.length > 0) {
            const potentialRevenue = suggestedProducts.reduce((sum, p) => sum + p.price, 0)
            suggestions.push({
              type: "bundle",
              title: "Frequently Bought Together",
              description: `Customers who bought ${cartItem.name} also bought these items`,
              products: suggestedProducts,
              confidence: Math.min(0.9, (bundleData.count / recentSales.length) * 2),
              potentialRevenue,
            })
          }
        }
      })
    }

    // 2. Category-based suggestions
    if (cartCategories.length > 0) {
      const categoryProducts = allProducts
        ?.filter((product) => cartCategories.includes(product.category_id) && !cartProductIds.includes(product.id))
        .slice(0, 3)

      if (categoryProducts && categoryProducts.length > 0) {
        const categoryName = categoryMap.get(cartCategories[0]) || "similar"
        suggestions.push({
          type: "upsell",
          title: `More ${categoryName} Items`,
          description: `Complete your ${categoryName.toLowerCase()} selection`,
          products: categoryProducts,
          confidence: 0.75,
          potentialRevenue: categoryProducts.reduce((sum, p) => sum + p.price, 0),
        })
      }
    }

    // 3. Price-based upselling suggestions
    const avgCartItemPrice = cartTotal / cartItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)
    const upsellProducts = allProducts
      ?.filter(
        (product) =>
          product.price > avgCartItemPrice &&
          product.price < avgCartItemPrice * 1.5 &&
          !cartProductIds.includes(product.id),
      )
      .slice(0, 2)

    if (upsellProducts && upsellProducts.length > 0) {
      suggestions.push({
        type: "upsell",
        title: "Premium Alternatives",
        description: "Upgrade to these premium options",
        products: upsellProducts,
        confidence: 0.7,
        potentialRevenue: upsellProducts.reduce((sum, p) => sum + p.price, 0),
      })
    }

    // 4. Time-based suggestions
    const currentHour = timeOfDay || new Date().getHours()
    let timeBasedProducts: any[] = []

    if (currentHour >= 6 && currentHour <= 10) {
      // Morning suggestions - breakfast items
      timeBasedProducts =
        allProducts
          ?.filter(
            (product) =>
              product.name.toLowerCase().includes("coffee") ||
              product.name.toLowerCase().includes("breakfast") ||
              product.name.toLowerCase().includes("juice") ||
              product.name.toLowerCase().includes("bagel"),
          )
          .slice(0, 2) || []
    } else if (currentHour >= 11 && currentHour <= 14) {
      // Lunch suggestions
      timeBasedProducts =
        allProducts
          ?.filter(
            (product) =>
              product.name.toLowerCase().includes("sandwich") ||
              product.name.toLowerCase().includes("salad") ||
              product.name.toLowerCase().includes("soup") ||
              product.name.toLowerCase().includes("drink"),
          )
          .slice(0, 2) || []
    } else if (currentHour >= 15 && currentHour <= 18) {
      // Afternoon snack suggestions
      timeBasedProducts =
        allProducts
          ?.filter(
            (product) =>
              product.name.toLowerCase().includes("snack") ||
              product.name.toLowerCase().includes("chip") ||
              product.name.toLowerCase().includes("cookie") ||
              product.name.toLowerCase().includes("energy"),
          )
          .slice(0, 2) || []
    }

    if (timeBasedProducts.length > 0) {
      const timeOfDayLabel = currentHour <= 10 ? "morning" : currentHour <= 14 ? "lunch" : "afternoon"
      suggestions.push({
        type: "bundle",
        title: `Perfect for ${timeOfDayLabel}`,
        description: `Popular ${timeOfDayLabel} items`,
        products: timeBasedProducts,
        confidence: 0.8,
        potentialRevenue: timeBasedProducts.reduce((sum, p) => sum + p.price, 0),
      })
    }

    // 5. Bulk discount suggestions
    if (cartItems.length >= 3) {
      suggestions.push({
        type: "discount",
        title: "Bulk Purchase Discount",
        description: "Apply 10% discount for 3+ items",
        confidence: 0.9,
        potentialRevenue: -cartTotal * 0.1,
        action: "apply_bulk_discount",
      })
    }

    // 6. Low stock urgency suggestions
    const lowStockProducts = allProducts
      ?.filter((product) => product.stock <= 5 && product.stock > 0 && !cartProductIds.includes(product.id))
      .slice(0, 2)

    if (lowStockProducts && lowStockProducts.length > 0) {
      suggestions.push({
        type: "alternative",
        title: "Limited Stock Alert",
        description: "These popular items are running low",
        products: lowStockProducts,
        confidence: 0.85,
        potentialRevenue: lowStockProducts.reduce((sum, p) => sum + p.price, 0),
      })
    }

    // 7. High-margin product suggestions (for store profitability)
    const highMarginProducts = allProducts
      ?.filter((product) => {
        if (!product.purchase_price) return false
        const margin = (product.price - product.purchase_price) / product.price
        return margin > 0.5 && !cartProductIds.includes(product.id)
      })
      .slice(0, 2)

    if (highMarginProducts && highMarginProducts.length > 0) {
      suggestions.push({
        type: "upsell",
        title: "Staff Picks",
        description: "Highly recommended by our team",
        products: highMarginProducts,
        confidence: 0.7,
        potentialRevenue: highMarginProducts.reduce((sum, p) => sum + p.price, 0),
      })
    }

    // 8. Reorder suggestions based on recent sales patterns
    if (recentSales && recentSales.length > 0) {
      const productFrequency = new Map<string, number>()

      recentSales.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
          const count = productFrequency.get(item.product_id) || 0
          productFrequency.set(item.product_id, count + item.quantity)
        })
      })

      const popularProducts = allProducts
        ?.filter((product) => {
          const frequency = productFrequency.get(product.id) || 0
          return frequency > 0 && !cartProductIds.includes(product.id)
        })
        .sort((a, b) => (productFrequency.get(b.id) || 0) - (productFrequency.get(a.id) || 0))
        .slice(0, 3)

      if (popularProducts && popularProducts.length > 0) {
        suggestions.push({
          type: "reorder",
          title: "Popular Right Now",
          description: "Trending items based on recent sales",
          products: popularProducts,
          confidence: 0.8,
          potentialRevenue: popularProducts.reduce((sum, p) => sum + p.price, 0),
        })
      }
    }

    // Sort suggestions by confidence and potential revenue
    const sortedSuggestions = suggestions
      .sort((a, b) => {
        const scoreA = a.confidence * 0.7 + ((a.potentialRevenue || 0) * 0.3) / 100
        const scoreB = b.confidence * 0.7 + ((b.potentialRevenue || 0) * 0.3) / 100
        return scoreB - scoreA
      })
      .slice(0, 5) // Limit to top 5 suggestions

    return NextResponse.json(sortedSuggestions)
  } catch (error) {
    console.error("AI suggestions error:", error)
    return NextResponse.json({ error: "Suggestions failed" }, { status: 500 })
  }
}
