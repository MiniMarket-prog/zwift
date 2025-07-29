import { tool } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabaseAI"
import { registerTool } from "./index"

// Test Connection Tool
const testConnection = tool({
  description: "Test database connection and basic functionality",
  parameters: z.object({}),
  execute: async () => {
    try {
      console.log("Testing database connection...")
      const supabase = createClient()
      const { data, error } = await supabase.from("products").select("id, name").limit(1)

      if (error) {
        console.error("Database connection test failed:", error)
        return {
          success: false,
          error: error.message,
          message: "Database connection failed",
        }
      }

      console.log("Database connection test successful")
      return {
        success: true,
        message: "Database connection is working properly",
        sample_data: data,
      }
    } catch (error: any) {
      console.error("Test connection error:", error)
      return {
        success: false,
        error: error.message,
        message: "Failed to test database connection",
      }
    }
  },
})

// Register the tool
registerTool("testConnection", testConnection)
