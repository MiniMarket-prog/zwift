"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useCurrency } from "@/hooks/use-currency"
import { getSupportedCurrencies, type SupportedCurrency } from "@/lib/format-currency"
import { updateCurrency } from "@/actions/update-currency"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface CurrencySelectorProps {
  showLabel?: boolean
  showSaveButton?: boolean
  onCurrencyChange?: (currency: SupportedCurrency) => void
}

export function CurrencySelector({
  showLabel = true,
  showSaveButton = false,
  onCurrencyChange,
}: CurrencySelectorProps) {
  const { currency, isLoading, refetch } = useCurrency()
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>("USD")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const currencies = getSupportedCurrencies()

  // Update local state when the currency from the hook changes
  useEffect(() => {
    if (currency && !isLoading && currency !== selectedCurrency) {
      setSelectedCurrency(currency)
    }
  }, [currency, isLoading, selectedCurrency])

  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as SupportedCurrency
    setSelectedCurrency(newCurrency)

    if (onCurrencyChange) {
      onCurrencyChange(newCurrency)
    }

    // If we're not showing a save button, save immediately
    if (!showSaveButton) {
      handleSave(newCurrency)
    }
  }

  const handleSave = async (currencyToSave: SupportedCurrency = selectedCurrency) => {
    setIsSaving(true)
    try {
      console.log("Saving currency:", currencyToSave)
      const result = await updateCurrency(currencyToSave)
      console.log("Update result:", result)

      if (result.success) {
        toast({
          title: "Currency updated",
          description: `Currency has been set to ${currencyToSave}`,
        })

        // Refetch the currency to update the UI
        if (refetch) {
          await refetch()
        }
      } else {
        console.error("Failed to update currency:", result.error)
        toast({
          title: "Error",
          description: "Failed to update currency",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving currency:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2">
      {showLabel && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Currency
        </label>
      )}
      <div className="flex gap-2">
        <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((curr) => (
              <SelectItem key={curr.value} value={curr.value}>
                {curr.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showSaveButton && (
          <Button onClick={() => handleSave()} disabled={isSaving || selectedCurrency === currency}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

