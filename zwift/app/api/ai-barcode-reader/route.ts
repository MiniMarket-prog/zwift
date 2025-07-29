import { type NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

// Schema for AI barcode reading result
const BarcodeReadingSchema = z.object({
  barcode: z.string().describe("The barcode number detected in the image"),
  confidence: z.number().min(0).max(1).describe("Confidence level of the barcode detection (0-1)"),
  barcodeType: z.string().optional().describe("Type of barcode detected (EAN-13, UPC, etc.)"),
  isValid: z.boolean().describe("Whether the detected barcode appears to be valid"),
  extractedDigits: z.array(z.string()).describe("Individual digits or characters detected"),
  reasoning: z.string().describe("Brief explanation of what was seen and why this confidence level"),
})

export async function POST(req: NextRequest) {
  try {
    const { image, mode = "manual" } = await req.json()

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, "")

    console.log(`🤖 AI barcode reading (${mode} mode)...`)

    // Adjust prompt based on mode
    const isRealTimeMode = mode === "realtime"
    const confidenceThreshold = isRealTimeMode ? 0.8 : 0.6

    // Use OpenAI's vision model to read the barcode
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: BarcodeReadingSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a specialized barcode reader AI. Analyze this image and extract the barcode number.

${
  isRealTimeMode
    ? `
REAL-TIME MODE - BE VERY CONSERVATIVE:
- Only return results with 80%+ confidence
- If you're not absolutely sure, set confidence below 0.8
- Focus on clear, unambiguous barcodes only
`
    : `
MANUAL MODE - BE THOROUGH BUT CAREFUL:
- Examine the image carefully for any barcode
- If you see partial or unclear digits, note this in confidence
- Only return results you're reasonably confident about
`
}

INSTRUCTIONS:
1. Look for vertical black and white lines (barcode pattern)
2. Find the numbers below or near the barcode lines
3. Read each digit carefully from left to right
4. Common formats: EAN-13 (13 digits), UPC-A (12 digits), EAN-8 (8 digits)
5. Ignore any other text that's not part of the barcode number

CONFIDENCE GUIDELINES:
- 0.9-1.0: Perfect clarity, all digits crystal clear
- 0.8-0.9: Very clear, minor lighting/angle issues
- 0.7-0.8: Clear but some digits slightly unclear
- 0.6-0.7: Readable but some uncertainty
- 0.5-0.6: Partially readable, several digits unclear
- Below 0.5: Too unclear to be reliable

IMPORTANT:
- Only return actual barcode digits (numbers only)
- If multiple barcodes exist, choose the clearest one
- Be honest about confidence - better to be conservative
- Explain your reasoning briefly

Extract the barcode number as accurately as possible.`,
            },
            {
              type: "image",
              image: base64Image,
            },
          ],
        },
      ],
      temperature: 0.1, // Very low temperature for consistent results
    })

    // Clean and validate barcode
    const cleanBarcode = result.object.barcode.replace(/\D/g, "") // Remove non-digits
    const validLengths = [8, 12, 13, 14] // Common barcode lengths
    const isValidLength = validLengths.includes(cleanBarcode.length)

    // Apply mode-specific confidence filtering
    const meetsConfidenceThreshold = result.object.confidence >= confidenceThreshold

    console.log(
      `✅ AI barcode reading completed: ${cleanBarcode} (${Math.round(result.object.confidence * 100)}% confidence)`,
    )
    console.log(`Reasoning: ${result.object.reasoning}`)

    return NextResponse.json({
      ...result.object,
      barcode: cleanBarcode,
      isValid: result.object.isValid && isValidLength && cleanBarcode.length >= 8 && meetsConfidenceThreshold,
      mode: mode,
      confidenceThreshold: confidenceThreshold,
    })
  } catch (error: any) {
    console.error("❌ Error in AI barcode reading:", error)

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

    return NextResponse.json(
      {
        error: "Failed to read barcode from image. Please try again.",
        barcode: "",
        confidence: 0,
        isValid: false,
      },
      { status: 500 },
    )
  }
}
