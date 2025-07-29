// This file automatically loads all tool modules
// Add new tool files here to auto-register them

console.log("🚀 Loading AI tools...")

// Import all tool modules to trigger registration
import "./database"
import "./inventory"
import "./sales"
import "./analytics"
import "./smart-reorder"
import "./debug-tools"

// Import the registry functions
import { debugToolRegistry } from "./index"

// Debug the registry after all imports
console.log("🔍 Tools loaded, debugging registry...")
const debug = debugToolRegistry()
console.log("📊 Final tool count:", debug.size)

export { getAllTools } from "./index"
