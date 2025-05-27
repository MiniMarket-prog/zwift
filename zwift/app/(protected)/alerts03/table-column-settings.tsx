"use client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Eye, EyeOff } from "lucide-react"

export type TableColumnSettings = {
  image: boolean
  name: boolean
  category: boolean
  barcode: boolean
  price: boolean
  purchasePrice: boolean
  stock: boolean
  needed: boolean
  lastSale: boolean
  actions: boolean
}

type TableColumnSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: TableColumnSettings
  onSettingsChange: (settings: TableColumnSettings) => void
}

export function TableColumnSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: TableColumnSettingsDialogProps) {
  const handleColumnChange = (column: keyof TableColumnSettings, checked: boolean) => {
    onSettingsChange({
      ...settings,
      [column]: checked,
    })
  }

  const selectedColumnsCount = Object.values(settings).filter(Boolean).length

  const columnDefinitions = [
    { key: "image", label: "Product Image", description: "Show product images" },
    { key: "name", label: "Product Name", description: "Product name and details", required: true },
    { key: "category", label: "Category", description: "Product category" },
    { key: "barcode", label: "Barcode", description: "Product barcode/SKU" },
    { key: "price", label: "Selling Price", description: "Current selling price" },
    { key: "purchasePrice", label: "Purchase Price", description: "Cost/purchase price" },
    { key: "stock", label: "Stock Level", description: "Current vs minimum stock" },
    { key: "needed", label: "Stock Needed", description: "Units needed to restock" },
    { key: "lastSale", label: "Last Sale", description: "Last sale date" },
    { key: "actions", label: "Actions", description: "Edit and restock buttons", required: true },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Table Column Settings
          </DialogTitle>
          <DialogDescription>
            Choose which columns to display in the table view ({selectedColumnsCount} selected)
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Visible Columns</CardTitle>
            <CardDescription>Select the columns you want to see in the alerts table</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {columnDefinitions.map((column) => (
                <div
                  key={column.key}
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${
                    column.required ? "bg-muted/30 border-muted" : "hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    id={`column-${column.key}`}
                    checked={settings[column.key as keyof TableColumnSettings]}
                    onCheckedChange={(checked) =>
                      handleColumnChange(column.key as keyof TableColumnSettings, checked as boolean)
                    }
                    disabled={column.required}
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={`column-${column.key}`}
                      className={`text-sm font-medium cursor-pointer ${column.required ? "text-muted-foreground" : ""}`}
                    >
                      {column.label}
                      {column.required && <span className="text-xs ml-1">(Required)</span>}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">{column.description}</p>
                  </div>
                  {settings[column.key as keyof TableColumnSettings] ? (
                    <Eye className="w-4 h-4 text-green-600 mt-0.5" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground mt-0.5" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6 border-t mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allSelected = Object.fromEntries(
                    Object.keys(settings).map((key) => [key, true]),
                  ) as TableColumnSettings
                  onSettingsChange(allSelected)
                }}
              >
                Show All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const minimalSelected = Object.fromEntries(
                    Object.keys(settings).map((key) => [
                      key,
                      key === "name" || key === "stock" || key === "needed" || key === "actions",
                    ]),
                  ) as TableColumnSettings
                  onSettingsChange(minimalSelected)
                }}
              >
                Minimal View
              </Button>
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:mr-auto">
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>Apply Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
