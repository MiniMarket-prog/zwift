import { tool } from "ai"
import { z } from "zod"
import { registerTool } from "./index"

// Simple debug tool to test if tools are working
const debugHealthScore = tool({
  description: "Debug tool to test if health score calculation is working",
  parameters: z.object({}),
  execute: async () => {
    console.log("🔥 DEBUG: Health score debug tool executed successfully!")
    return {
      success: true,
      message: "Debug tool is working! The health score tool should work too.",
      debug_info: {
        timestamp: new Date().toISOString(),
        tool_system_status: "operational",
      },
    }
  },
})

// Register the debug tool
registerTool("debugHealthScore", debugHealthScore)
