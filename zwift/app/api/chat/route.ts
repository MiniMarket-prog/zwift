import { streamText, type UIMessage } from "ai"
import { openai } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  let messages: UIMessage[]
  try {
    const body = await req.json()
    if (!body.messages || !Array.isArray(body.messages)) {
      throw new Error("Invalid or missing 'messages' in request body.")
    }

    // Directly assign body.messages. The useChat hook already provides messages
    // in the correct UIMessage format with 'parts' property.
    messages = body.messages as UIMessage[]

    console.log("Messages received from client (UIMessage[]):", JSON.stringify(messages, null, 2))
  } catch (parseError: any) {
    console.error("Request parsing or validation error:", parseError)
    return NextResponse.json(
      { error: `Invalid request: ${parseError.message || "Could not parse request body."}` },
      { status: 400 },
    )
  }

  try {
    const result = await streamText({
      model: openai("gpt-4o"), // Using GPT-4o for better reasoning
      messages: messages, // Pass messages directly without convertToCoreMessages
      system: "You are a helpful assistant.", // Simplified system prompt
      // Temporarily remove tools to isolate text streaming
      // tools: { ... }
    })

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error("Error during AI stream processing (getErrorMessage):", error)
        if (error == null) {
          return "An unknown error occurred during AI stream processing."
        }
        if (typeof error === "string") {
          return `AI Stream Error: ${error}`
        }
        if (error instanceof Error) {
          if (error.name === "AI_APICallError") {
            const apiError = error as any
            if (apiError.statusCode === 429) {
              return "Rate limit reached. Please try again shortly or check your OpenAI plan."
            }
            return `OpenAI API Error: ${apiError.message || "An unknown error occurred with the OpenAI API."}`
          }
          return `AI Stream Error: ${error.message}`
        }
        return `An unexpected error occurred: ${JSON.stringify(error)}`
      },
    })
  } catch (error: any) {
    console.error(
      "Critical AI chat API initialization error (outer catch):",
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
    )

    let clientErrorMessage = "A critical error occurred initializing the AI assistant."
    let statusCode = 500

    if (error.name === "AI_APICallError") {
      statusCode = error.statusCode || 500
      if (statusCode === 429) {
        clientErrorMessage = "Rate limit reached. Please try again shortly or check your OpenAI plan."
      } else {
        clientErrorMessage = `OpenAI API Initialization Error: ${error.message || "An unknown error occurred."}`
      }
    }
    // Check if the error is a TypeError related to 'typeName'
    else if (error instanceof TypeError && error.message.includes("reading 'typeName'")) {
      clientErrorMessage = "A client-side rendering error occurred. Please check the console for details."
      statusCode = 500 // Still a server-side issue causing client-side failure
    } else if (error instanceof Error) {
      clientErrorMessage = `Server initialization error: ${error.message}`
    } else {
      clientErrorMessage = `Unknown initialization error: ${JSON.stringify(error)}`
    }

    return NextResponse.json({ error: clientErrorMessage }, { status: statusCode })
  }
}
