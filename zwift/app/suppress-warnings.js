// This file suppresses specific Next.js warnings
if (typeof window !== "undefined") {
    // Only run on client side
    const originalConsoleError = console.error
  
    console.error = function (...args) {
      // Check if this is the cookies().get() error from Supabase
      if (
        args[0] &&
        typeof args[0] === "object" &&
        args[0].message &&
        args[0].message.includes("cookies().get") &&
        args[0].message.includes("sb-")
      ) {
        // Suppress this specific error
        return
      }
  
      // Pass through all other errors
      return originalConsoleError.apply(this, args)
    }
  }
  
  