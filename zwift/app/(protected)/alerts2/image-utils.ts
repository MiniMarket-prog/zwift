/**
 * Utility functions for handling images in the alerts page
 */

/**
 * Checks if an image URL is valid and accessible
 * @param url The image URL to check
 * @returns Promise that resolves to true if the image is valid, false otherwise
 */
export const isValidImageUrl = async (url: string): Promise<boolean> => {
  if (!url) return false

  try {
    // Try to fetch the image through our proxy
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`
    const response = await fetch(proxyUrl, { method: "HEAD" })
    // Ensure we always return a boolean by using !! to convert to boolean
    return response.ok && !!response.headers.get("content-type")?.startsWith("image/")
  } catch (error) {
    console.error("Error validating image URL:", error)
    return false
  }
}

// Update the getProxiedImageUrl function to use the SVG placeholder
export const getProxiedImageUrl = (url: string): string => {
  if (!url) return "/placeholder.svg?height=200&width=200"

  // Clean up the URL first - remove any newlines or extra spaces
  const cleanUrl = url.trim().replace(/\n/g, "").replace(/\s+/g, " ")

  // Check if it's already a valid URL format
  if (cleanUrl.startsWith("http") || cleanUrl.startsWith("/")) {
    // For external URLs, use the proxy
    if (cleanUrl.startsWith("http") && !cleanUrl.includes(window.location.hostname)) {
      return `/api/image-proxy?url=${encodeURIComponent(cleanUrl)}`
    }
    // Return the URL as is for local URLs
    return cleanUrl
  }

  // For relative paths that don't start with slash, add one
  if (!cleanUrl.startsWith("/")) {
    return `/${cleanUrl}`
  }

  // Return placeholder for anything else
  return "/placeholder.svg?height=200&width=200"
}

// Add a new function to sanitize image URLs for display
export const sanitizeImageUrl = (url: string): string => {
  if (!url) return ""

  // Remove any newlines and trim
  return url.trim().replace(/\n/g, "")
}

// Update the preloadImage function to better handle errors
export const preloadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    // If URL is empty, reject
    if (!url) {
      reject(new Error("Empty image URL"))
      return
    }

    // Clean the URL
    const cleanUrl = sanitizeImageUrl(url)

    // If URL contains suspicious patterns that look like a file path rather than a URL, reject
    if (cleanUrl.includes("/uploads/") && !cleanUrl.startsWith("http") && !cleanUrl.startsWith("/")) {
      console.error(`Invalid image URL format: ${cleanUrl}`)
      reject(new Error(`Invalid image URL format: ${cleanUrl}`))
      return
    }

    const img = new Image()
    img.crossOrigin = "anonymous" // Important for CORS
    img.decoding = "sync" // For better performance

    // Set up event handlers before setting src
    img.onload = () => resolve(img)
    img.onerror = () => {
      console.error(`Failed to load image: ${cleanUrl}`)
      reject(new Error(`Failed to load image: ${cleanUrl}`))
    }

    // Use proxied URL
    img.src = getProxiedImageUrl(cleanUrl)
  })
}

// Add the missing imageToBase64 function that was referenced in the code
export const imageToBase64 = (img: HTMLImageElement, width: number, height: number): string => {
  const canvas = document.createElement("canvas")
  // Set canvas size to the requested dimensions
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not get canvas context")

  // Enhanced image smoothing settings for better quality at larger sizes
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  // Fill with white background first to ensure transparency is handled correctly
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, width, height)

  // Calculate aspect ratio to preserve proportions
  const imgRatio = img.naturalWidth / img.naturalHeight
  const targetRatio = width / height

  let drawWidth = width
  let drawHeight = height
  let offsetX = 0
  let offsetY = 0

  // Preserve aspect ratio while filling the entire area
  if (imgRatio > targetRatio) {
    // Image is wider than canvas
    drawHeight = width / imgRatio
    offsetY = (height - drawHeight) / 2
  } else {
    // Image is taller than canvas
    drawWidth = height * imgRatio
    offsetX = (width - drawWidth) / 2
  }

  // Draw image centered on canvas
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

  // Convert to base64 with higher quality JPEG
  return canvas.toDataURL("image/jpeg", 0.95) // Use 95% quality for JPEG
}

// Add a function to create a fixed-size image for PDF export
export const createFixedSizeImageForPDF = (img: HTMLImageElement, size: number): string => {
  // Create a canvas element
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    console.error("Could not get canvas context")
    return ""
  }

  // Fill with white background
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, size, size)

  // Calculate dimensions to maintain aspect ratio
  const imgWidth = img.width
  const imgHeight = img.height
  let drawWidth = size
  let drawHeight = size
  let offsetX = 0
  let offsetY = 0

  if (imgWidth > imgHeight) {
    // Landscape image
    drawHeight = (imgHeight / imgWidth) * size
    offsetY = (size - drawHeight) / 2
  } else if (imgHeight > imgWidth) {
    // Portrait image
    drawWidth = (imgWidth / imgHeight) * size
    offsetX = (size - drawWidth) / 2
  }

  // Draw the image centered in the canvas
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

  // Return as data URL
  return canvas.toDataURL("image/jpeg", 0.95)
}
