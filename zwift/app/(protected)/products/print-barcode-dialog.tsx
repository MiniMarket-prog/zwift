"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { PrinterIcon, DownloadIcon } from "lucide-react"
import { useReactToPrint } from "react-to-print"
import dynamic from "next/dynamic"

// Dynamically import Barcode component with no SSR
const Barcode = dynamic(() => import("react-barcode"), { ssr: false })

interface Product {
  id: string
  name: string
  price: number
  barcode: string
  stock: number
  min_stock: number
}

export function PrintBarcodeDialog({
  product,
  onClose,
}: {
  product: Product
  onClose: () => void
}) {
  const [barcodeType, setBarcodeType] = useState("ean13")
  const [quantity, setQuantity] = useState(1)
  const [barcodeValue, setBarcodeValue] = useState(product.barcode || generateRandomBarcode())
  const printRef = useRef<HTMLDivElement>(null)

  // Generate random barcode if product doesn't have one
  function generateRandomBarcode() {
    return Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join("")
  }

  // Handle print - fixed to use the correct API
  const handlePrint = useReactToPrint({
    documentTitle: `Barcode-${product.name}`,
    // Use contentRef instead of content
    contentRef: printRef,
    // Or use a function that returns the element
    // content: () => printRef.current,
  })

  // Handle download as PNG
  const handleDownload = () => {
    const canvas = document.querySelector(`#barcode-${product.id} canvas`) as HTMLCanvasElement
    if (!canvas) return

    const link = document.createElement("a")
    link.download = `barcode-${product.name.replace(/\s+/g, "-").toLowerCase()}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Print Barcode</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="barcode-value">Barcode Value</Label>
            <Input
              id="barcode-value"
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
              placeholder="Enter barcode value"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barcode-type">Barcode Type</Label>
              <Select value={barcodeType} onValueChange={setBarcodeType}>
                <SelectTrigger id="barcode-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ean13">EAN-13</SelectItem>
                  <SelectItem value="ean8">EAN-8</SelectItem>
                  <SelectItem value="code128">CODE128</SelectItem>
                  <SelectItem value="code39">CODE39</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="border rounded-md p-4">
            <div className="text-center mb-2 font-medium">{product.name}</div>
            <div ref={printRef} className="flex flex-col items-center justify-center" id={`barcode-${product.id}`}>
              {Array.from({ length: quantity }).map((_, index) => (
                <div key={index} className="mb-4 text-center">
                  <Barcode
                    value={barcodeValue}
                    format={barcodeType as any}
                    width={2}
                    height={50}
                    fontSize={12}
                    margin={10}
                    displayValue={true}
                  />
                  <div className="text-sm mt-1">${product.price.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="sm:w-auto w-full">
            Cancel
          </Button>
          <Button variant="outline" onClick={handleDownload} className="sm:w-auto w-full">
            <DownloadIcon className="h-4 w-4 mr-2" />
            Download PNG
          </Button>
          <Button
            // Fix the type error by wrapping handlePrint in a function
            onClick={() => handlePrint()}
            className="sm:w-auto w-full"
          >
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

