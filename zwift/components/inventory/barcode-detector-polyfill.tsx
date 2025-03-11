"use client"

import { useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"

// This component loads a polyfill for the BarcodeDetector API
export function BarcodeDetectorPolyfill() {
  const { toast } = useToast()

  useEffect(() => {
    // Check if BarcodeDetector is already available
    if (typeof window !== "undefined" && !window.BarcodeDetector) {
      // Load the polyfill script
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/barcode-detector@2.2.3/dist/index.umd.min.js"
      script.async = true
      script.onload = () => {
        console.log("BarcodeDetector polyfill loaded")
      }
      script.onerror = () => {
        toast({
          title: "Warning",
          description: "Could not load barcode scanner support. Some features may not work.",
          variant: "destructive",
        })
      }
      document.body.appendChild(script)
    }
  }, [toast])

  return null
}

