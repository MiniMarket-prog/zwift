import { streamText, convertToCoreMessages } from "ai"
import { openai } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"
import { getAllTools } from "@/lib/ai-tools/loader"
import {
  analyzeQueryAndGetTools as smartAnalyzeQueryAndGetTools,
  getOptimizedSystemPrompt as smartGetOptimizedSystemPrompt,
} from "@/lib/ai-tools/smart-loader"

// FIXED: Rate limiting and optimization utilities
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

        // FIXED: Actually execute the request function
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

export async function POST(req: NextRequest) {
  const rateLimitManager = RateLimitManager.getInstance()

  let messages
  let detailedMode = true
  let responseLength = 75
  let userQuery = ""

  try {
    const body = await req.json()
    if (!body.messages || !Array.isArray(body.messages)) {
      throw new Error("Invalid or missing 'messages' in request body.")
    }

    messages = convertToCoreMessages(body.messages)
    detailedMode = body.detailedMode ?? true
    responseLength = body.responseLength ?? 75

    // Extract the latest user message for smart analysis
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === "user") {
      userQuery =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : Array.isArray(lastMessage.content)
            ? lastMessage.content.map((c) => (c.type === "text" ? c.text : "")).join(" ")
            : ""
    }

    console.log("🔍 User query for smart analysis:", userQuery)
    console.log("⚙️ Detailed mode:", detailedMode, "Response length:", responseLength)

    // CRITICAL: Test tool loading first
    const allToolsTest = getAllTools()
    console.log("🧪 TOOL LOADING TEST:")
    console.log("- Available tools count:", Object.keys(allToolsTest).length)
    console.log("- Available tools:", Object.keys(allToolsTest))

    if (Object.keys(allToolsTest).length === 0) {
      console.error("❌ CRITICAL ERROR: No tools loaded! Check tool registration.")
      return NextResponse.json(
        {
          error: "AI tools not loaded properly. Please refresh the page and try again.",
          debug: "Tool registration failed - check server logs",
        },
        { status: 500 },
      )
    }

    // Analyze query and get tools
    const { tools, estimatedTokens } = smartAnalyzeQueryAndGetTools(userQuery)

    if (Object.keys(tools).length === 0) {
      console.error("❌ No tools selected for query:", userQuery)
      return NextResponse.json(
        {
          error: "No appropriate tools found for your query. Please try rephrasing.",
          suggestion: "Try asking 'How many products do we have?' or 'Show me inventory overview'",
        },
        { status: 400 },
      )
    }

    const systemPrompt = smartGetOptimizedSystemPrompt(userQuery, detailedMode, responseLength)

    console.log(`📊 Smart optimization: Using ${Object.keys(tools).length} tools, estimated tokens: ${estimatedTokens}`)
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

  const maxTokens = detailedMode ? (responseLength >= 75 ? 4000 : responseLength >= 50 ? 2500 : 1500) : 800

  try {
    // Get tools for the request
    const { tools } = smartAnalyzeQueryAndGetTools(userQuery)
    const systemPrompt = smartGetOptimizedSystemPrompt(userQuery, detailedMode, responseLength)

    console.log(`🚀 Final request: Using ${Object.keys(tools).length} tools`)
    console.log("🛠️ Final tools:", Object.keys(tools))

    // FIXED: Use rate limiting for the actual request
    const result = await rateLimitManager.queueRequest(async () => {
      return await streamText({
        model: openai("gpt-4o-mini"), // Using gpt-4o-mini for better rate limits
        messages: messages,
        maxTokens: maxTokens,
        temperature: 0.1, // Lower temperature for more consistent tool usage
        system: systemPrompt, // Enhanced system prompt that forces tool usage
        tools: tools, // Only relevant tools loaded!

        maxSteps: 5, // Allow for tool calls
        toolChoice: "auto", // Let AI decide when to use tools
      })
    })

    return result.toDataStreamResponse()
  } catch (error: any) {
    console.error("Critical AI chat API error:", error)
    console.error("Error name:", error.name)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)

    let clientErrorMessage = "AI assistant temporarily unavailable"
    let statusCode = 500

    // Enhanced error handling for different types of API errors
    if (error.name === "AI_APICallError" || error.name === "AI_RetryError") {
      statusCode = error.statusCode || 500
      if (statusCode === 429) {
        clientErrorMessage = "Rate limit reached. Please wait a moment and try again with a shorter question."
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

    return NextResponse.json(
      {
        error: clientErrorMessage,
        suggestion:
          statusCode === 429
            ? "Try using quick response mode or wait 30-60 seconds before your next request."
            : "Consider breaking your question into smaller parts.",
      },
      { status: statusCode },
    )
  }
}
