"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Camera, X, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface MobileCameraScannerProps {
  onBarcodeDetected: (barcode: string) => void
}

export function MobileCameraScanner({ onBarcodeDetected }: MobileCameraScannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()
  const [stream, setStream] = useState<MediaStream | null>(null)

  // Start the camera when the dialog opens
  useEffect(() => {
    if (!isOpen) return

    const startCamera = async () => {
      try {
        // Stop any existing stream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }

        // Start a new stream
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        setStream(newStream)

        if (videoRef.current) {
          videoRef.current.srcObject = newStream
          await videoRef.current.play()
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
        setStream(null)
      }
    }
  }, [isOpen, facingMode, toast, stream])

  // Switch camera between front and back
  const switchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
  }

  // Simulate a barcode scan (for testing)
  const simulateScan = () => {
    // Generate a random barcode
    const randomBarcode = Math.floor(Math.random() * 1000000000000)
      .toString()
      .padStart(12, "0")

    // Play a success sound
    try {
      const audio = new Audio("/sounds/beep.mp3")
      audio.play().catch((e) => console.log("Audio play failed:", e))
    } catch (e) {
      console.log("Audio play failed:", e)
    }

    // Call the callback with the detected barcode
    onBarcodeDetected(randomBarcode)

    // Close the dialog
    setIsOpen(false)

    // Show a success toast
    toast({
      title: "Barcode detected",
      description: `Detected barcode: ${randomBarcode}`,
    })
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
          if (!open && stream) {
            stream.getTracks().forEach((track) => track.stop())
            setStream(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Camera Preview</DialogTitle>
          </DialogHeader>

          <div className="relative aspect-video bg-black rounded-md overflow-hidden">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4/5 h-1/4 border-2 border-white rounded-md opacity-50"></div>
            </div>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Position the barcode within the frame and tap "Capture" when ready
          </p>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={switchCamera}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Switch Camera
              </Button>

              <Button onClick={simulateScan}>
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

