"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Camera, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void
}

export function SimpleBarcodeScanner({ onBarcodeDetected }: BarcodeScannerProps) {
  const [open, setOpen] = useState(false)
  const [manualBarcode, setManualBarcode] = useState("")
  const { toast } = useToast()

  // Function to handle manual barcode entry
  const handleManualEntry = () => {
    if (manualBarcode.trim()) {
      onBarcodeDetected(manualBarcode.trim())
      setManualBarcode("")
      setOpen(false)
      toast({
        title: "Barcode entered",
        description: `Barcode ${manualBarcode} has been added.`,
      })
    }
  }

  // Function to handle test barcode selection
  const handleTestBarcode = (barcode: string) => {
    onBarcodeDetected(barcode)
    setOpen(false)
    toast({
      title: "Test barcode selected",
      description: `Barcode ${barcode} has been added.`,
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Camera className="h-4 w-4 mr-2" />
        Scan Barcode
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Barcode Scanner</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">Enter barcode manually:</p>
              <div className="flex gap-2">
                <Input
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Enter barcode number"
                />
                <Button onClick={handleManualEntry}>Enter</Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm">Or select a test barcode:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => handleTestBarcode("123456789012")}>
                  Test Barcode 1
                </Button>
                <Button variant="outline" onClick={() => handleTestBarcode("987654321098")}>
                  Test Barcode 2
                </Button>
                <Button variant="outline" onClick={() => handleTestBarcode("456789123456")}>
                  Test Barcode 3
                </Button>
                <Button variant="outline" onClick={() => handleTestBarcode("789123456789")}>
                  Test Barcode 4
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

