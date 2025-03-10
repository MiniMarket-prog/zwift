// This is a temporary workaround for the cookies().get() error
if (typeof window !== "undefined") {
    // Only run this code on the client side
    const originalError = console.error
  
    console.error = function (...args) {
      // Check if this is the cookies().get() error
      if (
        args[0] &&
        typeof args[0] === "object" &&
        args[0].message &&
        ((args[0].message.includes("cookies().get") && args[0].message.includes("sb-")) ||
          args[0].message.includes("Hydration failed"))
      ) {
        // Suppress these specific errors
        return
      }
  
      // Pass through all other errors
      return originalError.apply(this, args)
    }
  }
  
  