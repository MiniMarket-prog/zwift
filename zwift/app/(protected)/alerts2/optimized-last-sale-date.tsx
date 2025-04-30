"use client"

import { useCallback, useState } from "react"
import { createClient } from "@/lib/supabase-client"

// Type for the hook return value
type UseLastSaleDatesReturn = {
  lastSaleDates: Record<string, string>
  productDetails: Record<string, { name: string; barcode?: string }>
  isLoading: boolean
  fetchLastSaleDates: () => Promise<void>
  formatLastSaleDate: (dateString?: string) => string
}

/**
 * Custom hook to fetch and manage last sale dates for products
 * Uses optimized database queries for better performance
 */
export const useLastSaleDates = (): UseLastSaleDatesReturn => {
  const [lastSaleDates, setLastSaleDates] = useState<Record<string, string>>({})
  const [productDetails, setProductDetails] = useState<Record<string, { name: string; barcode?: string }>>({})
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // Helper function to safely get product info regardless of format
  const getProductInfo = useCallback((product: any) => {
    if (!product) return null

    if (Array.isArray(product)) {
      return product.length > 0 ? product[0] : null
    }

    return product
  }, [])

  // Optimized function to fetch last sale dates with product details
  const fetchLastSaleDates = useCallback(async () => {
    setIsLoading(true)
    try {
      // Try the most efficient method first (requires database function)
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_last_sale_dates_with_products")

      if (!rpcError && rpcData) {
        // Process the RPC results
        const lastSaleDates: Record<string, string> = {}
        const productDetails: Record<string, { name: string; barcode?: string }> = {}

        rpcData.forEach((item: any) => {
          if (item.product_id && item.last_sale_date) {
            lastSaleDates[item.product_id] = item.last_sale_date

            // Store product details if available
            if (item.product_name) {
              productDetails[item.product_id] = {
                name: item.product_name,
                barcode: item.product_barcode,
              }
            }
          }
        })

        setLastSaleDates(lastSaleDates)
        setProductDetails(productDetails)
        return
      }

      // Fallback to optimized query if RPC isn't available
      // IMPORTANT: Changed to order by sales.created_at instead of sale_id
      const { data, error } = await supabase
        .from("sale_items")
        .select(
          `
          product_id,
          sales:sale_id(created_at),
          product:product_id(name, barcode)
        `,
        )
        .order("sales.created_at", { ascending: false })

      if (error) throw error

      // Process the results using a Map for better performance
      const productDateMap = new Map<string, string>()
      const productDetailsMap = new Map<string, { name: string; barcode?: string }>()

      if (data) {
        data.forEach((item: any) => {
          const productId = item.product_id
          const saleDate = Array.isArray(item.sales) ? item.sales[0]?.created_at : item.sales?.created_at
          const productInfo = getProductInfo(item.product)

          if (productId && saleDate && !productDateMap.has(productId)) {
            productDateMap.set(productId, saleDate)

            if (productInfo) {
              productDetailsMap.set(productId, {
                name: productInfo.name || "Unknown",
                barcode: productInfo.barcode,
              })
            }
          }
        })
      }

      // Convert Maps to records
      const lastSaleDates: Record<string, string> = {}
      const productDetails: Record<string, { name: string; barcode?: string }> = {}

      productDateMap.forEach((date, productId) => {
        lastSaleDates[productId] = date
      })

      productDetailsMap.forEach((details, productId) => {
        productDetails[productId] = details
      })

      setLastSaleDates(lastSaleDates)
      setProductDetails(productDetails)
    } catch (error) {
      console.error("Error fetching last sale dates:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, getProductInfo])

  // Format date to a user-friendly string
  const formatLastSaleDate = useCallback((dateString?: string) => {
    if (!dateString) return "No recent sales"

    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }, [])

  return {
    lastSaleDates,
    productDetails,
    isLoading,
    fetchLastSaleDates,
    formatLastSaleDate,
  }
}
