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
})

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, "")

    console.log("🤖 AI is reading barcode from image...")

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

INSTRUCTIONS:
1. Look carefully for any barcode (vertical black and white lines)
2. Focus on the numbers below or near the barcode lines
3. Read each digit carefully from left to right
4. Common barcode formats: EAN-13 (13 digits), UPC-A (12 digits), EAN-8 (8 digits)
5. Ignore any other text that's not part of the barcode number

IMPORTANT:
- Only return the actual barcode digits (numbers only)
- If the barcode is partially obscured, try to read what you can see clearly
- Set confidence based on how clear and readable the barcode is
- If you see multiple barcodes, focus on the most prominent/clear one
- Barcodes are usually 8, 12, or 13 digits long

CONFIDENCE LEVELS:
- 0.9-1.0: Very clear, all digits easily readable
- 0.7-0.9: Clear but some digits might be slightly unclear
- 0.5-0.7: Partially readable, some digits unclear
- 0.3-0.5: Difficult to read, many digits unclear
- 0.0-0.3: Barcode barely visible or unreadable

Extract the barcode number as accurately as possible.`,
            },
            {
              type: "image",
              image: base64Image,
            },
          ],
        },
      ],
      temperature: 0.1, // Very low temperature for consistent barcode reading
    })

    console.log("✅ AI barcode reading completed:", result.object.barcode, "confidence:", result.object.confidence)

    // Validate barcode length and format
    const barcode = result.object.barcode.replace(/\D/g, "") // Remove non-digits
    const validLengths = [8, 12, 13, 14] // Common barcode lengths
    const isValidLength = validLengths.includes(barcode.length)

    return NextResponse.json({
      ...result.object,
      barcode: barcode,
      isValid: result.object.isValid && isValidLength && barcode.length >= 8,
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

    return NextResponse.json({ error: "Failed to read barcode from image. Please try again." }, { status: 500 })
  }
}
