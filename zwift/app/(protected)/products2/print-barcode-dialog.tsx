"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Printer, Download } from "lucide-react"
import JsBarcode from "jsbarcode"

interface PrintBarcodeDialogProps {
  product: {
    id: string
    name: string
    barcode?: string
  }
  onClose: () => void
}

export function PrintBarcodeDialog({ product, onClose }: PrintBarcodeDialogProps) {
  const [copies, setCopies] = useState(1)
  const [size, setSize] = useState("medium")
  const [includePrice, setIncludePrice] = useState(true)
  const [includeName, setIncludeName] = useState(true)
  const [isPrinting, setIsPrinting] = useState(false)
  const barcodeRef = useRef<SVGSVGElement>(null)
  const { toast } = useToast()

  // Generate barcode when component mounts or when barcode value changes
  useState(() => {
    if (barcodeRef.current && product.barcode) {
      try {
        JsBarcode(barcodeRef.current, product.barcode, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 14,
        })
      } catch (error) {
        console.error("Error generating barcode:", error)
      }
    }
  })

  const handlePrint = () => {
    setIsPrinting(true)

    try {
      // Create a new window for printing
      const printWindow = window.open("", "_blank")

      if (!printWindow) {
        toast({
          title: "Error",
          description: "Could not open print window. Please check your popup blocker settings.",
          variant: "destructive",
        })
        setIsPrinting(false)
        return
      }

      // Get the barcode SVG content
      const barcodeSvg = barcodeRef.current?.outerHTML || ""

      // Create the print content
      let printContent = `
        <html>
        <head>
          <title>Print Barcode - ${product.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .barcode-container {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              padding: 10px;
            }
            .barcode-item {
              border: 1px dashed #ccc;
              padding: 10px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              ${size === "small" ? "width: 100px;" : size === "medium" ? "width: 150px;" : "width: 200px;"}
            }
            .product-name {
              font-size: ${size === "small" ? "10px" : size === "medium" ? "12px" : "14px"};
              margin-bottom: 5px;
              text-align: center;
              font-weight: bold;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .product-price {
              font-size: ${size === "small" ? "10px" : size === "medium" ? "12px" : "14px"};
              margin-top: 5px;
            }
            svg {
              max-width: 100%;
              height: auto;
            }
            @media print {
              @page {
                margin: 0.5cm;
              }
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
      `

      // Add multiple copies of the barcode
      for (let i = 0; i < copies; i++) {
        printContent += `
          <div class="barcode-item">
            ${includeName ? `<div class="product-name">${product.name}</div>` : ""}
            ${barcodeSvg}
            ${includePrice ? `<div class="product-price">Price: $XX.XX</div>` : ""}
          </div>
        `
      }

      printContent += `
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
        </html>
      `

      // Write to the new window and trigger print
      printWindow.document.open()
      printWindow.document.write(printContent)
      printWindow.document.close()

      toast({
        title: "Printing",
        description: "Barcode sent to printer.",
      })
    } catch (error) {
      console.error("Error printing barcode:", error)
      toast({
        title: "Error",
        description: "Failed to print barcode. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPrinting(false)
    }
  }

  const handleDownload = () => {
    if (!barcodeRef.current) return

    try {
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(barcodeRef.current)
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
      const svgUrl = URL.createObjectURL(svgBlob)

      // Create download link
      const downloadLink = document.createElement("a")
      downloadLink.href = svgUrl
      downloadLink.download = `barcode-${product.barcode || product.id}.svg`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)

      toast({
        title: "Download Complete",
        description: "Barcode has been downloaded as SVG.",
      })
    } catch (error) {
      console.error("Error downloading barcode:", error)
      toast({
        title: "Error",
        description: "Failed to download barcode. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Print Barcode</DialogTitle>
          <DialogDescription>Print or download a barcode for {product.name}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {product.barcode ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="border rounded-md p-4 bg-white w-full flex justify-center">
                <svg ref={barcodeRef}></svg>
              </div>

              <div className="grid w-full gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="copies" className="text-right">
                    Copies
                  </Label>
                  <Input
                    id="copies"
                    type="number"
                    min="1"
                    max="100"
                    value={copies}
                    onChange={(e) => setCopies(Number.parseInt(e.target.value) || 1)}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="size" className="text-right">
                    Size
                  </Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger id="size" className="col-span-3">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="include-name" className="text-right">
                    Include Name
                  </Label>
                  <Input
                    id="include-name"
                    type="checkbox"
                    checked={includeName}
                    onChange={(e) => setIncludeName(e.target.checked)}
                    className="col-span-3 w-5 h-5"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="include-price" className="text-right">
                    Include Price
                  </Label>
                  <Input
                    id="include-price"
                    type="checkbox"
                    checked={includePrice}
                    onChange={(e) => setIncludePrice(e.target.checked)}
                    className="col-span-3 w-5 h-5"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">This product does not have a barcode assigned.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={handleDownload} disabled={!product.barcode} className="mr-2">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button type="button" onClick={handlePrint} disabled={!product.barcode || isPrinting}>
            <Printer className="mr-2 h-4 w-4" />
            {isPrinting ? "Printing..." : "Print"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
