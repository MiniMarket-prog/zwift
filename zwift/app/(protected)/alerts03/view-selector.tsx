"use client"

import { Button } from "@/components/ui/button"
import { LayoutGrid, List, Sidebar, Grid3X3 } from "lucide-react"

type ViewMode = "table" | "grid" | "split" | "cards"

interface ViewSelectorProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function ViewSelector({ viewMode, onViewModeChange }: ViewSelectorProps) {
  return (
    <div className="flex items-center bg-muted/50 rounded-lg p-1 gap-1">
      <Button
        variant={viewMode === "table" ? "default" : "ghost"}
        size="sm"
        className="h-8 px-3 text-xs"
        onClick={() => onViewModeChange("table")}
        title="Table View"
      >
        <List className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Table</span>
      </Button>
      <Button
        variant={viewMode === "cards" ? "default" : "ghost"}
        size="sm"
        className="h-8 px-3 text-xs"
        onClick={() => onViewModeChange("cards")}
        title="Card View"
      >
        <Grid3X3 className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Cards</span>
      </Button>
      <Button
        variant={viewMode === "grid" ? "default" : "ghost"}
        size="sm"
        className="h-8 px-3 text-xs"
        onClick={() => onViewModeChange("grid")}
        title="Grid View"
      >
        <LayoutGrid className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Grid</span>
      </Button>
      <Button
        variant={viewMode === "split" ? "default" : "ghost"}
        size="sm"
        className="h-8 px-3 text-xs"
        onClick={() => onViewModeChange("split")}
        title="Split View"
      >
        <Sidebar className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Split</span>
      </Button>
    </div>
  )
}
