import type { z } from "zod"

// Base tool interface for type safety
export interface AITool {
  name: string
  description: string
  parameters: z.ZodSchema
  execute: (params: any) => Promise<any>
}

// Tool registry - automatically collects all tools
export const toolRegistry = new Map<string, any>()

// Helper function to register tools
export function registerTool(name: string, toolDefinition: any) {
  console.log(`🔧 Registering tool: ${name}`)
  toolRegistry.set(name, toolDefinition)
}

// Export function to get all tools for the AI
export function getAllTools() {
  const tools = Object.fromEntries(toolRegistry)
  console.log(`📦 getAllTools() called - returning ${Object.keys(tools).length} tools:`, Object.keys(tools))
  return tools
}

// Debug function to check registry status
export function debugToolRegistry() {
  console.log("=== TOOL REGISTRY DEBUG ===")
  console.log("Registry size:", toolRegistry.size)
  console.log("Registered tools:", Array.from(toolRegistry.keys()))
  console.log("Registry contents:", Object.fromEntries(toolRegistry))
  return {
    size: toolRegistry.size,
    tools: Array.from(toolRegistry.keys()),
    registry: Object.fromEntries(toolRegistry),
  }
}
