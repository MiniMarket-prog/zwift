"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Camera, X, Check, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface CameraBarcodeProps {
  onBarcodeDetected: (barcode: string) => void
}

export function CameraBarcodeScanner({ onBarcodeDetected }: CameraBarcodeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()

  // Start the camera when the dialog opens
  useEffect(() => {
    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        if (!isOpen) return

        // Stop any existing stream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }

        // Start a new stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setIsScanning(true)
          scanBarcode()
        }
      } catch (error) {
        console.error("Error accessing camera:", error)
        toast({
          title: "Camera access error",
          description: "Could not access your camera. Please check permissions.",
          variant: "destructive",
        })
      }
    }

    startCamera()

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      setIsScanning(false)
    }
  }, [isOpen, facingMode, toast])

  // Scan for barcodes
  const scanBarcode = async () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return

    try {
      // Use the BarcodeDetector API if available
      if (window.BarcodeDetector) {
        const barcodeDetector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_39", "code_128", "qr_code", "upc_a", "upc_e"],
        })

        // Draw the current video frame to the canvas
        const canvas = canvasRef.current
        const context = canvas.getContext("2d")

        if (context && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          canvas.width = videoRef.current.videoWidth
          canvas.height = videoRef.current.videoHeight
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

          // Detect barcodes in the current frame
          const barcodes = await barcodeDetector.detect(canvas)

          if (barcodes.length > 0) {
            // We found a barcode!
            const barcode = barcodes[0].rawValue

            // Play a success sound
            try {
              const audio = new Audio()
              audio.src = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU..."
              audio.play().catch((e) => console.log("Audio play failed:", e))
            } catch (e) {
              console.log("Audio play failed:", e)
            }

            // Stop scanning and close the dialog
            setIsScanning(false)
            setIsOpen(false)

            // Call the callback with the detected barcode
            onBarcodeDetected(barcode)

            // Show a success toast
            toast({
              title: "Barcode detected",
              description: `Detected barcode: ${barcode}`,
            })

            return
          }
        }
      } else {
        console.log("BarcodeDetector API not available")
      }

      // If we're still scanning, request the next animation frame
      if (isScanning) {
        requestAnimationFrame(scanBarcode)
      }
    } catch (error) {
      console.error("Error scanning barcode:", error)
    }
  }

  // Switch camera between front and back
  const switchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="flex items-center gap-1">
        <Camera className="h-4 w-4" />
        Scan
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setIsScanning(false)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>

          <div className="relative aspect-video bg-black rounded-md overflow-hidden">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover opacity-0" />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4/5 h-1/4 border-2 border-white rounded-md opacity-50"></div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={switchCamera}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Switch Camera
              </Button>

              <Button
                onClick={() => {
                  if (!isScanning) {
                    setIsScanning(true)
                    scanBarcode()
                  }
                }}
              >
                <Check className="h-4 w-4 mr-2" />
                Rescan
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

