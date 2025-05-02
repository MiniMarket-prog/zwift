"use client"

// Create this file if it doesn't exist:
import { getProxiedImageUrl } from "./image-utils"

type Product = {
  id: string
  name: string
  image?: string | null
  // Add other product properties as needed
}

type ProductThumbnailListProps = {
  products: Product[]
  onSelectProduct: (productId: string) => void
  selectedProductId?: string | null
  className?: string
}

export const ProductThumbnailList = ({
  products,
  onSelectProduct,
  selectedProductId,
  className = "",
}: ProductThumbnailListProps) => {
  return (
    <div
      className={`flex flex-col items-center space-y-2 p-2 border rounded-md bg-background overflow-y-auto ${className}`}
    >
      {products.map((product) => (
        <div
          key={product.id}
          className={`w-10 h-10 rounded-md cursor-pointer transition-all flex items-center justify-center bg-white ${
            selectedProductId === product.id ? "ring-2 ring-primary" : "hover:bg-accent"
          }`}
          onClick={() => onSelectProduct(product.id)}
          title={product.name}
        >
          <img
            src={product.image ? getProxiedImageUrl(product.image) : "/placeholder.jpg"}
            alt={product.name}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.jpg"
              e.currentTarget.onerror = null
            }}
          />
        </div>
      ))}
      {products.length === 0 && <div className="text-center text-muted-foreground py-4">No products found</div>}
    </div>
  )
}
