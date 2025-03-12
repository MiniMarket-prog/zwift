"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Camera, X, RefreshCw, AlertTriangle, Info, Play } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface MobileCameraScannerProps {
  onBarcodeDetected: (barcode: string) => void
}

export function MobileCameraScanner({ onBarcodeDetected }: MobileCameraScannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false)

  // Add debug info with timestamp
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo((prev) => [...prev, `[${timestamp}] ${message}`])
    console.log(`[Camera Debug] ${message}`)
  }

  // Start camera when dialog opens
  useEffect(() => {
    if (!isOpen) return

    let stream: MediaStream | null = null

    const startCamera = async () => {
      try {
        // Clear any previous errors
        setErrorMessage(null)

        // Stop any existing streams
        if (videoRef.current && videoRef.current.srcObject) {
          const oldStream = videoRef.current.srcObject as MediaStream
          oldStream.getTracks().forEach((track) => track.stop())
          videoRef.current.srcObject = null
        }

        addDebugInfo(`Starting camera with facing mode: ${facingMode}`)

        // Request camera with basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        // Get active track info
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          addDebugInfo(`Active camera: ${videoTrack.label}`)
        }

        // Set up video element - IMPORTANT: Do this before setting srcObject
        if (videoRef.current) {
          // Reset video element
          videoRef.current.onloadedmetadata = null
          videoRef.current.onloadeddata = null
          videoRef.current.onerror = null

          // Set new handlers
          videoRef.current.onloadedmetadata = () => {
            addDebugInfo("Video metadata loaded")
          }

          videoRef.current.onloadeddata = () => {
            addDebugInfo("Video data loaded")
          }

          videoRef.current.onerror = (e) => {
            addDebugInfo(`Video error: ${e}`)
          }

          // Set stream to video element
          videoRef.current.srcObject = stream

          // Try to play
          try {
            addDebugInfo("Attempting to play video")
            await videoRef.current.play()
            addDebugInfo("Video playing successfully")
            setNeedsUserInteraction(false)
          } catch (err) {
            addDebugInfo(`Play failed: ${(err as Error).message}`)
            setNeedsUserInteraction(true)
          }
        } else {
          addDebugInfo("Video element reference not available")
        }
      } catch (error) {
        const err = error as Error
        addDebugInfo(`Camera error: ${err.name} - ${err.message}`)
        setErrorMessage(`Could not access camera: ${err.message}`)
      }
    }

    startCamera()

    // Cleanup function
    return () => {
      if (stream) {
        addDebugInfo("Stopping camera stream")
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isOpen, facingMode, toast])

  // Switch camera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
    addDebugInfo(`Switching camera to ${facingMode === "environment" ? "user" : "environment"}`)
  }

  // Handle manual play (for browsers that require user interaction)
  const handleManualPlay = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play()
        setNeedsUserInteraction(false)
        addDebugInfo("Video played after user interaction")
      } catch (err) {
        addDebugInfo(`Manual play failed: ${(err as Error).message}`)
      }
    }
  }

  // Simulate a barcode scan
  const simulateScan = () => {
    const randomBarcode = Math.floor(Math.random() * 1000000000000)
      .toString()
      .padStart(12, "0")
    onBarcodeDetected(randomBarcode)
    setIsOpen(false)
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Camera Scanner</DialogTitle>
          </DialogHeader>

          {errorMessage ? (
            <div className="p-6 flex flex-col items-center justify-center gap-4">
              <AlertTriangle className="h-12 w-12 text-amber-500" />
              <h3 className="text-lg font-semibold">Camera Access Issue</h3>
              <p className="text-center text-muted-foreground">{errorMessage}</p>
              <Button onClick={() => setErrorMessage(null)}>Retry Camera Access</Button>
            </div>
          ) : (
            <>
              <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                {/* Video element - using inline styles for maximum compatibility */}
                <video
                  ref={videoRef}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: facingMode === "user" ? "scaleX(-1)" : "none",
                    backgroundColor: "black",
                  }}
                  playsInline
                  muted
                  autoPlay
                />

                {/* Scanning overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      width: "80%",
                      height: "25%",
                      border: "2px solid white",
                      borderRadius: "4px",
                      opacity: 0.7,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: "50%",
                        height: "2px",
                        backgroundColor: "rgba(255, 255, 255, 0.7)",
                        boxShadow: "0 0 8px rgba(255, 255, 255, 0.8)",
                        animation: "pulse 1.5s infinite",
                      }}
                    ></div>
                  </div>
                </div>

                {/* Play button for browsers that require user interaction */}
                {needsUserInteraction && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                    }}
                  >
                    <Button onClick={handleManualPlay}>
                      <Play className="h-4 w-4 mr-2" />
                      Tap to Start Camera
                    </Button>
                  </div>
                )}
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
                    Switch Camera ({facingMode === "environment" ? "Front" : "Back"})
                  </Button>

                  <Button onClick={simulateScan}>
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </div>
              </DialogFooter>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="mt-2 mx-auto"
              >
                <Info className="h-4 w-4 mr-2" />
                {showDebugInfo ? "Hide Debug Info" : "Show Debug Info"}
              </Button>

              {showDebugInfo && (
                <div className="mt-2 p-3 bg-muted rounded-md w-full">
                  <h4 className="font-semibold text-sm mb-2">Debug Information:</h4>
                  <div className="text-xs space-y-1 font-mono max-h-40 overflow-y-auto">
                    <div>• Browser: {navigator.userAgent}</div>
                    <div>• Facing mode: {facingMode}</div>
                    <div>• Video element: {videoRef.current ? "Available" : "Not available"}</div>
                    <div>• Video playing: {videoRef.current?.paused === false ? "Yes" : "No"}</div>
                    <div>
                      • Video dimensions: {videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0}
                    </div>
                    {debugInfo.map((info, i) => (
                      <div key={i}>{info}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add global styles for animations */}
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </>
  )
}

