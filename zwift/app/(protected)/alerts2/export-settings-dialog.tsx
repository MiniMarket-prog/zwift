"use client"

import { useState } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type ExportSettings = {
  columns: {
    name: boolean
    category: boolean
    barcode: boolean
    price: boolean
    purchasePrice: boolean
    profitMargin: boolean
    currentStock: boolean
    minStock: boolean
    stockNeeded: boolean
    lastSaleDate: boolean
  }
  includeImages: boolean
  groupByCategory: boolean
  imageSize: number
  includeHeader: boolean
  includeFooter: boolean
}

type ExportSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: ExportSettings
  onSettingsChange: (settings: ExportSettings) => void
  onExport: (type: "csv" | "pdf") => void
  isExporting: boolean
  isExportingPDF: boolean
}

export function ExportSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onExport,
  isExporting,
  isExportingPDF,
}: ExportSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState("columns")
  const [exportType, setExportType] = useState<"csv" | "pdf">("csv")

  const handleColumnChange = (column: keyof ExportSettings["columns"], checked: boolean) => {
    onSettingsChange({
      ...settings,
      columns: {
        ...settings.columns,
        [column]: checked,
      },
    })
  }

  const handleSettingChange = <K extends keyof Omit<ExportSettings, "columns">>(
    setting: K,
    value: ExportSettings[K],
  ) => {
    onSettingsChange({
      ...settings,
      [setting]: value,
    })
  }

  const handleExport = () => {
    onExport(exportType)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Export Settings</DialogTitle>
          <DialogDescription>
            Customize your export options. Select columns, format, and other settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="columns">Columns</TabsTrigger>
            <TabsTrigger value="format">Format</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
          </TabsList>

          <TabsContent value="columns" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="column-name"
                  checked={settings.columns.name}
                  onCheckedChange={(checked) => handleColumnChange("name", checked as boolean)}
                />
                <Label htmlFor="column-name">Product Name</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="column-category"
                  checked={settings.columns.category}
                  onCheckedChange={(checked) => handleColumnChange("category", checked as boolean)}
                />
                <Label htmlFor="column-category">Category</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="column-barcode"
                  checked={settings.columns.barcode}
                  onCheckedChange={(checked) => handleColumnChange("barcode", checked as boolean)}
                />
                <Label htmlFor="column-barcode">Barcode</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="column-price"
                  checked={settings.columns.price}
                  onCheckedChange={(checked) => handleColumnChange("price", checked as boolean)}
                />
                <Label htmlFor="column-price">Price</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="column-purchase-price"
                  checked={settings.columns.purchasePrice}
                  onCheckedChange={(checked) => handleColumnChange("purchasePrice", checked as boolean)}
                />
                <Label htmlFor="column-purchase-price">Purchase Price</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="column-current-stock"
                  checked={settings.columns.currentStock}
                  onCheckedChange={(checked) => handleColumnChange("currentStock", checked as boolean)}
                />
                <Label htmlFor="column-current-stock">Current Stock</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="column-min-stock"
                  checked={settings.columns.minStock}
                  onCheckedChange={(checked) => handleColumnChange("minStock", checked as boolean)}
                />
                <Label htmlFor="column-min-stock">Min Stock</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="column-stock-needed"
                  checked={settings.columns.stockNeeded}
                  onCheckedChange={(checked) => handleColumnChange("stockNeeded", checked as boolean)}
                />
                <Label htmlFor="column-stock-needed">Stock Needed</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="column-last-sale-date"
                  checked={settings.columns.lastSaleDate}
                  onCheckedChange={(checked) => handleColumnChange("lastSaleDate", checked as boolean)}
                />
                <Label htmlFor="column-last-sale-date">Last Sale Date</Label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  // Select all columns
                  const allSelected = Object.fromEntries(
                    Object.keys(settings.columns).map((key) => [key, true]),
                  ) as ExportSettings["columns"]
                  onSettingsChange({ ...settings, columns: allSelected })
                }}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Deselect all columns except name (always keep at least one)
                  const noneSelected = Object.fromEntries(
                    Object.keys(settings.columns).map((key) => [key, key === "name"]),
                  ) as ExportSettings["columns"]
                  onSettingsChange({ ...settings, columns: noneSelected })
                }}
              >
                Deselect All
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="format" className="space-y-4">
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="export-type">Export Format</Label>
                <Select value={exportType} onValueChange={(value) => setExportType(value as "csv" | "pdf")}>
                  <SelectTrigger id="export-type">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                    <SelectItem value="pdf">PDF (Document)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="group-by-category">Group by Category</Label>
                <Switch
                  id="group-by-category"
                  checked={settings.groupByCategory}
                  onCheckedChange={(checked) => handleSettingChange("groupByCategory", checked)}
                />
              </div>

              {exportType === "pdf" && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-header">Include Header</Label>
                    <Switch
                      id="include-header"
                      checked={settings.includeHeader}
                      onCheckedChange={(checked) => handleSettingChange("includeHeader", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-footer">Include Page Numbers</Label>
                    <Switch
                      id="include-footer"
                      checked={settings.includeFooter}
                      onCheckedChange={(checked) => handleSettingChange("includeFooter", checked)}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            {exportType === "pdf" && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-images">Include Product Images</Label>
                  <Switch
                    id="include-images"
                    checked={settings.includeImages}
                    onCheckedChange={(checked) => handleSettingChange("includeImages", checked)}
                  />
                </div>

                {settings.includeImages && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="image-size">Image Size: {settings.imageSize}mm</Label>
                    </div>
                    <Slider
                      id="image-size"
                      min={10}
                      max={60} // Increase max size to 60mm
                      step={5}
                      value={[settings.imageSize]}
                      onValueChange={(value) => handleSettingChange("imageSize", value[0])}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Larger sizes will produce higher quality images in the PDF
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <div className="flex-1 flex justify-start">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
          <Button onClick={handleExport} disabled={isExporting || isExportingPDF}>
            {isExporting || isExportingPDF ? `Exporting...` : `Export to ${exportType.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
