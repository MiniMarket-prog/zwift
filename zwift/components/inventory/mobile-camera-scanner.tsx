"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Camera, X, RefreshCw, AlertTriangle, Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Define an extended Permissions interface for experimental features
interface ExtendedPermissions extends Permissions {
  // The revoke method is experimental and not in standard TypeScript definitions
  revoke?: (descriptor: PermissionDescriptor) => Promise<PermissionStatus>
}

interface MobileCameraScannerProps {
  onBarcodeDetected: (barcode: string) => void
}

export function MobileCameraScanner({ onBarcodeDetected }: MobileCameraScannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unknown">("unknown")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  // Check if running on HTTPS
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost"
      if (!isSecure) {
        setDebugInfo((prev) => `${prev || ""}• Not running on HTTPS (required for camera access)\n`)
      }
    }
  }, [])

  // Check camera permission status
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Check if the browser supports permissions API
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const result = await navigator.permissions.query({ name: "camera" as PermissionName })
            setPermissionState(result.state as "prompt" | "granted" | "denied")
            setDebugInfo((prev) => `${prev || ""}• Permission API state: ${result.state}\n`)

            // Listen for permission changes
            result.onchange = () => {
              setPermissionState(result.state as "prompt" | "granted" | "denied")
              setDebugInfo((prev) => `${prev || ""}• Permission changed to: ${result.state}\n`)
            }
          } catch (err) {
            setDebugInfo((prev) => `${prev || ""}• Permission query error: ${(err as Error).message}\n`)
            setPermissionState("unknown")
          }
        } else {
          // Fallback for browsers that don't support permissions API
          setDebugInfo((prev) => `${prev || ""}• Permissions API not supported\n`)
          setPermissionState("unknown")
        }
      } catch (error) {
        console.error("Error checking camera permission:", error)
        setDebugInfo((prev) => `${prev || ""}• Permission check error: ${(error as Error).message}\n`)
        setPermissionState("unknown")
      }
    }

    checkPermission()
  }, [])

  // Define startCamera outside of useEffect so it can be called from other functions
  const startCamera = useCallback(async () => {
    try {
      setErrorMessage(null)

      // Log device info for debugging
      setDebugInfo((prev) => `${prev || ""}• Device: ${navigator.userAgent}\n`)

      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API not supported in this browser")
      }

      // Log available devices for debugging
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((device) => device.kind === "videoinput")
        setDebugInfo((prev) => `${prev || ""}• Available cameras: ${videoDevices.length}\n`)

        // Log each camera device for debugging
        videoDevices.forEach((device, index) => {
          setDebugInfo(
            (prev) =>
              `${prev || ""}• Camera ${index + 1}: ${device.label || "unnamed"} (${device.deviceId.substring(0, 8)}...)\n`,
          )
        })
      } catch (err) {
        setDebugInfo((prev) => `${prev || ""}• Could not enumerate devices: ${(err as Error).message}\n`)
      }

      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop()
          setDebugInfo((prev) => `${prev || ""}• Stopped existing track: ${track.kind}\n`)
        })
        setStream(null)
      }

      // Start with very basic constraints first
      setDebugInfo((prev) => `${prev || ""}• Attempting to access camera with basic constraints\n`)

      try {
        // First try with simple constraints
        const basicConstraints = {
          video: true,
          audio: false,
        }

        setDebugInfo((prev) => `${prev || ""}• Requesting camera with basic constraints\n`)
        const newStream = await navigator.mediaDevices.getUserMedia(basicConstraints)

        // If we get here, we have basic camera access
        setDebugInfo((prev) => `${prev || ""}• Basic camera access successful\n`)

        // Now try to get the preferred camera if we have multiple cameras
        if (facingMode !== "user") {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const videoDevices = devices.filter((device) => device.kind === "videoinput")

            // If we have multiple cameras, try to get the back camera
            if (videoDevices.length > 1) {
              setDebugInfo((prev) => `${prev || ""}• Attempting to switch to back camera\n`)

              // Stop the basic stream
              newStream.getTracks().forEach((track) => track.stop())

              // Try to get the back camera
              const advancedConstraints = {
                video: {
                  facingMode: "environment",
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
                audio: false,
              }

              const preferredStream = await navigator.mediaDevices.getUserMedia(advancedConstraints)
              setDebugInfo((prev) => `${prev || ""}• Successfully switched to back camera\n`)
              setStream(preferredStream)

              if (videoRef.current) {
                videoRef.current.srcObject = preferredStream
                await videoRef.current.play()
              }
              return // Exit early since we've set up the preferred stream
            }
          } catch (err) {
            setDebugInfo((prev) => `${prev || ""}• Failed to switch to back camera: ${(err as Error).message}\n`)
            // Continue with the basic stream if we can't get the preferred camera
          }
        }

        // If we didn't return early with a preferred stream, use the basic stream
        setStream(newStream)
        setPermissionState("granted")

        if (videoRef.current) {
          videoRef.current.srcObject = newStream

          // Handle video element errors
          videoRef.current.onerror = (e) => {
            setDebugInfo((prev) => `${prev || ""}• Video element error: ${e}\n`)
          }

          // Add event listeners for track ended or muted
          newStream.getVideoTracks().forEach((track) => {
            track.onended = () => {
              setDebugInfo((prev) => `${prev || ""}• Video track ended unexpectedly\n`)
              setErrorMessage("Camera stream ended unexpectedly. Please try again.")
            }

            track.onmute = () => {
              setDebugInfo((prev) => `${prev || ""}• Video track muted\n`)
            }

            track.onunmute = () => {
              setDebugInfo((prev) => `${prev || ""}• Video track unmuted\n`)
            }
          })

          await videoRef.current.play().catch((e) => {
            setDebugInfo((prev) => `${prev || ""}• Video play error: ${e.message}\n`)
            throw e
          })

          setDebugInfo((prev) => `${prev || ""}• Video playing successfully\n`)
        } else {
          throw new Error("Video element reference not available")
        }
      } catch (basicError) {
        // If basic constraints fail, log and throw the error
        setDebugInfo((prev) => `${prev || ""}• Basic camera access failed: ${(basicError as Error).message}\n`)
        throw basicError
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      const errorMsg = (error as Error).message || String(error)
      setDebugInfo((prev) => `${prev || ""}• Camera error: ${errorMsg}\n`)

      // Handle specific error types
      if ((error as Error).name === "NotAllowedError" || (error as Error).name === "PermissionDeniedError") {
        setPermissionState("denied")
        setErrorMessage("Camera permission denied. Please allow camera access in your browser settings.")
      } else if ((error as Error).name === "NotFoundError") {
        setErrorMessage("No camera found on your device.")
      } else if ((error as Error).name === "NotReadableError" || (error as Error).name === "AbortError") {
        setErrorMessage("Camera is already in use by another application or not accessible.")
      } else if ((error as Error).name === "SecurityError") {
        setErrorMessage("Camera access blocked due to security restrictions. Make sure you're using HTTPS.")
      } else if ((error as Error).name === "OverconstrainedError") {
        setErrorMessage("Camera doesn't support the requested settings. Please try again with different settings.")
      } else {
        setErrorMessage(`Could not access camera: ${errorMsg}`)
      }

      toast({
        title: "Camera access error",
        description: errorMessage || "Could not access your camera. Please check your device.",
        variant: "destructive",
      })
    }
  }, [facingMode, stream, toast, errorMessage])

  // Start the camera when the dialog opens
  useEffect(() => {
    if (!isOpen) return

    startCamera()

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        setStream(null)
      }
    }
  }, [isOpen, startCamera, stream])

  // Switch camera between front and back
  const switchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))

    // If we already have a stream, stop it so we can request the new camera
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  // Handle camera stream errors
  const handleCameraStreamError = useCallback(() => {
    if (stream) {
      // Stop the current stream
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    setErrorMessage("Camera stream interrupted. Please try again.")
    setDebugInfo((prev) => `${prev || ""}• Camera stream error handler triggered\n`)

    // Attempt to restart the camera after a short delay
    setTimeout(() => {
      if (isOpen) {
        setErrorMessage(null)
        startCamera()
      }
    }, 1000)
  }, [stream, isOpen, startCamera])

  // Force camera request
  const forceRequestCamera = async () => {
    try {
      // First, ensure any existing streams are stopped
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        setStream(null)
      }

      // Clear any cached permissions if possible
      if (navigator.permissions) {
        try {
          // Try to use the experimental revoke method if available
          const extendedPermissions = navigator.permissions as ExtendedPermissions
          if (extendedPermissions.revoke) {
            await extendedPermissions.revoke({ name: "camera" as PermissionName })
            setDebugInfo((prev) => `${prev || ""}• Successfully revoked camera permission\n`)
          } else {
            setDebugInfo((prev) => `${prev || ""}• Permission revoke not supported in this browser\n`)
          }
        } catch (e) {
          // Ignore errors with revoke as it's experimental
          setDebugInfo((prev) => `${prev || ""}• Error revoking permission: ${(e as Error).message}\n`)
        }
      }

      setDebugInfo((prev) => `${prev || ""}• Forcing new camera request\n`)

      // Request with minimal constraints to maximize chances of success
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      })

      // If we get here, permission was granted
      tempStream.getTracks().forEach((track) => track.stop())
      setPermissionState("granted")
      setErrorMessage(null)

      // Reopen the camera with our preferred settings
      setIsOpen(false)
      setTimeout(() => setIsOpen(true), 100)

      toast({
        title: "Camera access granted",
        description: "You can now use the camera scanner.",
      })
    } catch (error) {
      console.error("Still can't access camera:", error)
      setDebugInfo((prev) => `${prev || ""}• Force request failed: ${(error as Error).message}\n`)

      // On Android, guide the user to settings
      toast({
        title: "Camera permission required",
        description: "Please open your browser settings and enable camera permissions for this site.",
        variant: "destructive",
      })
    }
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

  // Add this useEffect after the camera initialization useEffect
  useEffect(() => {
    if (!stream) return

    const videoTracks = stream.getVideoTracks()

    // Set up event listeners for all video tracks
    const trackEndedListeners = videoTracks.map((track) => {
      const onEnded = () => {
        setDebugInfo((prev) => `${prev || ""}• Video track ended\n`)
        handleCameraStreamError()
      }

      const onMute = () => {
        setDebugInfo((prev) => `${prev || ""}• Video track muted\n`)
      }

      track.addEventListener("ended", onEnded)
      track.addEventListener("mute", onMute)

      return { track, onEnded, onMute }
    })

    // Clean up event listeners
    return () => {
      trackEndedListeners.forEach(({ track, onEnded, onMute }) => {
        track.removeEventListener("ended", onEnded)
        track.removeEventListener("mute", onMute)
      })
    }
  }, [stream, handleCameraStreamError])

  // Render permission denied or error view
  const renderErrorView = () => (
    <div className="p-6 flex flex-col items-center justify-center gap-4">
      <AlertTriangle className="h-12 w-12 text-amber-500" />
      <h3 className="text-lg font-semibold">Camera Access Issue</h3>
      <p className="text-center text-muted-foreground">
        {errorMessage || "Please allow camera access to scan barcodes."}
      </p>
      <div className="flex flex-col gap-2 w-full">
        {permissionState === "denied" ? (
          <Button onClick={forceRequestCamera}>Request Camera Access</Button>
        ) : (
          <Button
            onClick={() => {
              setErrorMessage(null)
              setIsOpen(false)
              setTimeout(() => setIsOpen(true), 500)
            }}
          >
            Retry Camera Access
          </Button>
        )}
        <Button variant="outline" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowDebugInfo(!showDebugInfo)} className="mt-2">
          <Info className="h-4 w-4 mr-2" />
          {showDebugInfo ? "Hide Debug Info" : "Show Debug Info"}
        </Button>
      </div>

      {showDebugInfo && (
        <div className="mt-4 p-3 bg-muted rounded-md w-full">
          <h4 className="font-semibold text-sm mb-2">Debug Information:</h4>
          <pre className="text-xs whitespace-pre-wrap break-words">{debugInfo || "No debug information available"}</pre>
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-4">
        <p className="font-semibold">Troubleshooting tips:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Make sure no other apps are using your camera</li>
          <li>Try closing other browser tabs that might be using the camera</li>
          <li>Restart your browser</li>
          <li>
            On Android, check camera permissions in Settings {">"} Apps {">"} Browser {">"} Permissions
          </li>
          <li>Try using a different browser</li>
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

          {errorMessage || permissionState === "denied" ? (
            renderErrorView()
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
                  <pre className="text-xs whitespace-pre-wrap break-words">
                    {debugInfo || "No debug information available"}
                  </pre>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

