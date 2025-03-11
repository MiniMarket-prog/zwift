// Simple BarcodeDetector polyfill
if (typeof window !== "undefined" && !window.BarcodeDetector) {
    // Create a minimal implementation that will prevent errors
    window.BarcodeDetector = class BarcodeDetector {
      static async getSupportedFormats() {
        return []
      }
  
      constructor(options?: { formats?: string[] }) {
        // Constructor implementation
      }
  
      async detect(image: ImageBitmapSource): Promise<any[]> {
        console.warn("BarcodeDetector polyfill: actual detection not implemented")
        return []
      }
    } as any
  }
  
  export {}
  
  