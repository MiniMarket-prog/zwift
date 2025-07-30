import { type NextRequest, NextResponse } from "next/server"

// Rate limiting and environment validation
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const MAX_REQUESTS_PER_MINUTE = 10
const requestCounts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const clientData = requestCounts.get(clientId)

  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + 60000 })
    return true
  }

  if (clientData.count >= MAX_REQUESTS_PER_MINUTE) {
    return false
  }

  clientData.count++
  return true
}

interface ProductData {
  name: string
  revenue: number
  profit: number
  profitMargin: number
  quantitySold: number
  cogs?: number
}

interface CategoryData {
  name: string
  revenue: number
  profit: number
  profitMargin: number
}

interface ProfitData {
  totalRevenue: number
  totalProfit: number
  profitMargin: number
  totalOrders: number
  averageOrderValue: number
  profitGrowth: number
  revenueGrowth: number
  topProducts: ProductData[]
  lowMarginProducts: ProductData[]
  highMarginProducts: ProductData[]
  categoryData: CategoryData[]
  dailyData?: Array<{ date: string; revenue: number; profit: number; orders: number }>
}

function summarizeProfitData(data: ProfitData) {
  return {
    totalRevenue: data.totalRevenue || 0,
    totalProfit: data.totalProfit || 0,
    profitMargin: data.profitMargin || 0,
    totalOrders: data.totalOrders || 0,
    averageOrderValue: data.averageOrderValue || 0,
    profitGrowth: data.profitGrowth || 0,
    revenueGrowth: data.revenueGrowth || 0,
    topProducts: (data.topProducts || []).slice(0, 5).map((p: ProductData) => ({
      name: p.name,
      revenue: p.revenue,
      profit: p.profit,
      profitMargin: p.profitMargin,
      quantitySold: p.quantitySold,
    })),
    lowMarginProducts: (data.lowMarginProducts || []).slice(0, 3).map((p: ProductData) => ({
      name: p.name,
      profitMargin: p.profitMargin,
      revenue: p.revenue,
    })),
    highMarginProducts: (data.highMarginProducts || []).slice(0, 3).map((p: ProductData) => ({
      name: p.name,
      profitMargin: p.profitMargin,
      revenue: p.revenue,
    })),
    categoryData: (data.categoryData || []).slice(0, 5).map((c: CategoryData) => ({
      name: c.name,
      revenue: c.revenue,
      profit: c.profit,
      profitMargin: c.profitMargin,
    })),
    dailyTrend: data.dailyData ? (data.dailyData.length > 7 ? "increasing" : "stable") : "unknown",
    seasonality: data.dailyData ? "detected" : "unknown",
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = request.headers.get("x-forwarded-for") || "anonymous"
    if (!checkRateLimit(clientId)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    // Environment validation
    if (!OPENAI_API_KEY || OPENAI_API_KEY === "your-openai-api-key-here") {
      return NextResponse.json({
        error: "AI analysis unavailable",
        fallback: {
          strategicRecommendations: [
            "Focus on improving profit margins through cost optimization",
            "Analyze customer buying patterns to increase average order value",
            "Consider seasonal promotions to boost revenue during slow periods",
          ],
          riskAssessment: {
            level: "medium",
            factors: ["Limited AI analysis available", "Manual review recommended"],
          },
          actionPlan: [
            { priority: "high", action: "Review pricing strategy", timeline: "This week" },
            { priority: "medium", action: "Analyze product performance", timeline: "Next week" },
          ],
        },
      })
    }

    const { profitData, period } = await request.json()

    if (!profitData) {
      return NextResponse.json({ error: "No profit data provided" }, { status: 400 })
    }

    // Summarize data to reduce token usage
    const summarizedData = summarizeProfitData(profitData)

    const prompt = `As a business intelligence expert, analyze this profit data and provide strategic insights:

BUSINESS PERFORMANCE (${period}):
- Revenue: $${summarizedData.totalRevenue.toFixed(2)}
- Profit: $${summarizedData.totalProfit.toFixed(2)}
- Profit Margin: ${summarizedData.profitMargin.toFixed(1)}%
- Orders: ${summarizedData.totalOrders}
- Average Order Value: $${summarizedData.averageOrderValue.toFixed(2)}
- Profit Growth: ${summarizedData.profitGrowth.toFixed(1)}%

TOP PRODUCTS:
${summarizedData.topProducts.map((p) => `- ${p.name}: $${p.revenue} revenue, ${p.profitMargin.toFixed(1)}% margin`).join("\n")}

CATEGORIES:
${summarizedData.categoryData.map((c) => `- ${c.name}: $${c.revenue} revenue, ${c.profitMargin.toFixed(1)}% margin`).join("\n")}

MARGIN ANALYSIS:
High Margin: ${summarizedData.highMarginProducts.map((p) => p.name).join(", ")}
Low Margin: ${summarizedData.lowMarginProducts.map((p) => p.name).join(", ")}

Provide analysis in this JSON format:
{
  "strategicRecommendations": ["3-4 high-level strategic recommendations"],
  "riskAssessment": {
    "level": "low|medium|high",
    "factors": ["key risk factors identified"]
  },
  "actionPlan": [
    {"priority": "high|medium|low", "action": "specific action", "timeline": "timeframe", "expectedImpact": "impact description"}
  ],
  "marketingInsights": ["2-3 marketing-focused recommendations"],
  "operationalEfficiency": ["2-3 operational improvements"],
  "competitiveAdvantage": "key competitive advantage to focus on"
}`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a business intelligence expert specializing in profit optimization and strategic planning. Provide actionable, data-driven insights.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const aiResponse = await response.json()
    const content = aiResponse.choices?.[0]?.message?.content

    if (!content) {
      throw new Error("No content received from AI")
    }

    // Parse AI response
    let aiInsights
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiInsights = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in AI response")
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError)
      // Provide fallback insights
      aiInsights = {
        strategicRecommendations: [
          "Focus on improving profit margins through strategic pricing",
          "Optimize product mix to favor high-margin items",
          "Implement data-driven inventory management",
        ],
        riskAssessment: {
          level: "medium",
          factors: ["Profit margin analysis needed", "Market competition assessment required"],
        },
        actionPlan: [
          {
            priority: "high",
            action: "Review pricing strategy",
            timeline: "This week",
            expectedImpact: "5-10% margin improvement",
          },
          {
            priority: "medium",
            action: "Analyze product performance",
            timeline: "Next week",
            expectedImpact: "Better inventory allocation",
          },
        ],
        marketingInsights: [
          "Promote high-margin products more prominently",
          "Create bundles to increase average order value",
        ],
        operationalEfficiency: [
          "Streamline inventory management processes",
          "Optimize staffing based on sales patterns",
        ],
        competitiveAdvantage: "Focus on product quality and customer service differentiation",
      }
    }

    // Add confidence score based on data quality
    const confidenceScore = Math.min(
      100,
      Math.max(
        60,
        (summarizedData.totalOrders > 10 ? 20 : 10) +
          (summarizedData.topProducts.length > 3 ? 20 : 10) +
          (summarizedData.profitMargin > 0 ? 20 : 0) +
          (summarizedData.categoryData.length > 2 ? 20 : 10) +
          (Math.abs(summarizedData.profitGrowth) < 50 ? 20 : 10),
      ),
    )

    return NextResponse.json({
      ...aiInsights,
      confidenceScore,
      dataQuality: {
        ordersAnalyzed: summarizedData.totalOrders,
        productsAnalyzed: summarizedData.topProducts.length,
        categoriesAnalyzed: summarizedData.categoryData.length,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("AI profit insights error:", error)

    // Provide fallback response
    return NextResponse.json({
      strategicRecommendations: [
        "Analyze your top-performing products and focus marketing efforts on them",
        "Review pricing strategy for products with low profit margins",
        "Implement inventory optimization based on sales patterns",
      ],
      riskAssessment: {
        level: "medium",
        factors: ["AI analysis temporarily unavailable", "Manual review recommended"],
      },
      actionPlan: [
        {
          priority: "high",
          action: "Review current pricing strategy",
          timeline: "This week",
          expectedImpact: "Potential margin improvement",
        },
        {
          priority: "medium",
          action: "Analyze customer buying patterns",
          timeline: "Next week",
          expectedImpact: "Better product positioning",
        },
      ],
      marketingInsights: [
        "Focus marketing budget on highest-margin products",
        "Create promotional campaigns for underperforming items",
      ],
      operationalEfficiency: [
        "Optimize inventory levels based on demand patterns",
        "Review supplier relationships for cost optimization",
      ],
      competitiveAdvantage: "Leverage data-driven decision making for competitive edge",
      confidenceScore: 75,
      dataQuality: {
        ordersAnalyzed: 0,
        productsAnalyzed: 0,
        categoriesAnalyzed: 0,
      },
      generatedAt: new Date().toISOString(),
      fallbackMode: true,
    })
  }
}
