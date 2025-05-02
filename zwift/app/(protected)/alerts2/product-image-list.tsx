"use client"

import { useState, useEffect } from "react"
import { getProxiedImageUrl } from "./image-utils"

type Product = {
  id: string
  name: string
  image?: string | null
  barcode?: string
}

type ProductImageListProps = {
  products: Product[]
  onSelectProduct?: (productId: string) => void
  selectedProductId?: string
  size?: "small" | "medium" | "large"
}

export function ProductImageList({
  products,
  onSelectProduct,
  selectedProductId,
  size = "small",
}: ProductImageListProps) {
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({})

  // Track which images have loaded successfully
  useEffect(() => {
    const newLoadedImages: Record<string, boolean> = {}

    products.forEach((product) => {
      if (product.image) {
        const img = new Image()
        img.onload = () => {
          setLoadedImages((prev) => ({
            ...prev,
            [product.id]: true,
          }))
        }
        img.onerror = () => {
          setLoadedImages((prev) => ({
            ...prev,
            [product.id]: false,
          }))
        }
        img.src = getProxiedImageUrl(product.image)
      }
    })

    return () => {
      // Clean up by removing any pending image loads
      products.forEach((product) => {
        if (product.image) {
          const img = new Image()
          img.onload = null
          img.onerror = null
        }
      })
    }
  }, [products])

  // Determine image size based on the size prop
  const getImageSize = () => {
    switch (size) {
      case "small":
        return "w-10 h-10"
      case "medium":
        return "w-16 h-16"
      case "large":
        return "w-24 h-24"
      default:
        return "w-10 h-10"
    }
  }

  const imageSize = getImageSize()

  return (
    <div className="flex flex-col space-y-2 overflow-y-auto max-h-[80vh] p-2">
      {products.map((product) => (
        <div
          key={product.id}
          className={`
            flex flex-col items-center p-1 rounded-md cursor-pointer transition-all
            ${selectedProductId === product.id ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted"}
          `}
          onClick={() => onSelectProduct?.(product.id)}
        >
          <div className={`${imageSize} relative bg-white rounded-md overflow-hidden border`}>
            <img
              src={product.image ? getProxiedImageUrl(product.image) : "/placeholder.svg?height=100&width=100"}
              alt={product.name}
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg?height=100&width=100"
                e.currentTarget.onerror = null
              }}
            />
          </div>
          <span className="text-xs text-center mt-1 truncate w-full">
            {product.name.length > 15 ? `${product.name.substring(0, 15)}...` : product.name}
          </span>
        </div>
      ))}
    </div>
  )
}
