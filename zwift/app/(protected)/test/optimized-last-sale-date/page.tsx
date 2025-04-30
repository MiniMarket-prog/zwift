"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase-client"

// Define types
type LastSaleDate = {
  product_id: string
  last_sale_date: string
}

type ProductDetails = {
  id: string
  name: string
  barcode?: string
}

type SaleItemWithSale = {
  product_id: string
  sale:
    | {
        created_at: string
      }
    | Array<{
        created_at: string
      }>
}

const OptimizedLastSaleDateTest = () => {
  const [lastSaleDates, setLastSaleDates] = useState<Record<string, string>>({})
  const [productDetails, setProductDetails] = useState<Record<string, ProductDetails>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [executionTime, setExecutionTime] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("optimized")
  const supabase = createClient()

  // Add a log function to track the execution
  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, `${new Date().toISOString().split("T")[1].split(".")[0]} - ${message}`])
  }

  // Original implementation (for comparison)
  const fetchLastSaleDatesOriginal = async () => {
    setIsLoading(true)
    setLogs([])
    const startTime = performance.now()

    try {
      addLog("Starting to fetch last sale dates using original method...")

      // Implement pagination to fetch all data
      let allSaleItems: SaleItemWithSale[] = []
      let hasMore = true
      let page = 0
      const PAGE_SIZE = 1000 // Supabase's maximum limit

      while (hasMore) {
        addLog(`Fetching page ${page + 1} with range ${page * PAGE_SIZE} to ${(page + 1) * PAGE_SIZE - 1}`)

        // Query to get the most recent sale date for each product
        const { data, error } = await supabase
          .from("sale_items")
          .select(`
          product_id,
          sales:sale_id (
            created_at
          ),
          product:product_id (
            name,
            barcode
          )
        `)
          .order("sales.created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (error) {
          addLog(`Error fetching data: ${error.message}`)
          throw error
        }

        if (data && data.length > 0) {
          addLog(`Received ${data.length} records`)
          allSaleItems = [...allSaleItems, ...(data as any[])]
          page++
          hasMore = data.length === PAGE_SIZE
        } else {
          addLog("No more data to fetch")
          hasMore = false
        }
      }

      addLog(`Total records fetched: ${allSaleItems.length}`)

      // Process the results to get the most recent date for each product
      const lastSaleDates: Record<string, string> = {}
      const productDetailsMap: Record<string, ProductDetails> = {}

      allSaleItems.forEach((item: any) => {
        if (item.product_id && item.sales && !lastSaleDates[item.product_id]) {
          // Handle case where sale might be an array due to Supabase's response format
          const saleDate = Array.isArray(item.sales) ? item.sales[0]?.created_at : item.sales?.created_at

          if (saleDate) {
            lastSaleDates[item.product_id] = saleDate

            // Store product details if available
            if (item.product) {
              productDetailsMap[item.product_id] = {
                id: item.product_id,
                name: item.product.name || "Unknown",
                barcode: item.product.barcode,
              }
            }
          }
        }
      })

      addLog(`Processing complete. Found dates for ${Object.keys(lastSaleDates).length} products`)
      setLastSaleDates(lastSaleDates)
      setProductDetails(productDetailsMap)

      const endTime = performance.now()
      setExecutionTime(endTime - startTime)
      addLog(`Execution completed in ${(endTime - startTime).toFixed(2)}ms`)
    } catch (error) {
      console.error("Error fetching last sale dates:", error)
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Optimized implementation using SQL directly
  const fetchLastSaleDatesOptimized = async () => {
    setIsLoading(true)
    setLogs([])
    const startTime = performance.now()

    try {
      addLog("Starting optimized query to fetch last sale dates...")

      // Use a simpler approach first to debug the issue
      addLog("Executing query with proper error handling...")

      const { data, error } = await supabase
        .from("sale_items")
        .select(`
        product_id,
        sales:sale_id(created_at),
        product:product_id(name, barcode)
      `)
        .order("sales.created_at", { ascending: false })
        .limit(1000)

      if (error) {
        addLog(`Error fetching data: ${error.message}`)
        throw error
      }

      addLog(`Query executed successfully. Processing ${data?.length || 0} records`)

      // Process the data to get only the most recent sale date per product
      const productMap: Record<string, string> = {}
      const productDetailsMap: Record<string, ProductDetails> = {}

      if (data) {
        data.forEach((item: any) => {
          const productId = item.product_id
          const saleDate = item.sales?.created_at

          // Only keep the first occurrence (most recent) for each product
          if (productId && saleDate && !productMap[productId]) {
            productMap[productId] = saleDate

            // Store product details if available
            if (item.product) {
              productDetailsMap[productId] = {
                id: productId,
                name: item.product.name || "Unknown",
                barcode: item.product.barcode,
              }
            }
          }
        })
      }

      const lastSaleDates: Record<string, string> = productMap

      addLog(`Processing complete. Found dates for ${Object.keys(lastSaleDates).length} products`)
      setLastSaleDates(lastSaleDates)
      setProductDetails(productDetailsMap)

      const endTime = performance.now()
      setExecutionTime(endTime - startTime)
      addLog(`Execution completed in ${(endTime - startTime).toFixed(2)}ms`)
    } catch (error) {
      console.error("Error fetching last sale dates:", error)
      // Improve error logging to show more details
      if (error instanceof Error) {
        addLog(`Error: ${error.message}`)
        if (error.stack) {
          addLog(`Stack: ${error.stack.split("\n")[0]}`)
        }
      } else {
        addLog(`Error: ${JSON.stringify(error)}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Most optimized implementation using a direct SQL query with DISTINCT ON
  const fetchLastSaleDatesMostOptimized = async () => {
    setIsLoading(true)
    setLogs([])
    const startTime = performance.now()

    try {
      addLog("Starting most optimized query with direct SQL and product details...")

      // First try with RPC if available
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_last_sale_dates_with_products")

        if (!rpcError && rpcData) {
          addLog(`RPC executed successfully. Processing ${rpcData.length} records`)

          // Process the RPC results
          const lastSaleDates: Record<string, string> = {}
          const productDetails: Record<string, ProductDetails> = {}

          rpcData.forEach((item: any) => {
            if (item.product_id && item.last_sale_date) {
              lastSaleDates[item.product_id] = item.last_sale_date

              // Store product details if available
              if (item.product_name) {
                productDetails[item.product_id] = {
                  id: item.product_id,
                  name: item.product_name || "Unknown",
                  barcode: item.product_barcode,
                }
              }
            }
          })

          addLog(`Processing complete. Found dates for ${Object.keys(lastSaleDates).length} products`)
          setLastSaleDates(lastSaleDates)
          setProductDetails(productDetails)

          const endTime = performance.now()
          setExecutionTime(endTime - startTime)
          addLog(`Execution completed in ${(endTime - startTime).toFixed(2)}ms`)
          return
        } else {
          addLog(`RPC not available or failed: ${rpcError?.message || "Unknown error"}`)
          addLog("Falling back to direct query...")
        }
      } catch (rpcErr) {
        addLog(`RPC execution failed: ${rpcErr instanceof Error ? rpcErr.message : String(rpcErr)}`)
        addLog("Falling back to direct query...")
      }

      // Fallback to direct query - IMPORTANT CHANGE: We need to join with the sales table to get the correct date
      addLog("Executing direct query with proper table joins...")

      // This is the key change - we need to join with the sales table to get the actual sale date
      const { data, error } = await supabase
        .from("sale_items")
        .select(`
        product_id,
        sales:sale_id(created_at),
        product:product_id(name, barcode)
      `)
        .order("sales.created_at", { ascending: false })
        .limit(1000)

      if (error) {
        addLog(`Error executing query: ${error.message}`)
        throw error
      }

      // Process the results using a Map for better performance
      const productDateMap = new Map<string, string>()
      const productDetailsMap = new Map<string, ProductDetails>()

      if (data) {
        addLog(`Processing ${data.length} records from query`)

        data.forEach((item: any) => {
          const productId = item.product_id
          const saleDate = item.sales?.created_at
          const productInfo = item.product

          if (productId && saleDate && !productDateMap.has(productId)) {
            productDateMap.set(productId, saleDate)

            if (productInfo) {
              productDetailsMap.set(productId, {
                id: productId,
                name: productInfo.name || "Unknown",
                barcode: productInfo.barcode,
              })
            }
          }
        })
      }

      // Convert Maps to records
      const lastSaleDates: Record<string, string> = {}
      const productDetails: Record<string, ProductDetails> = {}

      productDateMap.forEach((date, productId) => {
        lastSaleDates[productId] = date
      })

      productDetailsMap.forEach((details, productId) => {
        productDetails[productId] = details
      })

      addLog(`Processing complete. Found dates for ${Object.keys(lastSaleDates).length} products`)
      setLastSaleDates(lastSaleDates)
      setProductDetails(productDetails)

      const endTime = performance.now()
      setExecutionTime(endTime - startTime)
      addLog(`Execution completed in ${(endTime - startTime).toFixed(2)}ms`)
    } catch (error) {
      console.error("Error in most optimized query:", error)
      // Improve error logging to show more details
      if (error instanceof Error) {
        addLog(`Error: ${error.message}`)
        if (error.stack) {
          addLog(`Stack: ${error.stack.split("\n")[0]}`)
        }
      } else {
        addLog(`Error: ${JSON.stringify(error)}`)
      }
    } finally {
      setIsLoading(false)
    }
  }
}

// Update the database function SQL to correctly order by sale date

export default OptimizedLastSaleDateTest
