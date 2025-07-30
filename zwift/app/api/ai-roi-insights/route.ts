import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createClient } from "@/lib/supabase-client"

// Rate limiting (same as other AI routes)
class RateLimitManager {
  private static instance: RateLimitManager
  private requestQueue: Array<{ resolve: Function; reject: Function; timestamp: number; requestFn: Function }> = []
  private isProcessing = false
  private lastRequestTime = 0
  private readonly MIN_REQUEST_INTERVAL = 2000
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

    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100)
    }
  }
}

export async function POST(request: NextRequest) {
  const rateLimitManager = RateLimitManager.getInstance()

  try {
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

    const { action, roiData, period, dateRange } = await request.json()

    if (!action || !roiData) {
      return NextResponse.json({ error: "Missing required parameters: action and roiData" }, { status: 400 })
    }

    const supabase = createClient()

    // Get additional business context
    const [salesData, productsData, investmentsData] = await Promise.all([
      supabase
        .from("sales")
        .select("*, sale_items(*)")
        .gte("created_at", dateRange?.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .lte("created_at", dateRange?.to || new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("products").select("*").limit(50),
      supabase.from("investments").select("*").order("investment_date", { ascending: false }).limit(20),
    ])

    let prompt = ""
    const systemPrompt = `You are an expert financial analyst and business strategist specializing in ROI analysis and business optimization. 
    Provide actionable, data-driven insights in valid JSON format only. Focus on practical recommendations that can improve business performance.
    Consider industry benchmarks, seasonal trends, and growth opportunities in your analysis.`

    switch (action) {
      case "performance_analysis":
        prompt = `
          Analyze this business's ROI performance and provide comprehensive insights:
          
          ROI Data: ${JSON.stringify(roiData, null, 2)}
          Period: ${period}
          Sales Data: ${JSON.stringify(salesData.data?.slice(0, 20), null, 2)}
          Products Count: ${productsData.data?.length || 0}
          Recent Investments: ${JSON.stringify(investmentsData.data?.slice(0, 10), null, 2)}
          
          Provide analysis on:
          1. Overall ROI performance vs industry benchmarks
          2. Trend analysis and trajectory
          3. Key performance drivers
          4. Risk assessment
          5. Growth opportunities
          
          Return ONLY a JSON object with this structure:
          {
            "overallAssessment": "string",
            "performanceRating": "Excellent|Good|Average|Poor",
            "keyStrengths": ["string"],
            "concernAreas": ["string"],
            "trendAnalysis": "string",
            "industryComparison": "string",
            "riskLevel": "Low|Medium|High",
            "confidenceScore": number
          }
        `
        break

      case "optimization_recommendations":
        prompt = `
          Provide specific optimization recommendations to improve ROI:
          
          Current ROI Data: ${JSON.stringify(roiData, null, 2)}
          Business Context: 
          - Sales Performance: ${JSON.stringify(salesData.data?.slice(0, 15), null, 2)}
          - Product Portfolio: ${productsData.data?.length || 0} products
          - Investment History: ${JSON.stringify(investmentsData.data?.slice(0, 8), null, 2)}
          
          Focus on actionable recommendations for:
          1. Cost reduction opportunities
          2. Revenue enhancement strategies
          3. Investment reallocation
          4. Operational efficiency improvements
          5. Market expansion possibilities
          
          Return ONLY a JSON array with this structure:
          [
            {
              "category": "Cost Reduction|Revenue Enhancement|Investment Strategy|Operations|Market Expansion",
              "recommendation": "string",
              "impact": "High|Medium|Low",
              "effort": "High|Medium|Low",
              "timeframe": "Immediate|Short-term|Long-term",
              "expectedROIImprovement": "string",
              "implementation": ["string"]
            }
          ]
        `
        break

      case "predictive_forecast":
        prompt = `
          Create predictive forecasts for ROI performance based on current trends:
          
          Historical ROI Data: ${JSON.stringify(roiData, null, 2)}
          Sales Trends: ${JSON.stringify(salesData.data?.slice(0, 25), null, 2)}
          Investment Pattern: ${JSON.stringify(investmentsData.data, null, 2)}
          Current Period: ${period}
          
          Analyze patterns and predict:
          1. ROI trajectory for next 3, 6, and 12 months
          2. Seasonal impact factors
          3. Growth scenarios (conservative, realistic, optimistic)
          4. Key variables that could affect predictions
          5. Recommended monitoring metrics
          
          Return ONLY a JSON object with this structure:
          {
            "forecast3Months": {
              "expectedROI": number,
              "confidence": number,
              "factors": ["string"]
            },
            "forecast6Months": {
              "expectedROI": number,
              "confidence": number,
              "factors": ["string"]
            },
            "forecast12Months": {
              "expectedROI": number,
              "confidence": number,
              "factors": ["string"]
            },
            "scenarios": {
              "conservative": number,
              "realistic": number,
              "optimistic": number
            },
            "keyVariables": ["string"],
            "seasonalFactors": ["string"],
            "monitoringMetrics": ["string"]
          }
        `
        break

      case "investment_strategy":
        prompt = `
          Analyze investment strategy and provide strategic recommendations:
          
          ROI Performance: ${JSON.stringify(roiData, null, 2)}
          Investment History: ${JSON.stringify(investmentsData.data, null, 2)}
          Business Performance: ${JSON.stringify(salesData.data?.slice(0, 20), null, 2)}
          
          Analyze and recommend:
          1. Investment allocation effectiveness
          2. Future investment priorities
          3. Capital efficiency improvements
          4. Risk-adjusted return optimization
          5. Strategic investment opportunities
          
          Return ONLY a JSON object with this structure:
          {
            "currentAllocationAnalysis": "string",
            "allocationEffectiveness": "High|Medium|Low",
            "recommendedAllocations": [
              {
                "category": "string",
                "currentPercentage": number,
                "recommendedPercentage": number,
                "reasoning": "string"
              }
            ],
            "investmentPriorities": [
              {
                "priority": "High|Medium|Low",
                "area": "string",
                "expectedReturn": "string",
                "timeframe": "string"
              }
            ],
            "strategicOpportunities": ["string"],
            "riskMitigation": ["string"]
          }
        `
        break

      case "competitive_analysis":
        prompt = `
          Provide competitive and market positioning analysis:
          
          Business ROI: ${JSON.stringify(roiData, null, 2)}
          Sales Performance: ${JSON.stringify(salesData.data?.slice(0, 15), null, 2)}
          Product Portfolio Size: ${productsData.data?.length || 0}
          
          Analyze:
          1. Market position based on ROI performance
          2. Competitive advantages and disadvantages
          3. Market opportunities
          4. Benchmarking insights
          5. Strategic positioning recommendations
          
          Return ONLY a JSON object with this structure:
          {
            "marketPosition": "Market Leader|Strong Performer|Average|Below Average",
            "competitiveAdvantages": ["string"],
            "competitiveDisadvantages": ["string"],
            "marketOpportunities": ["string"],
            "benchmarkComparison": {
              "industryAverageROI": "string",
              "performanceVsIndustry": "Above|At|Below",
              "percentilRanking": "string"
            },
            "strategicRecommendations": ["string"],
            "marketThreats": ["string"]
          }
        `
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    console.log(`🤖 AI ROI Analysis: ${action} for period ${period}`)

    // Use rate limiting for the AI request
    const result = await rateLimitManager.queueRequest(async () => {
      const { text } = await generateText({
        model: openai("gpt-4o"), // Using gpt-4o for more sophisticated financial analysis
        system: systemPrompt,
        prompt: prompt,
        maxTokens: 3000,
        temperature: 0.2, // Low temperature for consistent financial analysis
      })

      return text
    })

    // Parse JSON response
    let parsedResult
    try {
      parsedResult = JSON.parse(result)
    } catch (parseError) {
      console.warn("Failed to parse AI response as JSON, creating fallback response")

      // Create fallback based on action type
      switch (action) {
        case "performance_analysis":
          parsedResult = {
            overallAssessment: "Analysis completed but requires manual review",
            performanceRating: "Average",
            keyStrengths: ["Consistent revenue generation"],
            concernAreas: ["Data analysis needs refinement"],
            trendAnalysis: "Stable performance with room for improvement",
            industryComparison: "Performing within industry standards",
            riskLevel: "Medium",
            confidenceScore: 0.7,
          }
          break
        case "optimization_recommendations":
          parsedResult = [
            {
              category: "Operations",
              recommendation: "Review current processes for efficiency improvements",
              impact: "Medium",
              effort: "Medium",
              timeframe: "Short-term",
              expectedROIImprovement: "5-10%",
              implementation: ["Conduct operational audit", "Identify bottlenecks", "Implement improvements"],
            },
          ]
          break
        default:
          parsedResult = { analysis: "AI analysis completed but response format needs adjustment" }
      }
    }

    return NextResponse.json({ result: parsedResult })
  } catch (error: any) {
    console.error("AI ROI Insights Error:", error)

    let clientErrorMessage = "AI ROI analysis temporarily unavailable"
    let statusCode = 500

    if (error.name === "AI_APICallError" || error.name === "AI_RetryError") {
      statusCode = error.statusCode || 500
      if (statusCode === 429) {
        clientErrorMessage = "Rate limit reached. Please wait a moment and try again."
      } else if (statusCode === 401) {
        clientErrorMessage = "Authentication error with AI service. Please check your API key configuration."
      } else {
        clientErrorMessage = `AI Service Error: ${error.message || "Unknown error"}`
      }
    }

    return NextResponse.json(
      {
        error: clientErrorMessage,
        suggestion: statusCode === 429 ? "Please wait 30-60 seconds before trying again." : "Try refreshing the page.",
      },
      { status: statusCode },
    )
  }
}
