"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Camera, X, RefreshCw, AlertTriangle, Info, Play, Laptop, Smartphone, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface MobileCameraScannerProps {
  onBarcodeDetected: (barcode: string) => void
}

export function MobileCameraScanner({ onBarcodeDetected }: MobileCameraScannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false)
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null)
  const [isLaptop, setIsLaptop] = useState(false)
  const [isProcessingCapture, setIsProcessingCapture] = useState(false)
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastDetectionTimeRef = useRef<number>(0)

  // Add debug info with timestamp
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo((prev) => {
      const newInfo = [...prev, `[${timestamp}] ${message}`]
      // Keep only the last 50 messages to avoid memory issues
      if (newInfo.length > 50) {
        return newInfo.slice(newInfo.length - 50)
      }
      return newInfo
    })
    console.log(`[Camera Debug] ${message}`)
  }

  // Check if BarcodeDetector is available
  const isBarcodeDetectorSupported = typeof window !== "undefined" && "BarcodeDetector" in window

  // Detect if running on a laptop/desktop
  useEffect(() => {
    // Simple heuristic - mobile devices typically have 'ontouchstart' in window
    const isMobileDevice = typeof window !== "undefined" && "ontouchstart" in window
    setIsLaptop(!isMobileDevice)
    addDebugInfo(`Device type detected: ${!isMobileDevice ? "Laptop/Desktop" : "Mobile"}`)
  }, [])

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

          // Try to set focus mode to 'continuous' for better barcode scanning if available
          try {
            const capabilities = videoTrack.getCapabilities() as any
            addDebugInfo(`Camera capabilities: ${JSON.stringify(capabilities)}`)

            // Use type assertion to handle focusMode which may not be in the TypeScript definitions
            if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
              await videoTrack.applyConstraints({
                advanced: [{ focusMode: "continuous" } as any],
              })
              addDebugInfo("Set focus mode to continuous")
            }
          } catch (e) {
            addDebugInfo(`Could not get/set camera capabilities: ${(e as Error).message}`)
          }
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
            addDebugInfo(`Video dimensions: ${videoRef.current?.videoWidth || 0}x${videoRef.current?.videoHeight || 0}`)
            // Start scanning once video is loaded
            startBarcodeScanning()
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
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }

      if (stream) {
        addDebugInfo("Stopping camera stream")
        stream.getTracks().forEach((track) => track.stop())
      }

      setIsScanning(false)
    }
  }, [isOpen, facingMode])

  // Toggle auto detection
  useEffect(() => {
    if (autoDetectionEnabled) {
      startAutoDetection()
    } else {
      stopAutoDetection()
    }

    return () => {
      stopAutoDetection()
    }
  }, [autoDetectionEnabled])

  // Function to start barcode scanning - now just sets up the canvas
  const startBarcodeScanning = async () => {
    if (!videoRef.current || !canvasRef.current) {
      addDebugInfo("Cannot start scanning: video or canvas ref not available")
      return
    }

    addDebugInfo("Scanner initialized")

    // Check if native BarcodeDetector is available
    if (isBarcodeDetectorSupported) {
      try {
        const formats = await (window as any).BarcodeDetector.getSupportedFormats()
        addDebugInfo(`Supported formats: ${formats.join(", ")}`)
      } catch (error) {
        addDebugInfo(`BarcodeDetector initialization error: ${(error as Error).message}`)
      }
    }
  }

  // Start automatic detection
  const startAutoDetection = () => {
    if (!videoRef.current || !canvasRef.current || scanIntervalRef.current) {
      return
    }

    addDebugInfo("Starting automatic detection")
    setIsScanning(true)

    // Set up scanning interval
    scanIntervalRef.current = setInterval(() => {
      if (isProcessingCapture) return // Don't scan if already processing a manual capture

      // Throttle detection to avoid excessive processing
      const now = Date.now()
      if (now - lastDetectionTimeRef.current < 500) return

      lastDetectionTimeRef.current = now

      // Process current video frame
      processVideoFrame(false) // false = don't show error messages for auto detection
    }, 1000) // Check every second
  }

  // Stop automatic detection
  const stopAutoDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
      setIsScanning(false)
      addDebugInfo("Automatic detection stopped")
    }
  }

  // Switch camera
  const switchCamera = () => {
    // Stop scanning before switching
    const wasAutoDetectionEnabled = autoDetectionEnabled
    if (wasAutoDetectionEnabled) {
      stopAutoDetection()
    }

    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
    addDebugInfo(`Switching camera to ${facingMode === "environment" ? "user" : "environment"}`)

    // Restart auto detection if it was enabled
    if (wasAutoDetectionEnabled) {
      setTimeout(() => {
        setAutoDetectionEnabled(true)
      }, 1000)
    }
  }

  // Handle manual play (for browsers that require user interaction)
  const handleManualPlay = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play()
        setNeedsUserInteraction(false)
        addDebugInfo("Video played after user interaction")
        startBarcodeScanning()
      } catch (err) {
        addDebugInfo(`Manual play failed: ${(err as Error).message}`)
      }
    }
  }

  // Process video frame for barcode detection
  const processVideoFrame = async (showErrors = true) => {
    if (!videoRef.current || !canvasRef.current) {
      addDebugInfo("Cannot process: video or canvas ref not available")
      return
    }

    if (isProcessingCapture) {
      return
    }

    if (showErrors) {
      setIsProcessingCapture(true)
    }

    try {
      // Draw the current video frame to the canvas
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (!context) {
        throw new Error("Could not get canvas context")
      }

      // Set canvas dimensions to match video
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight

      // Draw video frame to canvas
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

      // For laptop cameras, try to enhance the image for better barcode detection
      if (isLaptop) {
        try {
          // Increase contrast
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data

          // Simple contrast enhancement
          const contrast = 1.5 // Increase contrast
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))

          for (let i = 0; i < data.length; i += 4) {
            data[i] = factor * (data[i] - 128) + 128 // red
            data[i + 1] = factor * (data[i + 1] - 128) + 128 // green
            data[i + 2] = factor * (data[i + 2] - 128) + 128 // blue
          }

          context.putImageData(imageData, 0, 0)
          if (showErrors) addDebugInfo("Applied contrast enhancement for laptop camera")
        } catch (e) {
          if (showErrors) addDebugInfo(`Image enhancement failed: ${(e as Error).message}`)
        }
      }

      // Try to detect barcode with BarcodeDetector if available
      if (isBarcodeDetectorSupported) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_39", "code_128", "qr_code", "data_matrix", "upc_a", "upc_e"],
        })

        try {
          const barcodes = await barcodeDetector.detect(canvas)

          if (barcodes.length > 0) {
            // Get the first detected barcode
            const barcode = barcodes[0]
            addDebugInfo(`Barcode detected: ${barcode.rawValue}`)

            // Only process if it's a new code or we haven't detected one in a while
            if (barcode.rawValue !== lastDetectedCode || Date.now() - lastDetectionTimeRef.current > 3000) {
              handleSuccessfulScan(barcode.rawValue)
              return true
            }
          } else if (showErrors) {
            addDebugInfo("No barcode found in capture")
            // Try ZXing as fallback
            return await detectWithZXing(canvas, showErrors)
          }
        } catch (error) {
          if (showErrors) {
            addDebugInfo(`Detection error: ${(error as Error).message}`)
            // Fallback to ZXing if available
            return await detectWithZXing(canvas, showErrors)
          }
        }
      } else if (showErrors) {
        // If BarcodeDetector is not available, try ZXing
        return await detectWithZXing(canvas, showErrors)
      }
    } catch (error) {
      if (showErrors) {
        addDebugInfo(`Processing error: ${(error as Error).message}`)
        toast({
          title: "Capture failed",
          description: "Please try again",
          variant: "destructive",
        })
      }
    } finally {
      if (showErrors) {
        setIsProcessingCapture(false)
      }
    }

    return false
  }

  // Manual capture button handler
  const handleManualCapture = async () => {
    processVideoFrame(true)
  }

  // Helper function to detect with ZXing
  const detectWithZXing = async (canvas: HTMLCanvasElement, showErrors = true): Promise<boolean> => {
    try {
      // Dynamically import ZXing
      const ZXing = await import("@zxing/library")

      const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas)
      const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource))

      const hints = new Map()
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.QR_CODE,
        ZXing.BarcodeFormat.DATA_MATRIX,
      ])

      try {
        const result = new ZXing.MultiFormatReader().decode(binaryBitmap, hints)

        if (result && result.getText()) {
          const barcode = result.getText()
          addDebugInfo(`ZXing detected barcode: ${barcode}`)
          handleSuccessfulScan(barcode)
          return true
        } else if (showErrors) {
          // Try with inverted image for laptop cameras
          if (isLaptop) {
            try {
              // Get the canvas context again
              const context = canvas.getContext("2d")
              if (!context) throw new Error("Could not get canvas context")

              // Invert the image
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
              const data = imageData.data

              for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i] // red
                data[i + 1] = 255 - data[i + 1] // green
                data[i + 2] = 255 - data[i + 2] // blue
              }

              context.putImageData(imageData, 0, 0)
              addDebugInfo("Trying with inverted image")

              // Create new bitmap from inverted image
              const invertedSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas)
              const invertedBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(invertedSource))

              try {
                const result = new ZXing.MultiFormatReader().decode(invertedBitmap, hints)

                if (result && result.getText()) {
                  const barcode = result.getText()
                  addDebugInfo(`ZXing detected (inverted): ${barcode}`)
                  handleSuccessfulScan(barcode)
                  return true
                }
              } catch (e) {
                // ZXing throws errors when no barcode is found
              }
            } catch (e) {
              addDebugInfo(`Inversion failed: ${(e as Error).message}`)
            }
          }

          addDebugInfo("ZXing could not detect a barcode")
          if (showErrors) {
            toast({
              title: "No barcode detected",
              description: isLaptop
                ? "Try adjusting the position, lighting, or distance (6-12 inches from camera)"
                : "Try adjusting the position or lighting",
              variant: "destructive",
            })
          }
        }
      } catch (error) {
        if (showErrors) {
          addDebugInfo(`ZXing decode error: ${(error as Error).message}`)
          toast({
            title: "No barcode detected",
            description: isLaptop
              ? "Try adjusting the position, lighting, or distance (6-12 inches from camera)"
              : "Try adjusting the position or lighting",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      if (showErrors) {
        addDebugInfo(`ZXing import error: ${(error as Error).message}`)
        // If all else fails, show a message
        toast({
          title: "Barcode detection failed",
          description: "Your device may not support barcode scanning",
          variant: "destructive",
        })
      }
    }

    return false
  }

  // Handle successful barcode scan
  const handleSuccessfulScan = (barcode: string) => {
    // Stop auto detection
    stopAutoDetection()
    setIsProcessingCapture(false)
    setLastDetectedCode(barcode)

    // Play success sound
    try {
      const audio = new Audio("/sounds/beep.mp3")
      audio.play().catch((e) => console.log("Audio play failed:", e))
    } catch (e) {
      console.log("Audio play failed:", e)
    }

    // Call the callback with the detected barcode
    onBarcodeDetected(barcode)

    // Close the dialog
    setIsOpen(false)

    // Show a success toast
    toast({
      title: "Barcode detected",
      description: `Detected barcode: ${barcode}`,
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
          if (!open) {
            stopAutoDetection()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isLaptop ? (
                <div className="flex items-center">
                  <Laptop className="h-4 w-4 mr-2" />
                  Desktop Camera Scanner
                </div>
              ) : (
                <div className="flex items-center">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile Camera Scanner
                </div>
              )}
            </DialogTitle>
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

                {/* Hidden canvas for image processing */}
                <canvas
                  ref={canvasRef}
                  style={{
                    display: "none",
                    position: "absolute",
                    pointerEvents: "none",
                  }}
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

                {/* Mode indicator */}
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {isLaptop ? (
                    <>
                      <Laptop className="h-3 w-3 mr-1" />
                      Desktop
                    </>
                  ) : (
                    <>
                      <Smartphone className="h-3 w-3 mr-1" />
                      Mobile
                    </>
                  )}
                  {isScanning && (
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#4ade80",
                        marginLeft: "4px",
                        animation: "pulse 1s infinite",
                      }}
                    ></div>
                  )}
                </div>

                {/* Processing indicator */}
                {isProcessingCapture && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                      <p className="text-white text-sm">Processing...</p>
                    </div>
                  </div>
                )}

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

              <div className="flex items-center space-x-2 mt-2">
                <Switch id="auto-detection" checked={autoDetectionEnabled} onCheckedChange={setAutoDetectionEnabled} />
                <Label htmlFor="auto-detection" className="text-sm cursor-pointer">
                  {autoDetectionEnabled ? (
                    <span className="flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      Auto Detection Enabled
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Auto Detection Disabled
                    </span>
                  )}
                </Label>
              </div>

              <p className="text-sm text-center text-muted-foreground">
                {isLaptop ? (
                  <>Position the barcode 6-12 inches from the camera and ensure good lighting</>
                ) : (
                  <>Position the barcode within the frame and tap "Capture" when ready</>
                )}
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

                  <Button onClick={handleManualCapture} disabled={isProcessingCapture}>
                    <Camera className="h-4 w-4 mr-2" />
                    {isProcessingCapture ? "Processing..." : "Capture"}
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
                    <div>• Device type: {isLaptop ? "Laptop/Desktop" : "Mobile"}</div>
                    <div>• Facing mode: {facingMode}</div>
                    <div>• BarcodeDetector API: {isBarcodeDetectorSupported ? "Supported" : "Not supported"}</div>
                    <div>• Video element: {videoRef.current ? "Available" : "Not available"}</div>
                    <div>• Video playing: {videoRef.current?.paused === false ? "Yes" : "No"}</div>
                    <div>
                      • Video dimensions: {videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0}
                    </div>
                    <div>• Auto detection: {autoDetectionEnabled ? "Enabled" : "Disabled"}</div>
                    <div>• Scanning active: {isScanning ? "Yes" : "No"}</div>
                    <div>• Last detected code: {lastDetectedCode || "None"}</div>
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

