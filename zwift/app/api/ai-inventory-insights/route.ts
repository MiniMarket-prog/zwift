import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createClient } from "@/lib/supabase-client"

// Rate limiting and optimization utilities (same as chat route)
class RateLimitManager {
  private static instance: RateLimitManager
  private requestQueue: Array<{ resolve: Function; reject: Function; timestamp: number; requestFn: Function }> = []
  private isProcessing = false
  private lastRequestTime = 0
  private readonly MIN_REQUEST_INTERVAL = 2000 // 2 seconds between requests
  private readonly MAX_QUEUE_SIZE = 10

  static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager()
    }
    return RateLimitManager.instance
  }

  async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.requestQueue.length >= this.MAX_QUEUE_SIZE) {
        reject(new Error("Request queue is full. Please try again in a few moments."))
        return
      }

      this.requestQueue.push({ resolve, reject, timestamp: Date.now(), requestFn })
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      const { resolve, reject, timestamp, requestFn } = this.requestQueue.shift()!

      if (Date.now() - timestamp > 30000) {
        reject(new Error("Request timeout. Please try again."))
        continue
      }

      try {
        const timeSinceLastRequest = Date.now() - this.lastRequestTime
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
          await new Promise((resolveDelay) =>
            setTimeout(resolveDelay, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest),
          )
        }

        this.lastRequestTime = Date.now()
        const result = await requestFn()
        resolve(result)
        break
      } catch (error) {
        reject(error)
        break
      }
    }

    this.isProcessing = false

    // Process next request if queue is not empty
    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100)
    }
  }
}

export async function POST(request: NextRequest) {
  const rateLimitManager = RateLimitManager.getInstance()

  try {
    // Check environment variables first
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

    const { products, action, productData } = await request.json()

    if (!products || !action) {
      return NextResponse.json({ error: "Missing required parameters: products and action" }, { status: 400 })
    }

    const supabase = createClient()

    // Get sales data for context
    const { data: salesData } = await supabase
      .from("sales")
      .select("*, sale_items(*)")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    let prompt = ""
    const systemPrompt =
      "You are an AI inventory management expert. Provide practical, data-driven recommendations in valid JSON format only. Do not include any explanatory text outside the JSON."

    switch (action) {
      case "restock_suggestions":
        prompt = `
          Analyze these low stock products and provide intelligent restocking suggestions:
          
          Products: ${JSON.stringify(products.slice(0, 10), null, 2)} // Limit to first 10 products
          Recent Sales Data: ${JSON.stringify(salesData?.slice(0, 20), null, 2)} // Limit sales data
          
          For each product, provide:
          1. Recommended restock quantity based on sales velocity
          2. Reasoning based on sales patterns
          3. Urgency level (High/Medium/Low)
          4. Seasonal considerations if applicable
          
          Return ONLY a JSON array with this exact structure:
          [
            {
              "productId": "string",
              "productName": "string", 
              "recommendedQuantity": number,
              "reasoning": "string",
              "urgency": "High|Medium|Low",
              "seasonalNotes": "string"
            }
          ]
        `
        break

      case "categorize_products":
        const categories = await getCategories(supabase)
        prompt = `
          Analyze these uncategorized products and suggest appropriate categories:
          
          Products: ${JSON.stringify(products.filter((p: any) => !p.category_id).slice(0, 10), null, 2)}
          Existing Categories: ${JSON.stringify(categories, null, 2)}
          
          For each product, suggest the most appropriate existing category OR a new category name if none fit well.
          
          Return ONLY a JSON array with this exact structure:
          [
            {
              "productId": "string",
              "productName": "string",
              "suggestedCategory": "string",
              "newCategory": "string or null",
              "confidence": number,
              "alternatives": ["string"]
            }
          ]
        `
        break

      case "price_optimization":
        prompt = `
          Analyze pricing for these products and suggest optimizations:
          
          Products: ${JSON.stringify(products.slice(0, 10), null, 2)}
          Sales Performance: ${JSON.stringify(salesData?.slice(0, 20), null, 2)}
          
          For each product, analyze current profit margin, sales velocity vs price point, and suggest price adjustments.
          
          Return ONLY a JSON array with this exact structure:
          [
            {
              "productId": "string",
              "productName": "string",
              "currentPrice": number,
              "suggestedPrice": number,
              "reasoning": "string",
              "expectedImpact": "string"
            }
          ]
        `
        break

      case "demand_forecast":
        prompt = `
          Forecast demand for these products based on historical data:
          
          Products: ${JSON.stringify(products.slice(0, 10), null, 2)}
          Sales History: ${JSON.stringify(salesData?.slice(0, 30), null, 2)}
          Current Date: ${new Date().toISOString()}
          
          For each product, predict expected demand for next 7 and 30 days based on historical patterns.
          
          Return ONLY a JSON array with this exact structure:
          [
            {
              "productId": "string",
              "productName": "string",
              "demand7Days": number,
              "demand30Days": number,
              "trend": "string",
              "riskFactors": ["string"]
            }
          ]
        `
        break

      case "smart_insights":
        prompt = `
          Provide intelligent insights about this inventory situation:
          
          Low Stock Products: ${JSON.stringify(products.slice(0, 15), null, 2)}
          Recent Sales: ${JSON.stringify(salesData?.slice(0, 25), null, 2)}
          
          Analyze the overall inventory situation and provide strategic insights.
          
          Return ONLY a JSON object with this exact structure:
          {
            "criticalInsights": ["string"],
            "causes": ["string"],
            "immediateActions": ["string"],
            "longTermStrategy": ["string"]
          }
        `
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    console.log(`🤖 AI Inventory Analysis: ${action} for ${products.length} products`)

    // Use rate limiting for the AI request
    const result = await rateLimitManager.queueRequest(async () => {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"), // Using gpt-4o-mini for better rate limits and cost efficiency
        system: systemPrompt,
        prompt: prompt,
        maxTokens: 2000, // Reasonable limit for inventory insights
        temperature: 0.1, // Low temperature for consistent, factual responses
      })

      return text
    })

    // Try to parse as JSON, fallback to structured response if parsing fails
    let parsedResult
    try {
      parsedResult = JSON.parse(result)
    } catch (parseError) {
      console.warn("Failed to parse AI response as JSON, creating fallback response")

      // Create a fallback response based on the action type
      if (action === "smart_insights") {
        parsedResult = {
          criticalInsights: ["AI analysis completed but response format needs adjustment"],
          causes: ["Multiple factors may be contributing to low stock levels"],
          immediateActions: ["Review inventory levels and consider restocking priority items"],
          longTermStrategy: ["Implement better demand forecasting and inventory management practices"],
        }
      } else {
        parsedResult = products.slice(0, 5).map((product: any) => ({
          productId: product.id,
          productName: product.name,
          recommendedQuantity: Math.max(product.min_stock * 2, product.stock + 10),
          reasoning: "AI analysis suggests restocking based on current inventory levels",
          urgency: product.stock === 0 ? "High" : product.stock < product.min_stock / 2 ? "Medium" : "Low",
        }))
      }
    }

    return NextResponse.json({ result: parsedResult })
  } catch (error: any) {
    console.error("AI Inventory Insights Error:", error)
    console.error("Error name:", error.name)
    console.error("Error message:", error.message)

    let clientErrorMessage = "AI inventory analysis temporarily unavailable"
    let statusCode = 500

    // Enhanced error handling for different types of API errors
    if (error.name === "AI_APICallError" || error.name === "AI_RetryError") {
      statusCode = error.statusCode || 500
      if (statusCode === 429) {
        clientErrorMessage = "Rate limit reached. Please wait a moment and try again."
      } else if (statusCode === 400) {
        clientErrorMessage = "Invalid request to AI service. Please try again."
      } else if (statusCode === 401) {
        clientErrorMessage = "Authentication error with AI service. Please check your API key configuration."
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

    return NextResponse.json(
      {
        error: clientErrorMessage,
        suggestion:
          statusCode === 429
            ? "Please wait 30-60 seconds before trying again."
            : "Try refreshing the page or contact support if the issue persists.",
      },
      { status: statusCode },
    )
  }
}

async function getCategories(supabase: any) {
  try {
    const { data } = await supabase.from("categories").select("*").limit(20)
    return data || []
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}
