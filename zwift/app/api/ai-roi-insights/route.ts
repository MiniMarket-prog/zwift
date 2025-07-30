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

// Helper function to summarize data for AI processing
function summarizeBusinessData(salesData: any[], productsData: any[], investmentsData: any[]) {
  // Summarize sales data to prevent memory issues
  const salesSummary = {
    totalSales: salesData?.length || 0,
    totalRevenue: salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0,
    averageSaleAmount:
      salesData?.length > 0 ? salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) / salesData.length : 0,
    recentSales:
      salesData?.slice(0, 5).map((sale) => ({
        date: sale.created_at,
        amount: sale.total_amount,
        items_count: sale.sale_items?.length || 0,
      })) || [],
    monthlyTrend: calculateMonthlyTrend(salesData || []),
  }

  // Summarize products data
  const productsSummary = {
    totalProducts: productsData?.length || 0,
    averagePrice:
      productsData?.length > 0
        ? productsData.reduce((sum, product) => sum + (product.price || 0), 0) / productsData.length
        : 0,
    categories: [...new Set(productsData?.map((p) => p.category).filter(Boolean) || [])],
    topProducts:
      productsData?.slice(0, 5).map((product) => ({
        name: product.name,
        price: product.price,
        category: product.category,
      })) || [],
  }

  // Summarize investments data
  const investmentsSummary = {
    totalInvestments: investmentsData?.length || 0,
    totalAmount: investmentsData?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0,
    averageInvestment:
      investmentsData?.length > 0
        ? investmentsData.reduce((sum, inv) => sum + (inv.amount || 0), 0) / investmentsData.length
        : 0,
    recentInvestments:
      investmentsData?.slice(0, 3).map((inv) => ({
        date: inv.investment_date,
        amount: inv.amount,
        description: inv.description?.substring(0, 50) || "No description",
      })) || [],
  }

  return { salesSummary, productsSummary, investmentsSummary }
}

// Helper function to calculate monthly trend
function calculateMonthlyTrend(salesData: any[]) {
  const monthlyData: { [key: string]: number } = {}

  salesData.forEach((sale) => {
    if (sale.created_at && sale.total_amount) {
      const month = new Date(sale.created_at).toISOString().substring(0, 7) // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + sale.total_amount
    }
  })

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6) // Last 6 months
    .map(([month, amount]) => ({ month, amount }))
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

    // Get additional business context with limited data to prevent memory issues
    const [salesData, productsData, investmentsData] = await Promise.all([
      supabase
        .from("sales")
        .select("created_at, total_amount, sale_items(quantity)")
        .gte("created_at", dateRange?.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .lte("created_at", dateRange?.to || new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50), // Reduced limit to prevent memory issues
      supabase
        .from("products")
        .select("name, price, category")
        .limit(20), // Reduced limit
      supabase
        .from("investments")
        .select("investment_date, amount, description")
        .order("investment_date", { ascending: false })
        .limit(10), // Reduced limit
    ])

    // Summarize data to reduce payload size
    const { salesSummary, productsSummary, investmentsSummary } = summarizeBusinessData(
      salesData.data || [],
      productsData.data || [],
      investmentsData.data || [],
    )

    // Create a condensed ROI data summary
    const roiSummary = {
      roi: roiData.roi,
      annualizedRoi: roiData.annualizedRoi,
      totalInvestment: roiData.totalInvestment,
      netProfit: roiData.netProfit,
      paybackPeriod: roiData.paybackPeriod,
      profitabilityIndex: roiData.profitabilityIndex,
      monthlyDataSummary: {
        count: roiData.monthlyData?.length || 0,
        avgROI:
          roiData.monthlyData?.length > 0
            ? roiData.monthlyData.reduce((sum: number, month: any) => sum + month.roi, 0) / roiData.monthlyData.length
            : 0,
        trend: roiData.monthlyData?.slice(-3) || [], // Last 3 months only
      },
    }

    let prompt = ""
    const systemPrompt = `You are an expert financial analyst and business strategist specializing in ROI analysis and business optimization. 
    Provide actionable, data-driven insights in valid JSON format only. Focus on practical recommendations that can improve business performance.
    Consider industry benchmarks, seasonal trends, and growth opportunities in your analysis. Keep responses concise and focused.`

    switch (action) {
      case "performance_analysis":
        prompt = `
          Analyze this business's ROI performance and provide comprehensive insights:
          
          ROI Summary: ${JSON.stringify(roiSummary)}
          Period: ${period}
          Sales Summary: ${JSON.stringify(salesSummary)}
          Products Summary: ${JSON.stringify(productsSummary)}
          Investments Summary: ${JSON.stringify(investmentsSummary)}
          
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
          
          Current ROI Summary: ${JSON.stringify(roiSummary)}
          Business Context: 
          - Sales Summary: ${JSON.stringify(salesSummary)}
          - Products Summary: ${JSON.stringify(productsSummary)}
          - Investments Summary: ${JSON.stringify(investmentsSummary)}
          
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
          
          Historical ROI Summary: ${JSON.stringify(roiSummary)}
          Sales Trends: ${JSON.stringify(salesSummary.monthlyTrend)}
          Investment Pattern: ${JSON.stringify(investmentsSummary)}
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
          
          ROI Performance: ${JSON.stringify(roiSummary)}
          Investment History: ${JSON.stringify(investmentsSummary)}
          Business Performance: ${JSON.stringify(salesSummary)}
          
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
          
          Business ROI: ${JSON.stringify(roiSummary)}
          Sales Performance: ${JSON.stringify(salesSummary)}
          Product Portfolio: ${JSON.stringify(productsSummary)}
          
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
        model: openai("gpt-4o-mini"), // Using gpt-4o-mini for better performance and lower memory usage
        system: systemPrompt,
        prompt: prompt,
        maxTokens: 2000, // Reduced token limit to prevent memory issues
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
        case "predictive_forecast":
          parsedResult = {
            forecast3Months: {
              expectedROI: roiData?.roi || 10,
              confidence: 0.7,
              factors: ["Historical performance trends", "Current market conditions"],
            },
            forecast6Months: {
              expectedROI: (roiData?.roi || 10) * 1.1,
              confidence: 0.6,
              factors: ["Seasonal adjustments", "Investment pipeline"],
            },
            forecast12Months: {
              expectedROI: (roiData?.roi || 10) * 1.2,
              confidence: 0.5,
              factors: ["Long-term growth projections", "Market expansion"],
            },
            scenarios: {
              conservative: (roiData?.roi || 10) * 0.8,
              realistic: roiData?.roi || 10,
              optimistic: (roiData?.roi || 10) * 1.3,
            },
            keyVariables: ["Revenue growth", "Cost management", "Market conditions"],
            seasonalFactors: ["Quarterly sales patterns", "Holiday impacts"],
            monitoringMetrics: ["Monthly ROI", "Cash flow", "Investment efficiency"],
          }
          break
        case "investment_strategy":
          parsedResult = {
            currentAllocationAnalysis: "Investment allocation requires detailed review for optimization",
            allocationEffectiveness: "Medium",
            recommendedAllocations: [
              {
                category: "Operations",
                currentPercentage: 60,
                recommendedPercentage: 50,
                reasoning: "Optimize operational efficiency",
              },
              {
                category: "Growth",
                currentPercentage: 40,
                recommendedPercentage: 50,
                reasoning: "Increase growth investments",
              },
            ],
            investmentPriorities: [
              {
                priority: "High",
                area: "Technology Infrastructure",
                expectedReturn: "15-20%",
                timeframe: "6-12 months",
              },
            ],
            strategicOpportunities: ["Digital transformation", "Market expansion"],
            riskMitigation: ["Diversify investment portfolio", "Monitor cash flow"],
          }
          break
        case "competitive_analysis":
          parsedResult = {
            marketPosition: "Average",
            competitiveAdvantages: ["Strong customer base", "Operational efficiency"],
            competitiveDisadvantages: ["Limited market reach", "Technology gaps"],
            marketOpportunities: ["Digital expansion", "New market segments"],
            benchmarkComparison: {
              industryAverageROI: "12-15%",
              performanceVsIndustry: "At",
              percentilRanking: "50th percentile",
            },
            strategicRecommendations: ["Invest in technology", "Expand market presence"],
            marketThreats: ["Increased competition", "Economic uncertainty"],
          }
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
