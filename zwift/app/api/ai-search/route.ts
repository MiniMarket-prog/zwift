import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-client"

export async function POST(request: NextRequest) {
  try {
    const { query, context } = await request.json()
    const supabase = createClient()

    // AI-powered fuzzy search logic with real database data
    const searchTerms = query.toLowerCase().split(" ")

    // Build dynamic search query for Supabase
    let supabaseQuery = supabase
      .from("products")
      .select("id, name, price, stock, category_id, image, purchase_price")
      .gt("stock", 0) // Only show products in stock
      .limit(20)

    // Create search conditions for name, barcode, and category
    const searchConditions = searchTerms.map((term: string) => `name.ilike.%${term}%,barcode.ilike.%${term}%`).join(",")

    // Apply search filter
    if (searchConditions) {
      supabaseQuery = supabaseQuery.or(searchConditions)
    }

    const { data: products, error } = await supabaseQuery

    if (error) {
      console.error("Database search error:", error)
      return NextResponse.json({ error: "Search failed" }, { status: 500 })
    }

    // Enhanced AI filtering with synonyms and fuzzy matching
    const enhancedResults =
      products?.filter((product) => {
        const productText = `${product.name}`.toLowerCase()
        return searchTerms.some((term: string) => {
          // Direct match
          if (productText.includes(term)) return true

          // Handle common synonyms and typos
          const synonyms: { [key: string]: string[] } = {
            coke: ["coca", "cola"],
            soda: ["cola", "pepsi", "sprite"],
            chips: ["doritos", "lays", "pringles"],
            energy: ["red bull", "monster", "rockstar"],
            candy: ["chocolate", "snickers", "mars"],
            water: ["aqua", "dasani", "evian"],
            beer: ["budweiser", "corona", "heineken"],
            juice: ["orange", "apple", "grape"],
          }

          // Check synonyms
          if (synonyms[term]) {
            return synonyms[term].some((synonym: string) => productText.includes(synonym))
          }

          // Fuzzy matching for typos (simple Levenshtein-like)
          if (term.length > 3) {
            const words = productText.split(" ")
            return words.some((word: string) => {
              if (Math.abs(word.length - term.length) <= 2) {
                let differences = 0
                const minLength = Math.min(word.length, term.length)
                for (let i = 0; i < minLength; i++) {
                  if (word[i] !== term[i]) differences++
                }
                return differences <= 2 // Allow up to 2 character differences
              }
              return false
            })
          }

          return false
        })
      }) || []

    // Generate AI suggestions based on query context
    const suggestions: string[] = []
    if (query.includes("drink") || query.includes("beverage")) {
      suggestions.push("cold drinks", "energy drinks", "soft drinks", "juice", "water")
    }
    if (query.includes("snack") || query.includes("food")) {
      suggestions.push("chips", "candy", "nuts", "crackers", "cookies")
    }
    if (query.includes("under") || query.includes("cheap") || query.includes("budget")) {
      suggestions.push("budget items", "value products", "discounted items")
    }
    if (query.includes("healthy") || query.includes("diet")) {
      suggestions.push("organic", "low calorie", "sugar free", "diet")
    }

    // Add category-based suggestions from recent sales context
    if (context?.recentSales) {
      const popularCategories = new Set<string>()
      context.recentSales.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
          if (item.product?.category_id) {
            popularCategories.add(item.product.category_id)
          }
        })
      })
      // Add popular categories as suggestions (you'd need to map category IDs to names)
    }

    // Detect potential corrections for common typos
    let corrections: string | null = null
    const commonCorrections: { [key: string]: string } = {
      cocacola: "coca cola",
      pesi: "pepsi",
      redbul: "red bull",
      dorito: "doritos",
      sniker: "snickers",
      choclate: "chocolate",
    }

    for (const [typo, correction] of Object.entries(commonCorrections)) {
      if (query.toLowerCase().includes(typo)) {
        corrections = query.toLowerCase().replace(typo, correction)
        break
      }
    }

    // Calculate confidence based on match quality and context
    let confidence = 0.5
    if (enhancedResults.length > 0) {
      confidence = 0.8
      // Boost confidence if we have exact matches
      const exactMatches = enhancedResults.filter((product) =>
        searchTerms.some((term: string) => product.name.toLowerCase().includes(term)),
      )
      if (exactMatches.length > 0) {
        confidence = 0.95
      }
    }

    // Boost confidence if user has bought similar items before
    if (context?.userFavorites) {
      const favoriteMatches = enhancedResults.filter((product) =>
        context.userFavorites.some((fav: any) => fav.id === product.id),
      )
      if (favoriteMatches.length > 0) {
        confidence = Math.min(0.98, confidence + 0.1)
      }
    }

    return NextResponse.json({
      products: enhancedResults,
      suggestions: [...new Set(suggestions)], // Remove duplicates
      corrections,
      confidence,
      searchTerms, // For debugging
      totalFound: enhancedResults.length,
    })
  } catch (error) {
    console.error("AI search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
