import { type NextRequest, NextResponse } from "next/server"

/**
 * API route that proxies image requests to avoid CORS issues
 * @param req The incoming request
 * @returns The proxied image response
 */
export async function GET(req: NextRequest) {
  try {
    // Get the URL from the query parameters
    const url = req.nextUrl.searchParams.get("url")

    if (!url) {
      return new NextResponse("Missing URL parameter", { status: 400 })
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        // Set appropriate headers to avoid CORS issues
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: new URL(url).origin,
      },
    })

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status })
    }

    // Get the image data
    const imageData = await response.arrayBuffer()

    // Get the content type from the response
    const contentType = response.headers.get("content-type") || "image/jpeg"

    // Return the image with appropriate headers
    return new NextResponse(imageData, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error) {
    console.error("Error proxying image:", error)
    return new NextResponse("Error proxying image", { status: 500 })
  }
}
