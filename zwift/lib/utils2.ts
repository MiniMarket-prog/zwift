import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price)
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

