// This is a more comprehensive error handler
// It will be used on both client and server sides

// Store the original console.error
const originalConsoleError = console.error

// Replace console.error with our custom function
console.error = function (...args) {
  // Check if this is the cookies().get() error
  if (
    args[0] &&
    // Check for error object
    ((typeof args[0] === "object" &&
      args[0].message &&
      (args[0].message.includes("cookies().get") || args[0].message.includes("sb-"))) ||
      // Check for string error
      (typeof args[0] === "string" && (args[0].includes("cookies().get") || args[0].includes("sb-"))))
  ) {
    // Suppress this specific error
    return
  }

  // Pass through all other errors
  return originalConsoleError.apply(this, args)
}

// Export a dummy function to ensure the file is imported
export function setupErrorHandler() {
  // This function doesn't need to do anything
  // The side effect of replacing console.error happens when the file is imported
}

