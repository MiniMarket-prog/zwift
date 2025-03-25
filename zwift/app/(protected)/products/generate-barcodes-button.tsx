"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { BarcodeIcon, RefreshCwIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { generateTestBarcodes } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function GenerateBarcodesButton({ count }: { count: number }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

  const handleGenerateBarcodes = async () => {
    setIsGenerating(true)
    try {
      await generateTestBarcodes()
      toast({
        title: "Barcodes generated",
        description: "Barcodes have been generated for all products.",
      })
      router.refresh()
    } catch (error) {
      console.error("Error generating barcodes:", error)
      toast({
        title: "Error",
        description: "Failed to generate barcodes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      setIsDialogOpen(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsDialogOpen(true)} className="flex items-center">
        <BarcodeIcon className="h-4 w-4 mr-2" />
        Generate Missing Barcodes ({count})
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Barcodes</DialogTitle>
            <DialogDescription>
              This will generate random EAN-13 barcodes for all products that don't have a barcode.
              {count} products will be updated.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleGenerateBarcodes} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarcodeIcon className="h-4 w-4 mr-2" />
                  Generate Barcodes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

