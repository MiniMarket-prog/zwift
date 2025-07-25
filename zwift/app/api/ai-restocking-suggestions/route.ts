import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const {
      productName,
      categoryName,
      currentStock,
      minStock,
      salesVelocity,
      totalQuantitySold,
      totalSalesCount,
      productDescription,
      salesPeriodDays, // NEW: Receive salesPeriodDays
    } = await req.json()

    if (
      !productName ||
      !categoryName ||
      currentStock === undefined ||
      minStock === undefined ||
      salesVelocity === undefined ||
      totalQuantitySold === undefined ||
      totalSalesCount === undefined ||
      salesPeriodDays === undefined // Validate new field
    ) {
      return NextResponse.json({ error: "Missing required product data" }, { status: 400 })
    }

    const prompt = `Analyze the following product details to determine its 'nature', suggest 'types of similar products' for restocking, and provide a 'suggested_restock_quantity'. The suggested quantity should aim to bring the stock level to at least the minimum stock plus enough to cover 7-14 days of sales based on the sales velocity, ensuring it's a whole number and at least 1 if restocking is needed. Consider the sales velocity over the last ${salesPeriodDays} days. Provide the output as a JSON object ONLY, with 'nature' (a concise description, e.g., "Fast-moving carbonated beverage", "Seasonal fresh produce", "Durable household cleaning item"), 'similar_types' (an array of general product categories/types, e.g., ["other sodas", "juices", "energy drinks"]), and 'suggested_restock_quantity' (a number representing the optimal quantity to order). Do not include any other text or markdown formatting outside the JSON.

Product Name: ${productName}
Category: ${categoryName}
Current Stock: ${currentStock}
Minimum Stock: ${minStock}
Sales Velocity (units/day, last ${salesPeriodDays} days): ${salesVelocity.toFixed(2)}
Total Quantity Sold (last ${salesPeriodDays} days): ${totalQuantitySold}
Total Sales Count (last ${salesPeriodDays} days): ${totalSalesCount}
${productDescription ? `Product Description: ${productDescription}` : ""}

Output JSON:`

    const { text } = await generateText({
      model: openai("gpt-4o"), // Using GPT-4o for better reasoning
      prompt: prompt,
      temperature: 0.5, // Adjust for creativity vs. consistency
      maxTokens: 250,
    })

    // Remove markdown code block delimiters if the AI includes them
    const cleanedText = text.replace(/^```json\s*|\s*```$/g, "").trim()

    // Attempt to parse the JSON output
    let parsedResponse
    try {
      parsedResponse = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", cleanedText, parseError)
      return NextResponse.json({ error: "AI response was not valid JSON" }, { status: 500 })
    }

    // Validate the structure of the parsed response, including the new field
    if (
      typeof parsedResponse.nature !== "string" ||
      !Array.isArray(parsedResponse.similar_types) ||
      (parsedResponse.suggested_restock_quantity !== undefined &&
        typeof parsedResponse.suggested_restock_quantity !== "number")
    ) {
      console.error("AI response has unexpected structure:", parsedResponse)
      return NextResponse.json({ error: "AI response has unexpected structure" }, { status: 500 })
    }

    return NextResponse.json(parsedResponse)
  } catch (error: any) {
    console.error("Error in AI restocking suggestions API:", error)
    // Check for specific AI SDK errors for better user feedback
    if (error.name === "AI_APICallError" && error.statusCode === 429) {
      return NextResponse.json(
        { error: "Rate limit reached. Please try again shortly or check your OpenAI plan." },
        { status: 429 },
      )
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
