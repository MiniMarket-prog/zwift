// Define a type for supported currencies
export type SupportedCurrency = "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "INR" | "CNY" | "BRL" | "MAD"

// Helper function to format currency
export function formatCurrency(amount: number, currency = "USD", language = "en"): string {
  // Basic currency formatting based on currency code
  const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CAD: "C$",
    AUD: "A$",
    INR: "₹",
    CNY: "¥",
    BRL: "R$",
    MAD: "DH",
  }

  // Default to the currency code if no symbol is found
  const symbol = currencySymbols[currency as SupportedCurrency] || currency

  // For MAD (Moroccan Dirham), the symbol comes after the amount
  if (currency === "MAD") {
    return `${amount.toFixed(2)} ${symbol}`
  }

  // For Arabic languages, format differently
  if (language.startsWith("ar")) {
    // Arabic formatting with the currency symbol on the right
    return `${amount.toFixed(2)} ${symbol}`
  }

  // For other currencies, the symbol comes before the amount
  return `${symbol}${amount.toFixed(2)}`
}

// Update the getCurrentCurrency function to properly handle the currency value
export async function getCurrentCurrency(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase.from("settings").select("currency").eq("type", "global").single()

    if (error) {
      console.error("Error fetching currency setting:", error)
      return "USD" // Default to USD if there's an error
    }

    // Make sure the currency is a string
    if (data?.currency && typeof data.currency === "string") {
      return data.currency
    }

    return "USD" // Default to USD if currency is not a string
  } catch (error) {
    console.error("Error in getCurrentCurrency:", error)
    return "USD" // Default to USD if there's an error
  }
}

// Create a function to get all supported currencies
export function getSupportedCurrencies(): { value: SupportedCurrency; label: string }[] {
  return [
    { value: "USD", label: "USD ($)" },
    { value: "EUR", label: "EUR (€)" },
    { value: "GBP", label: "GBP (£)" },
    { value: "JPY", label: "JPY (¥)" },
    { value: "CAD", label: "CAD (C$)" },
    { value: "AUD", label: "AUD (A$)" },
    { value: "INR", label: "INR (₹)" },
    { value: "CNY", label: "CNY (¥)" },
    { value: "BRL", label: "BRL (R$)" },
    { value: "MAD", label: "MAD (DH)" },
  ]
}

