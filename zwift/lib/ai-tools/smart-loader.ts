// Smart tool loader that only loads relevant tools based on query analysis
import { getAllTools } from "./index"

// Tool categories for smart loading
const TOOL_CATEGORIES = {
  database: ["testConnection"],
  inventory: [
    "getLowStockProducts",
    "getInventoryOverview",
    "searchInventory",
    "checkProductStock",
    "getAllProducts",
    "bulkUpdateMinimumStock",
    "verifyProductUpdates",
  ],
  sales: ["getProductsSoldWithZeroStock", "getMostSoldProducts", "getSlowMovingProducts"],
  analytics: ["getDashboardStats", "getCategories"],
  smart: ["getSmartReorderSuggestions", "getInventoryHealthScore"],
  debug: ["debugHealthScore"],
}

// Query patterns to determine which tools are needed
const QUERY_PATTERNS = {
  // Health and overview queries - need smart + inventory tools
  health: {
    patterns: [
      /health\s+score/i,
      /inventory\s+health/i,
      /overall\s+performance/i,
      /how\s+am\s+i\s+doing/i,
      /health/i,
      /score/i,
    ],
    categories: ["smart", "inventory", "debug"],
  },

  // Total/count queries - need inventory tools
  total: {
    patterns: [
      /how\s+many\s+products/i,
      /total\s+products/i,
      /number\s+of\s+products/i,
      /products\s+in\s+total/i,
      /total\s+inventory/i,
      /count\s+products/i,
      /products\s+we\s+have/i,
    ],
    categories: ["inventory", "analytics"],
  },

  // Reorder and purchasing queries
  reorder: {
    patterns: [
      /reorder/i,
      /what\s+to\s+buy/i,
      /what\s+should\s+i\s+order/i,
      /purchasing/i,
      /restocking/i,
      /smart\s+suggestions/i,
    ],
    categories: ["smart", "inventory", "sales"],
  },

  // Stock level queries
  stock: {
    patterns: [/low\s+stock/i, /out\s+of\s+stock/i, /stock\s+level/i, /inventory\s+level/i, /below\s+minimum/i],
    categories: ["inventory"],
  },

  // Search queries
  search: {
    patterns: [/search/i, /find/i, /look\s+for/i, /do\s+we\s+have/i, /check.*stock/i],
    categories: ["inventory"],
  },

  // Sales analysis queries
  sales: {
    patterns: [/sales/i, /selling/i, /sold/i, /best\s+seller/i, /slow\s+moving/i, /fast\s+moving/i],
    categories: ["sales", "inventory"],
  },

  // Overview and dashboard queries
  overview: {
    patterns: [/overview/i, /dashboard/i, /summary/i, /stats/i, /total/i, /how\s+many/i],
    categories: ["analytics", "inventory"],
  },

  // Database and system queries
  system: {
    patterns: [/test/i, /connection/i, /database/i, /system/i],
    categories: ["database"],
  },
}

// Analyze query and determine needed tools
export function analyzeQueryAndGetTools(query: string): { tools: any; estimatedTokens: number } {
  const queryLower = query.toLowerCase()

  // Find matching patterns
  const matchedCategories = new Set<string>()

  for (const [queryType, config] of Object.entries(QUERY_PATTERNS)) {
    const hasMatch = config.patterns.some((pattern) => pattern.test(queryLower))
    if (hasMatch) {
      config.categories.forEach((cat) => matchedCategories.add(cat))
      console.log(`🎯 Query "${query}" matched pattern "${queryType}" -> categories: ${config.categories.join(", ")}`)
      break // Use first match to avoid over-loading
    }
  }

  // If no specific pattern matches, use a minimal set based on keywords
  if (matchedCategories.size === 0) {
    if (queryLower.includes("product") || queryLower.includes("item")) {
      matchedCategories.add("inventory")
    } else {
      // Default minimal set for general queries
      matchedCategories.add("inventory")
      matchedCategories.add("analytics")
    }
    console.log(`🔍 No specific pattern matched for "${query}", using default categories`)
  }

  // Get all tools and filter to only needed ones
  const allTools = getAllTools()
  const neededTools: any = {}

  Array.from(matchedCategories).forEach((category) => {
    const toolNames = TOOL_CATEGORIES[category as keyof typeof TOOL_CATEGORIES] || []
    toolNames.forEach((toolName) => {
      if (allTools[toolName]) {
        neededTools[toolName] = allTools[toolName]
      }
    })
  })

  // Estimate token reduction
  const totalTools = Object.keys(allTools).length
  const loadedTools = Object.keys(neededTools).length
  const estimatedTokens = Math.round(33961 * (loadedTools / totalTools))

  console.log(
    `Smart loader: ${loadedTools}/${totalTools} tools loaded for categories: ${Array.from(matchedCategories).join(", ")}`,
  )
  console.log("Tools loaded:", Object.keys(neededTools))
  console.log(
    `Estimated token reduction: ${33961} -> ${estimatedTokens} (${Math.round(((33961 - estimatedTokens) / 33961) * 100)}% reduction)`,
  )

  return { tools: neededTools, estimatedTokens }
}

// Get optimized system prompt based on query type and mode
export function getOptimizedSystemPrompt(query: string, detailedMode: boolean, responseLength: number): string {
  const queryLower = query.toLowerCase()

  // Determine query type for prompt optimization
  let promptType = "general"
  if (queryLower.includes("health") || queryLower.includes("score")) {
    promptType = "health"
  } else if (queryLower.includes("reorder") || queryLower.includes("buy") || queryLower.includes("order")) {
    promptType = "reorder"
  } else if (queryLower.includes("search") || queryLower.includes("find") || queryLower.includes("do we have")) {
    promptType = "search"
  } else if (queryLower.includes("low stock") || queryLower.includes("out of stock")) {
    promptType = "stock"
  } else if (
    queryLower.includes("how many") ||
    queryLower.includes("total") ||
    queryLower.includes("count") ||
    queryLower.includes("number of")
  ) {
    promptType = "count"
  }

  const responseStyle = detailedMode
    ? responseLength >= 75
      ? "comprehensive"
      : responseLength >= 50
        ? "detailed"
        : "moderate"
    : "concise"

  // Base prompt - much shorter than original
  const basePrompt = `You are an AI assistant for mini-market inventory management. You MUST use the available tools to fetch real data from the database. Never provide made-up numbers or estimates.

CRITICAL RULE: Always use tools to get actual data. Do not guess or provide placeholder numbers.

RESPONSE MODE: ${detailedMode ? "DETAILED" : "QUICK"} (${responseLength}%)
CONTEXT: Current date is 2025. "This month" means current month/year.

KEY RULES:
- ALWAYS use tools to get real data from the database - this is mandatory
- Never provide estimated or made-up numbers
- Provide specific numbers and actionable insights from actual data
- Include barcodes when available
- ${detailedMode ? "Give comprehensive analysis with recommendations" : "Focus on key insights and main recommendations"}`

  // Add specific guidance based on query type
  const specificGuidance = {
    health:
      "\nFOCUS: Use getInventoryHealthScore tool to calculate actual health scores and provide real improvement recommendations.",
    reorder:
      "\nFOCUS: Use getSmartReorderSuggestions tool to analyze real sales velocity, stock levels, profit margins.",
    search:
      "\nFOCUS: Use searchInventory or checkProductStock tools to find actual products and show real stock status.",
    stock: "\nFOCUS: Use getLowStockProducts tool to identify actual low/out of stock items with real data.",
    count:
      "\nFOCUS: Use getAllProducts tool to get the actual total number of products from the database. Never guess numbers.",
    general: "\nFOCUS: Use appropriate tools based on the specific question asked. Always fetch real data.",
  }

  return basePrompt + (specificGuidance[promptType as keyof typeof specificGuidance] || specificGuidance.general)
}

// Add this function at the end of the file
export function debugToolLoading(query: string) {
  const { tools, estimatedTokens } = analyzeQueryAndGetTools(query)
  console.log("=== TOOL LOADING DEBUG ===")
  console.log("Query:", query)
  console.log("Tools loaded:", Object.keys(tools))
  console.log("Estimated tokens:", estimatedTokens)
  console.log(
    "Available tools:",
    Object.keys(tools).map((name) => ({ name, hasExecute: !!tools[name].execute })),
  )
  return { tools, estimatedTokens }
}
