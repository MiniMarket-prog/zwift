"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Camera, X, RefreshCw, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface MobileCameraScannerProps {
  onBarcodeDetected: (barcode: string) => void
}

export function MobileCameraScanner({ onBarcodeDetected }: MobileCameraScannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unknown">("unknown")
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()
  const [stream, setStream] = useState<MediaStream | null>(null)

  // Check camera permission status
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Check if the browser supports permissions API
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: "camera" as PermissionName })
          setPermissionState(result.state as "prompt" | "granted" | "denied")

          // Listen for permission changes
          result.onchange = () => {
            setPermissionState(result.state as "prompt" | "granted" | "denied")
          }
        } else {
          // Fallback for browsers that don't support permissions API
          setPermissionState("unknown")
        }
      } catch (error) {
        console.error("Error checking camera permission:", error)
        setPermissionState("unknown")
      }
    }

    checkPermission()
  }, [])

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
        setPermissionState("granted") // Update permission state if successful

        if (videoRef.current) {
          videoRef.current.srcObject = newStream
          await videoRef.current.play()
        }
      } catch (error) {
        console.error("Error accessing camera:", error)

        // Handle permission denied error
        if ((error as Error).name === "NotAllowedError" || (error as Error).name === "PermissionDeniedError") {
          setPermissionState("denied")
          toast({
            title: "Camera permission denied",
            description: "Please allow camera access in your browser settings to scan barcodes.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Camera access error",
            description: "Could not access your camera. Please check your device.",
            variant: "destructive",
          })
        }
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

  // Handle opening the camera settings on Android
  const openCameraSettings = () => {
    // For Android Chrome, we can try to request the camera again
    // which might trigger the permission prompt or settings redirect
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((tempStream) => {
        // If we get here, permission was just granted
        tempStream.getTracks().forEach((track) => track.stop())
        setPermissionState("granted")
        // Reopen the camera dialog
        setIsOpen(true)
      })
      .catch((error) => {
        console.error("Still can't access camera:", error)
        // On Android, we can guide the user to settings
        toast({
          title: "Camera permission required",
          description: "Please open your browser settings and enable camera permissions for this site.",
        })
      })
  }

  // Render permission denied view
  const renderPermissionDenied = () => (
    <div className="p-6 flex flex-col items-center justify-center gap-4">
      <AlertTriangle className="h-12 w-12 text-amber-500" />
      <h3 className="text-lg font-semibold">Camera Access Required</h3>
      <p className="text-center text-muted-foreground">
        Please allow camera access to scan barcodes. You'll need to update your browser permissions.
      </p>
      <div className="flex flex-col gap-2 w-full">
        <Button onClick={openCameraSettings}>Request Camera Permission</Button>
        <Button variant="outline" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
      <div className="text-xs text-muted-foreground mt-4">
        <p className="font-semibold">How to enable camera on Android Chrome:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Tap the lock/info icon in the address bar</li>
          <li>Select "Site settings"</li>
          <li>Find "Camera" and change to "Allow"</li>
          <li>Return to this page and try again</li>
        </ol>
      </div>
    </div>
  )

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
            <DialogTitle>Camera Scanner</DialogTitle>
          </DialogHeader>

          {permissionState === "denied" ? (
            renderPermissionDenied()
          ) : (
            <>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

