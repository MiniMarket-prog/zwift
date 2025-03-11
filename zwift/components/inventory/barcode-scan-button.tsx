"use client"

import { Button } from "@/components/ui/button"
import { Camera } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

interface BarcodeScanButtonProps {
  onScan: (barcode: string) => void
}

export function BarcodeScanButton({ onScan }: BarcodeScanButtonProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  // Function to handle successful scan
  const handleScan = (barcode: string) => {
    onScan(barcode)
    setOpen(false)
    toast({
      title: "Barcode scanned",
      description: `Barcode ${barcode} has been added.`,
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Camera className="h-4 w-4 mr-2" />
        Scan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Point your camera at a barcode to scan it.</p>

            <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
              {/* This is where the camera feed would go */}
              <p className="text-center text-muted-foreground">Camera feed</p>
            </div>

            {/* For testing, let's add some sample barcodes */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handleScan("123456789012")}>
                Test Barcode 1
              </Button>
              <Button variant="outline" onClick={() => handleScan("987654321098")}>
                Test Barcode 2
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

