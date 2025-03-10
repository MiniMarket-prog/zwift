// This is a simple error suppression for the cookies warning
// It works by overriding console.error

// Only run this code if we're in a browser environment
if (typeof window !== "undefined") {
    const originalError = console.error
  
    console.error = function (...args) {
      // Check if this is the cookies().get() error
      if (args[0] && typeof args[0] === "object" && args[0].message && args[0].message.includes("cookies().get")) {
        // Suppress this specific error
        return
      }
  
      // Pass through all other errors
      return originalError.apply(this, args)
    }
  }
  
  