"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase-client"
import { formatCurrency, type SupportedCurrency } from "@/lib/format-currency"

export function useCurrency() {
  const [currency, setCurrency] = useState<SupportedCurrency>("USD")
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchCurrency = useCallback(async () => {
    try {
      setIsLoading(true)
      console.log("Fetching currency...")
      const { data, error } = await supabase.from("settings").select("*").eq("type", "global").single()

      if (error) {
        console.error("Error fetching currency setting:", error)
        return
      }

      console.log("Fetched settings data:", data)

      // Check if settings.settings exists and is an object
      if (data?.settings && typeof data.settings === "object" && data.settings !== null) {
        // Check if currency exists in settings
        if ("currency" in data.settings && typeof data.settings.currency === "string") {
          console.log("Setting currency from settings.settings.currency:", data.settings.currency)
          setCurrency(data.settings.currency as SupportedCurrency)
          return
        }
      }

      // Fallback to the currency field if it exists
      if (data?.currency && typeof data.currency === "string") {
        console.log("Setting currency from settings.currency:", data.currency)
        setCurrency(data.currency as SupportedCurrency)
      }
    } catch (error) {
      console.error("Error in fetchCurrency:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Initial fetch
  useEffect(() => {
    fetchCurrency()
  }, [fetchCurrency])

  const format = (amount: number): string => {
    return formatCurrency(amount, currency)
  }

  return {
    currency,
    format,
    isLoading,
    refetch: fetchCurrency,
  }
}

