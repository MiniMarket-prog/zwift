"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Camera, X, RefreshCw, AlertTriangle, Info, Play } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Define an extended Permissions interface for experimental features
interface ExtendedPermissions extends Permissions {
  // The revoke method is experimental and not in standard TypeScript definitions
  revoke?: (descriptor: PermissionDescriptor) => Promise<PermissionStatus>
}

interface MobileCameraScannerProps {
  onBarcodeDetected: (barcode: string) => void
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
  const [attemptCount, setAttemptCount] = useState(0)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [needsUserPlayInteraction, setNeedsUserPlayInteraction] = useState(false)

  // Check if running on HTTPS
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost"
      if (!isSecure) {
        logDebug("Not running on HTTPS (required for camera access)")
      }
    }
  }, [])

  // Get available cameras
  const getAvailableCameras = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      logDebug("MediaDevices API not supported")
      return []
    }

    try {
      // We need to request camera access first to get labeled devices
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })

      // Now we can enumerate devices with labels
      const devices = await navigator.mediaDevices.enumerateDevices()

      // Stop the temporary stream
      tempStream.getTracks().forEach((track) => track.stop())

      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      setAvailableCameras(videoDevices)

      logDebug(`Found ${videoDevices.length} camera(s): ${videoDevices.map((d) => d.label).join(", ")}`)

      return videoDevices
    } catch (err) {
      handleError(err as Error, "Error enumerating devices")
      return []
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
            logDebug(`Permission API state: ${result.state}`)

            // Listen for permission changes
            result.onchange = () => {
              setPermissionState(result.state as "prompt" | "granted" | "denied")
              logDebug(`Permission changed to: ${result.state}`)
            }
          } catch (err) {
            handleError(err as Error, "Permission query error")
            setPermissionState("unknown")
          }
        } else {
          // Fallback for browsers that don't support permissions API
          logDebug("Permissions API not supported")
          setPermissionState("unknown")
        }
      } catch (error) {
        console.error("Error checking camera permission:", error)
        handleError(error as Error, "Permission check error")
        setPermissionState("unknown")
      }
    }

    checkPermission()
  }, [])

  // Define startCamera outside of useEffect so it can be called from other functions
  const startCamera = useCallback(async () => {
    try {
      setErrorMessage(null)
      setAttemptCount((prev) => prev + 1)

      // Log device info for debugging
      logDebug(`Device: ${navigator.userAgent}`)
      logDebug(`Attempt #${attemptCount + 1}`)

      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API not supported in this browser")
      }

      // Stop any existing stream
      await stopAllTracks()

      // Get available cameras if we haven't already
      if (availableCameras.length === 0) {
        const cameras = await getAvailableCameras()
        if (cameras.length === 0) {
          logDebug("No cameras found on device")
        }
      }

      // Try different approaches based on attempt count
      let constraints: MediaStreamConstraints

      if (attemptCount === 0) {
        // First attempt: Use the most basic constraints possible
        logDebug("Using basic constraints (attempt #1)")
        constraints = {
          video: true,
          audio: false,
        }
      } else if (attemptCount === 1 && availableCameras.length > 0) {
        // Second attempt: Try with explicit device ID of first camera
        const deviceId = availableCameras[0].deviceId
        setSelectedDeviceId(deviceId)
        logDebug(`Using explicit device ID (attempt #2): ${deviceId.substring(0, 8)}...`)
        constraints = {
          video: { deviceId: { exact: deviceId } },
          audio: false,
        }
      } else if (attemptCount === 2) {
        // Third attempt: Try with facing mode only
        logDebug(`Using facing mode only (attempt #3): ${facingMode}`)
        constraints = {
          video: { facingMode: facingMode },
          audio: false,
        }
      } else if (attemptCount === 3 && facingMode === "environment") {
        // Fourth attempt: Try with user facing camera instead
        setFacingMode("user")
        logDebug("Switching to front camera (attempt #4)")
        constraints = {
          video: { facingMode: "user" },
          audio: false,
        }
      } else if (attemptCount === 4 && availableCameras.length > 1) {
        // Fifth attempt: Try with second camera if available
        const deviceId = availableCameras[1].deviceId
        setSelectedDeviceId(deviceId)
        logDebug(`Using second camera (attempt #5): ${deviceId.substring(0, 8)}...`)
        constraints = {
          video: { deviceId: { exact: deviceId } },
          audio: false,
        }
      } else {
        // Final fallback: Use minimal constraints with ideal (not exact) values
        logDebug(`Using fallback constraints (attempt #${attemptCount + 1})`)
        constraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 },
          },
          audio: false,
        }
      }

      logDebug(`Requesting camera with constraints: ${JSON.stringify(constraints)}`)

      try {
        // Request the camera stream with current constraints
        const newStream = await navigator.mediaDevices.getUserMedia(constraints)

        // If we get here, we have camera access
        logDebug("Camera access successful!")
        setStream(newStream)
        setPermissionState("granted")

        if (videoRef.current) {
          videoRef.current.srcObject = newStream

          // Handle video element errors
          videoRef.current.onerror = (e) => {
            const errorEvent = e as Event
            const errorMessage = errorEvent instanceof ErrorEvent ? errorEvent.message : "Unknown video error"

            const videoError = new Error(errorMessage)
            handleError(videoError, "Video element error")
          }

          // Make sure autoplay works
          videoRef.current.setAttribute("autoplay", "true")
          videoRef.current.setAttribute("playsinline", "true")

          try {
            // Try to play the video
            await videoRef.current.play()
            logDebug("Video playing successfully")
          } catch (playError) {
            // If play() fails, try again with user interaction
            handleError(playError as Error, "Video play error")
            logDebug("Play failed, will retry on user interaction")

            // We'll add a play button that appears if autoplay fails
            setNeedsUserPlayInteraction(true)
          }

          // Reset attempt count on success
          setAttemptCount(0)
        } else {
          throw new Error("Video element reference not available")
        }
      } catch (accessError) {
        // If this attempt fails, log and try again with different constraints if we haven't tried too many times
        logDebug(`Attempt #${attemptCount + 1} failed: ${(accessError as Error).message}`)

        if (attemptCount < 5) {
          // Exponential backoff with longer delays
          const delayMs = Math.min(2000 * Math.pow(2, attemptCount), 10000)
          logDebug(`Attempt failed. Waiting ${delayMs}ms before next attempt...`)
          await delay(delayMs)

          // Add more detailed logging before next attempt
          logDebug(`Camera state before next attempt:`)
          logDebug(`- Permission state: ${permissionState}`)
          logDebug(`- Selected device: ${selectedDeviceId || "default"}`)
          logDebug(`- Facing mode: ${facingMode}`)
          if (stream) {
            const tracks = stream.getTracks()
            tracks.forEach((track) => {
              logDebug(`- Track ${track.id}: enabled=${track.enabled}, muted=${track.muted}, state=${track.readyState}`)
            })
          }

          startCamera()
        } else {
          throw new Error(`Failed after ${attemptCount + 1} attempts: ${(accessError as Error).message}`)
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      handleError(error as Error, "Camera access error")

      // Handle specific error types
      const err = error as Error
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionState("denied")
        setErrorMessage("Camera permission denied. Please allow camera access in your browser settings.")
      } else if (err.name === "NotFoundError") {
        setErrorMessage("No camera found on your device.")
      } else if (err.name === "NotReadableError" || err.name === "AbortError") {
        setErrorMessage("Camera is already in use or not accessible. Try restarting your browser or device.")
      } else if (err.name === "SecurityError") {
        setErrorMessage("Camera access blocked due to security restrictions. Make sure you're using HTTPS.")
      } else if (err.name === "OverconstrainedError") {
        setErrorMessage("Camera doesn't support the requested settings. Please try again with different settings.")
      } else {
        setErrorMessage(`Could not access camera: ${err.message}`)
      }

      toast({
        title: "Camera access error",
        description: errorMessage || "Could not access your camera. Please check your device.",
        variant: "destructive",
      })
    }
  }, [
    facingMode,
    stream,
    toast,
    errorMessage,
    attemptCount,
    availableCameras,
    getAvailableCameras,
    permissionState,
    selectedDeviceId,
  ])

  // Handle camera stream errors - define this AFTER startCamera
  const handleCameraStreamError = useCallback(() => {
    if (stream) {
      // Stop the current stream
      stopAllTracks()
    }

    setErrorMessage("Camera stream interrupted. Please try again.")
    logDebug("Camera stream error handler triggered")

    // Attempt to restart the camera after a short delay
    setTimeout(() => {
      if (isOpen) {
        setErrorMessage(null)
        startCamera()
      }
    }, 1000)
  }, [stream, isOpen, startCamera])

  // Start the camera when the dialog opens
  useEffect(() => {
    if (!isOpen) return

    // Reset attempt count when dialog opens
    setAttemptCount(0)
    startCamera()

    // Cleanup function
    return () => {
      stopAllTracks()
    }
  }, [isOpen, startCamera, stream])

  // Switch camera between front and back
  const switchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
    setSelectedDeviceId(null)
    setAttemptCount(0)

    // If we already have a stream, stop it so we can request the new camera
    stopAllTracks()

    // Start camera with new facing mode
    startCamera()
  }

  // Force camera request
  const forceRequestCamera = async () => {
    try {
      // First, ensure any existing streams are stopped
      await stopAllTracks()

      // Clear any cached permissions if possible
      if (navigator.permissions) {
        try {
          // Try to use the experimental revoke method if available
          const extendedPermissions = navigator.permissions as ExtendedPermissions
          if (extendedPermissions.revoke) {
            await extendedPermissions.revoke({ name: "camera" as PermissionName })
            logDebug("Successfully revoked camera permission")
          } else {
            logDebug("Permission revoke not supported in this browser")
          }
        } catch (e) {
          // Ignore errors with revoke as it's experimental
          handleError(e as Error, "Error revoking permission")
        }
      }

      logDebug("Forcing new camera request")

      // Request with minimal constraints to maximize chances of success
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      })

      // If we get here, permission was granted
      tempStream.getTracks().forEach((track) => track.stop())
      setPermissionState("granted")
      setErrorMessage(null)

      // Reset attempt count
      setAttemptCount(0)

      // Reopen the camera with our preferred settings
      setIsOpen(false)
      setTimeout(() => setIsOpen(true), 100)

      toast({
        title: "Camera access granted",
        description: "You can now use the camera scanner.",
      })
    } catch (error) {
      console.error("Still can't access camera:", error)
      handleError(error as Error, "Force request failed")

      // On Android, guide the user to settings
      toast({
        title: "Camera permission required",
        description: "Please open your browser settings and enable camera permissions for this site.",
        variant: "destructive",
      })
    }
  }

  // Try a specific camera
  const trySpecificCamera = (deviceId: string) => {
    stopAllTracks()

    setSelectedDeviceId(deviceId)
    setAttemptCount(0)
    logDebug(`Manually selected camera: ${deviceId.substring(0, 8)}...`)

    // Start camera with the selected device
    startCamera()
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
        logDebug("Video track ended")
        handleCameraStreamError()
      }

      const onMute = () => {
        logDebug("Video track muted")
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
              setAttemptCount(0)
              startCamera()
            }}
          >
            Retry Camera Access
          </Button>
        )}

        {availableCameras.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium mb-2">Try a specific camera:</p>
            <div className="flex flex-col gap-2">
              {availableCameras.map((camera, index) => (
                <Button
                  key={camera.deviceId}
                  variant="outline"
                  size="sm"
                  onClick={() => trySpecificCamera(camera.deviceId)}
                >
                  {camera.label || `Camera ${index + 1}`}
                </Button>
              ))}
            </div>
          </div>
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
        <>
          {renderDebugInfo()}
          {errorMessage && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-200 dark:border-red-800">
              <p className="text-xs font-mono text-red-700 dark:text-red-300">{errorMessage}</p>
            </div>
          )}
        </>
      )}

      <div className="text-xs text-muted-foreground mt-4">
        <p className="font-semibold">Troubleshooting tips:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Restart your browser completely</li>
          <li>Try closing all other browser tabs</li>
          <li>Restart your device</li>
          <li>
            On Android, check camera permissions in Settings {">"} Apps {">"} Browser {">"} Permissions
          </li>
          <li>Try using a different browser</li>
          <li>Check if your camera works in other apps</li>
        </ol>
      </div>
    </div>
  )

  const renderDebugInfo = () => (
    <div className="mt-2 p-3 bg-muted rounded-md w-full">
      <h4 className="font-semibold text-sm mb-2">Debug Information:</h4>
      <div className="text-xs space-y-1 font-mono">
        <div>• Browser: {navigator.userAgent}</div>
        <div>• Permission state: {permissionState}</div>
        <div>• Attempt count: {attemptCount}</div>
        <div>• Selected camera: {selectedDeviceId ? `ID: ${selectedDeviceId.substring(0, 8)}...` : "default"}</div>
        <div>• Facing mode: {facingMode}</div>
        <div className="whitespace-pre-wrap">{debugInfo}</div>
      </div>
    </div>
  )

  const logDebug = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo((prev) => `${prev || ""}[${timestamp}] ${message}\n`)
  }

  const handleError = (error: Error, context: string) => {
    const errorDetails = `${context}: ${error.name} - ${error.message}`
    logDebug(`Error: ${errorDetails}`)
    console.error(errorDetails, error)

    // Update error message with more context
    setErrorMessage(`Camera error (${error.name}): ${error.message}\nContext: ${context}`)
  }

  const stopAllTracks = async () => {
    if (stream) {
      logDebug("Stopping all tracks...")
      const tracks = stream.getTracks()
      logDebug(`Found ${tracks.length} tracks to stop`)

      for (const track of tracks) {
        logDebug(`Stopping track ${track.id} (${track.kind}):`)
        logDebug(`- Enabled: ${track.enabled}`)
        logDebug(`- Muted: ${track.muted}`)
        logDebug(`- State: ${track.readyState}`)

        track.stop()
        await delay(200) // Increased delay between stopping tracks

        logDebug(`Track ${track.id} stopped. Final state: ${track.readyState}`)
      }
      setStream(null)
      logDebug("All tracks stopped and stream cleared")
    }
  }

  const handleManualPlay = async () => {
    if (videoRef.current && stream) {
      try {
        await videoRef.current.play()
        setNeedsUserPlayInteraction(false)
        logDebug("Video played successfully after user interaction")
      } catch (e) {
        handleError(e as Error, "Manual play failed")
      }
    }
  }

  const scanAnimation = `
  @keyframes scan {
    0% { top: 0; }
    100% { top: 100%; }
  }
  .animate-scan {
    animation: scan 1.5s linear infinite;
  }
`

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="flex items-center gap-1">
        <Camera className="h-4 w-4" />
        Scan
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Cleanup when dialog closes
            if (stream) {
              logDebug("Stopping all tracks due to dialog close")
              stream.getTracks().forEach((track) => {
                track.stop()
                logDebug(`Stopped track: ${track.kind}`)
              })
              setStream(null)
            }

            // Reset video element
            if (videoRef.current) {
              videoRef.current.srcObject = null
            }

            // Reset states
            setErrorMessage(null)
            setNeedsUserPlayInteraction(false)
          }
          setIsOpen(open)
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
                {/* Add loading indicator while camera initializes */}
                {!stream && !errorMessage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="animate-spin h-8 w-8 border-2 border-white rounded-full border-t-transparent"></div>
                  </div>
                )}

                {/* Video element with improved attributes and styling */}
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                  style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                />

                {/* Scanning overlay with animation */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-4/5 h-1/4 border-2 border-white rounded-md opacity-70 relative">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/70 animate-scan"></div>
                  </div>
                </div>
                {needsUserPlayInteraction && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
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
                <>
                  {renderDebugInfo()}
                  {errorMessage && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-200 dark:border-red-800">
                      <p className="text-xs font-mono text-red-700 dark:text-red-300">{errorMessage}</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

