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
  const [activeCamera, setActiveCamera] = useState<string>("unknown")

  // Check if running on HTTPS
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost"
      if (!isSecure) {
        logDebug("Not running on HTTPS (required for camera access)")
      }
    }
  }, [])

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
    if (videoRef.current) {
      const oldStream = videoRef.current.srcObject as MediaStream
      if (oldStream) {
        oldStream.getTracks().forEach((track) => {
          track.stop()
          logDebug(`Stopped track: ${track.kind}`)
        })
      }
      videoRef.current.srcObject = null
      videoRef.current.removeAttribute("srcObject")
    }

    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop()
        logDebug(`Stopped track: ${track.kind}`)
      })
      setStream(null)
    }
  }

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

      // Log detailed camera information
      videoDevices.forEach((device, index) => {
        logDebug(`Camera ${index + 1}: ${device.label || "Unnamed camera"} (ID: ${device.deviceId.substring(0, 8)}...)`)
      })

      return videoDevices
    } catch (err) {
      handleError(err as Error, "Error enumerating devices")
      return []
    }
  }, [handleError, logDebug])

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
  }, [handleError, logDebug])

  // Find back camera from available cameras
  const findBackCamera = useCallback(() => {
    // First, look for cameras with "back" in the label
    const backCamera = availableCameras.find(
      (camera) =>
        camera.label.toLowerCase().includes("back") ||
        camera.label.toLowerCase().includes("rear") ||
        camera.label.toLowerCase().includes("environment"),
    )

    if (backCamera) {
      logDebug(`Found back camera by label: ${backCamera.label}`)
      return backCamera.deviceId
    }

    // If we have exactly two cameras, assume the second one is the back camera
    // (This is a common pattern on mobile devices)
    if (availableCameras.length === 2) {
      logDebug(`Using second camera as back camera: ${availableCameras[1].label}`)
      return availableCameras[1].deviceId
    }

    // If we have more than two cameras, try the last one
    if (availableCameras.length > 2) {
      const lastCamera = availableCameras[availableCameras.length - 1]
      logDebug(`Using last camera as back camera: ${lastCamera.label}`)
      return lastCamera.deviceId
    }

    // If all else fails, return null to use facingMode constraint instead
    logDebug("Could not identify back camera, will use facingMode constraint")
    return null
  }, [availableCameras, logDebug])

  // Find front camera from available cameras
  const findFrontCamera = useCallback(() => {
    // First, look for cameras with "front" in the label
    const frontCamera = availableCameras.find(
      (camera) =>
        camera.label.toLowerCase().includes("front") ||
        camera.label.toLowerCase().includes("face") ||
        camera.label.toLowerCase().includes("user"),
    )

    if (frontCamera) {
      logDebug(`Found front camera by label: ${frontCamera.label}`)
      return frontCamera.deviceId
    }

    // If we have exactly two cameras, assume the first one is the front camera
    if (availableCameras.length === 2) {
      logDebug(`Using first camera as front camera: ${availableCameras[0].label}`)
      return availableCameras[0].deviceId
    }

    // If we have more than two cameras, try the first one
    if (availableCameras.length > 0) {
      logDebug(`Using first camera as front camera: ${availableCameras[0].label}`)
      return availableCameras[0].deviceId
    }

    // If all else fails, return null to use facingMode constraint instead
    logDebug("Could not identify front camera, will use facingMode constraint")
    return null
  }, [availableCameras, logDebug])

  // Define startCamera outside of useEffect so it can be called from other functions
  const startCamera = useCallback(async () => {
    try {
      setErrorMessage(null)
      setAttemptCount((prev) => prev + 1)

      // First, ensure any existing streams are properly cleaned up
      await stopAllTracks()

      // Reset video element
      if (videoRef.current) {
        videoRef.current.srcObject = null
        videoRef.current.removeAttribute("srcObject")
      }

      // Ensure we have the video element
      if (!videoRef.current) {
        throw new Error("Video element not available")
      }

      // Get available cameras if needed
      if (availableCameras.length === 0) {
        await getAvailableCameras()
      }

      // Set up constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      }

      logDebug(`Requesting camera with constraints: ${JSON.stringify(constraints)}`)

      // Request camera access
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)

      // Get the video track
      const videoTrack = newStream.getVideoTracks()[0]
      if (!videoTrack) {
        throw new Error("No video track available")
      }

      // Log track information
      logDebug(`Got video track: ${videoTrack.label}`)
      setActiveCamera(videoTrack.label)

      // Set up the video element
      const videoElement = videoRef.current
      videoElement.playsInline = true
      videoElement.muted = true
      videoElement.autoplay = true

      // Important: Wait for loadedmetadata before playing
      await new Promise((resolve) => {
        videoElement.onloadedmetadata = resolve
        videoElement.srcObject = newStream
      })

      // Try to play
      try {
        await videoElement.play()
        logDebug("Video playing successfully")
        setNeedsUserPlayInteraction(false)
      } catch (playError) {
        logDebug(`Play failed: ${(playError as Error).message}`)
        setNeedsUserPlayInteraction(true)
      }

      // Store the stream
      setStream(newStream)
      setPermissionState("granted")

      // Reset attempt count on success
      setAttemptCount(0)
    } catch (error) {
      console.error("Camera access error:", error)
      handleError(error as Error, "Camera initialization failed")

      if (attemptCount < 3) {
        // Try again with a delay
        const delayMs = 1000 * (attemptCount + 1)
        logDebug(`Retrying in ${delayMs}ms...`)
        setTimeout(() => startCamera(), delayMs)
      } else {
        setErrorMessage(`Could not start camera: ${(error as Error).message}`)
      }
    }
  }, [facingMode, availableCameras.length, attemptCount, getAvailableCameras, handleError, logDebug, stopAllTracks])

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
  }, [stream, isOpen, startCamera, stopAllTracks, logDebug])

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
  }, [isOpen, startCamera])

  // Switch camera between front and back
  const switchCamera = () => {
    const newFacingMode = facingMode === "environment" ? "user" : "environment"
    logDebug(`Switching camera from ${facingMode} to ${newFacingMode}`)
    setFacingMode(newFacingMode)
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
  }, [stream, handleCameraStreamError, logDebug])

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
        <div>• Requested facing mode: {facingMode}</div>
        <div>• Active camera: {activeCamera}</div>
        <div>• Selected device ID: {selectedDeviceId ? `${selectedDeviceId.substring(0, 8)}...` : "none"}</div>
        <div>• Available cameras: {availableCameras.length}</div>
        <div className="whitespace-pre-wrap">{debugInfo}</div>
      </div>
    </div>
  )

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
                  style={{
                    transform: facingMode === "user" ? "scaleX(-1)" : "none",
                    display: stream ? "block" : "none", // Only show video when we have a stream
                  }}
                />

                {/* Scanning overlay with animation */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-4/5 h-1/4 border-2 border-white rounded-md opacity-70 relative">
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-white/70"
                      style={{
                        top: "50%",
                        animation: "pulse 1.5s infinite",
                        boxShadow: "0 0 8px rgba(255, 255, 255, 0.8)",
                      }}
                    ></div>
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

                {/* Camera info overlay */}
                <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                  {activeCamera !== "unknown" ? activeCamera.split(" ")[0] : facingMode}
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

