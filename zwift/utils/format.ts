/**
 * Safely formats a number with the specified number of decimal places
 * @param value The number to format
 * @param decimals The number of decimal places
 * @param fallback The fallback value if the input is null or undefined
 * @returns The formatted number as a string
 */
export function formatNumber(value: number | null | undefined, decimals = 2, fallback = "0"): string {
    if (value === null || value === undefined) {
      return fallback
    }
  
    return typeof value === "number" ? value.toFixed(decimals) : String(value)
  }
  
  