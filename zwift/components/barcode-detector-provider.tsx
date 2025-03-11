"use client"

import type React from "react"
import { useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"

export function BarcodeDetectorProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()

  useEffect(() => {
    // Check if BarcodeDetector is already available
    if (typeof window !== "undefined" && !window.BarcodeDetector) {
      // Import our local polyfill
      import("@/lib/barcode-detector-polyfill")
        .then(() => {
          console.log("BarcodeDetector polyfill loaded")
        })
        .catch((error) => {
          console.error("Failed to load BarcodeDetector polyfill:", error)
          // Only show toast if user is on a page that might use barcode scanning
          if (window.location.pathname.includes("/inventory") || window.location.pathname.includes("/pos")) {
            toast({
              title: "Warning",
              description: "Barcode scanning may not be fully supported in your browser.",
              variant: "destructive",
            })
          }
        })
    }
  }, [toast])

  return <>{children}</>
}

