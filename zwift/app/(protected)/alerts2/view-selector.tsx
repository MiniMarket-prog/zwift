"use client"

import { Button } from "@/components/ui/button"
import { LayoutGrid, List, Sidebar } from "lucide-react"

type ViewMode = "table" | "grid" | "split"

interface ViewSelectorProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function ViewSelector({ viewMode, onViewModeChange }: ViewSelectorProps) {
  return (
    <div className="flex items-center space-x-2 border rounded-md p-1">
      <Button
        variant={viewMode === "table" ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onViewModeChange("table")}
        title="Table View"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "grid" ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onViewModeChange("grid")}
        title="Grid View"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "split" ? "default" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onViewModeChange("split")}
        title="Split View"
      >
        <Sidebar className="h-4 w-4" />
      </Button>
    </div>
  )
}
