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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, ImageIcon, Settings, Download, Layout, OptionIcon as Orientation } from "lucide-react"

export type ExportSettings = {
  columns: {
    name: boolean
    category: boolean
    barcode: boolean
    price: boolean
    purchasePrice: boolean
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
  pdfOrientation: "portrait" | "landscape"
  pdfFormat: "a4" | "a3" | "letter" | "legal"
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
  const [exportType, setExportType] = useState<"csv" | "pdf">("pdf")

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

  const selectedColumnsCount = Object.values(settings.columns).filter(Boolean).length

  // Get image size label based on value
  const getImageSizeLabel = (size: number) => {
    if (size <= 5) return "Micro"
    if (size <= 12) return "Tiny"
    if (size <= 20) return "Very Small"
    if (size <= 30) return "Small"
    if (size <= 40) return "Medium"
    if (size <= 55) return "Large"
    if (size <= 70) return "Very Large"
    return "Huge"
  }

  // Get format description
  const getFormatDescription = (format: string, orientation: string) => {
    const formats = {
      a4: orientation === "portrait" ? "210 × 297 mm" : "297 × 210 mm",
      a3: orientation === "portrait" ? "297 × 420 mm" : "420 × 297 mm",
      letter: orientation === "portrait" ? "8.5 × 11 in" : "11 × 8.5 in",
      legal: orientation === "portrait" ? "8.5 × 14 in" : "14 × 8.5 in",
    }
    return formats[format as keyof typeof formats] || ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Settings
          </DialogTitle>
          <DialogDescription>
            Customize your export options. Select columns, format, and other settings for your low stock report.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="columns" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Columns</span>
            </TabsTrigger>
            <TabsTrigger value="format" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Format</span>
            </TabsTrigger>
            <TabsTrigger value="options" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Options</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="columns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Columns</CardTitle>
                <CardDescription>
                  Choose which columns to include in your export ({selectedColumnsCount} selected)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(settings.columns).map(([key, checked]) => (
                    <div key={key} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                      <Checkbox
                        id={`column-${key}`}
                        checked={checked}
                        onCheckedChange={(checked) =>
                          handleColumnChange(key as keyof ExportSettings["columns"], checked as boolean)
                        }
                      />
                      <Label htmlFor={`column-${key}`} className="text-sm font-medium cursor-pointer">
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-6 border-t mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
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
                    size="sm"
                    onClick={() => {
                      const noneSelected = Object.fromEntries(
                        Object.keys(settings.columns).map((key) => [key, key === "name"]),
                      ) as ExportSettings["columns"]
                      onSettingsChange({ ...settings, columns: noneSelected })
                    }}
                  >
                    Reset to Name Only
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="format" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Format</CardTitle>
                <CardDescription>Choose your preferred export format and organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="export-type" className="text-sm font-medium">
                    Export Format
                  </Label>
                  <Select value={exportType} onValueChange={(value) => setExportType(value as "csv" | "pdf")}>
                    <SelectTrigger id="export-type">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <div>
                            <div className="font-medium">CSV (Spreadsheet)</div>
                            <div className="text-xs text-muted-foreground">Compatible with Excel, Google Sheets</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <div>
                            <div className="font-medium">PDF (Document)</div>
                            <div className="text-xs text-muted-foreground">Professional report format</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <Label htmlFor="group-by-category" className="font-medium">
                      Group by Category
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Organize products by their categories</p>
                  </div>
                  <Switch
                    id="group-by-category"
                    checked={settings.groupByCategory}
                    onCheckedChange={(checked) => handleSettingChange("groupByCategory", checked)}
                  />
                </div>

                {exportType === "pdf" && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Layout className="w-4 h-4" />
                      PDF Layout Options
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="pdf-orientation" className="text-sm font-medium">
                          Orientation
                        </Label>
                        <Select
                          value={settings.pdfOrientation}
                          onValueChange={(value) =>
                            handleSettingChange("pdfOrientation", value as "portrait" | "landscape")
                          }
                        >
                          <SelectTrigger id="pdf-orientation">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="portrait">
                              <div className="flex items-center gap-2">
                                <Orientation className="w-4 h-4 rotate-90" />
                                <div>
                                  <div className="font-medium">Portrait</div>
                                  <div className="text-xs text-muted-foreground">Tall format</div>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="landscape">
                              <div className="flex items-center gap-2">
                                <Orientation className="w-4 h-4" />
                                <div>
                                  <div className="font-medium">Landscape</div>
                                  <div className="text-xs text-muted-foreground">Wide format (recommended)</div>
                                </div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="pdf-format" className="text-sm font-medium">
                          Page Size
                        </Label>
                        <Select
                          value={settings.pdfFormat}
                          onValueChange={(value) =>
                            handleSettingChange("pdfFormat", value as "a4" | "a3" | "letter" | "legal")
                          }
                        >
                          <SelectTrigger id="pdf-format">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="a4">
                              <div>
                                <div className="font-medium">A4</div>
                                <div className="text-xs text-muted-foreground">
                                  {getFormatDescription("a4", settings.pdfOrientation)}
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="a3">
                              <div>
                                <div className="font-medium">A3</div>
                                <div className="text-xs text-muted-foreground">
                                  {getFormatDescription("a3", settings.pdfOrientation)}
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="letter">
                              <div>
                                <div className="font-medium">Letter</div>
                                <div className="text-xs text-muted-foreground">
                                  {getFormatDescription("letter", settings.pdfOrientation)}
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="legal">
                              <div>
                                <div className="font-medium">Legal</div>
                                <div className="text-xs text-muted-foreground">
                                  {getFormatDescription("legal", settings.pdfOrientation)}
                                </div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="include-header">Include Header</Label>
                          <p className="text-xs text-muted-foreground">Add title and generation date</p>
                        </div>
                        <Switch
                          id="include-header"
                          checked={settings.includeHeader}
                          onCheckedChange={(checked) => handleSettingChange("includeHeader", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="include-footer">Include Page Numbers</Label>
                          <p className="text-xs text-muted-foreground">Add page numbers at bottom</p>
                        </div>
                        <Switch
                          id="include-footer"
                          checked={settings.includeFooter}
                          onCheckedChange={(checked) => handleSettingChange("includeFooter", checked)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Advanced Options</CardTitle>
                <CardDescription>Configure additional export settings</CardDescription>
              </CardHeader>
              <CardContent>
                {exportType === "pdf" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <Label htmlFor="include-images" className="font-medium">
                          Include Product Images
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">Add product images to the PDF report</p>
                      </div>
                      <Switch
                        id="include-images"
                        checked={settings.includeImages}
                        onCheckedChange={(checked) => handleSettingChange("includeImages", checked)}
                      />
                    </div>

                    {settings.includeImages && (
                      <div className="space-y-4 p-4 border rounded-lg">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="image-size" className="font-medium">
                              Image Size: {settings.imageSize}mm
                            </Label>
                            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                              {getImageSizeLabel(settings.imageSize)}
                            </span>
                          </div>
                          <Slider
                            id="image-size"
                            min={3}
                            max={80}
                            step={1}
                            value={[settings.imageSize]}
                            onValueChange={(value) => handleSettingChange("imageSize", value[0])}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>3mm (Micro)</span>
                            <span>10mm (Tiny)</span>
                            <span>25mm (Small)</span>
                            <span>45mm (Medium)</span>
                            <span>65mm (Large)</span>
                            <span>80mm (Huge)</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Larger sizes will produce higher quality images but may increase file size and processing
                            time. For landscape orientation, larger sizes work better.
                          </p>
                        </div>

                        {/* Quick size presets */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Quick Presets</Label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: "Micro", value: 4 },
                              { label: "Tiny", value: 8 },
                              { label: "Small", value: 15 },
                              { label: "Medium", value: 25 },
                              { label: "Large", value: 40 },
                              { label: "X-Large", value: 55 },
                              { label: "Huge", value: 70 },
                            ].map((preset) => (
                              <Button
                                key={preset.value}
                                variant={settings.imageSize === preset.value ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleSettingChange("imageSize", preset.value)}
                                className="text-xs"
                              >
                                {preset.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {exportType === "csv" && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">CSV Export Info</h4>
                    <p className="text-sm text-blue-800">
                      CSV files can be opened in Excel, Google Sheets, or any spreadsheet application. Images are not
                      included in CSV exports.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:mr-auto">
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleExport} disabled={isExporting || isExportingPDF} className="flex-1 sm:flex-none">
              {isExporting || isExportingPDF ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export to {exportType.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
