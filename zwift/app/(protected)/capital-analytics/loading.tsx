import { RefreshCw } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center">
        <RefreshCw className="h-8 w-8 animate-spin mb-4" />
        <h3 className="text-lg font-medium">Loading capital analytics...</h3>
      </div>
    </div>
  )
}

