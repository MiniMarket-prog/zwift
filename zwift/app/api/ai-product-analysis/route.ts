import { type NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

// Schema for AI analysis result
const ProductAnalysisSchema = z.object({
  productName: z.string().describe("The name of the product identified in the image"),
  confidence: z.number().min(0).max(1).describe("Confidence level of the identification (0-1)"),
  description: z.string().describe("Detailed description of the product"),
  suggestedCategory: z.string().describe("Suggested product category"),
  extractedText: z.array(z.string()).describe("Any text visible on the product or packaging"),
  estimatedPrice: z.number().optional().describe("Estimated price range for this product"),
  brandName: z.string().optional().describe("Brand name if visible"),
  productType: z.string().optional().describe("Type of product (e.g., beverage, snack, etc.)"),
  keyFeatures: z.array(z.string()).describe("Key features or characteristics visible in the image"),
})

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, "")

    console.log("🤖 Analyzing product image with AI...")

    // Use OpenAI's vision model to analyze the product
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: ProductAnalysisSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this product image and identify the product. Focus on:
              
              1. Product name and brand (look for text on packaging)
              2. Product type and category
              3. Key visual features and characteristics
              4. Any text visible on the product or packaging
              5. Estimated price range based on product type and appearance
              
              Be as specific as possible with the product name. If you can see brand names, product names, or other text on the packaging, include them. Look for barcodes, nutritional information, logos, and any other identifying features.
              
              For confidence level: 
              - 0.9-1.0: Very clear product with visible text/branding
              - 0.7-0.9: Clear product but some uncertainty
              - 0.5-0.7: Recognizable product type but unclear specifics
              - 0.3-0.5: General product category identifiable
              - 0.0-0.3: Very unclear or unidentifiable
              
              Provide practical information that would help someone manage inventory for a mini-market.`,
            },
            {
              type: "image",
              image: base64Image,
            },
          ],
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent results
    })

    console.log("✅ AI analysis completed:", result.object.productName)

    return NextResponse.json(result.object)
  } catch (error: any) {
    console.error("❌ Error in AI product analysis:", error)

    // Handle specific OpenAI errors
    if (error.name === "AI_APICallError") {
      if (error.statusCode === 429) {
        return NextResponse.json(
          { error: "AI service rate limit reached. Please try again in a moment." },
          { status: 429 },
        )
      } else if (error.statusCode === 400) {
        return NextResponse.json({ error: "Invalid image format. Please try a different image." }, { status: 400 })
      }
    }

    return NextResponse.json({ error: "Failed to analyze image. Please try again." }, { status: 500 })
  }
}
