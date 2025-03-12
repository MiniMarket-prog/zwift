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
  }, [availableCameras])

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
  }, [availableCameras])

  // Define startCamera outside of useEffect so it can be called from other functions
  const startCamera = useCallback(async () => {
    try {
      setErrorMessage(null)
      setAttemptCount((prev) => prev + 1)

      // Log device info for debugging
      logDebug(`Device: ${navigator.userAgent}`)
      logDebug(`Attempt #${attemptCount + 1}`)
      logDebug(`Requested camera facing: ${facingMode}`)

      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API not supported in this browser")
      }

      // Stop any existing stream
      await stopAllTracks()

      // Get available cameras if we haven't already
      if (availableCameras.length === 0) {
        await getAvailableCameras()
      }

      // Determine which camera to use based on facingMode
      let constraints: MediaStreamConstraints
      let specificCameraId: string | null = null

      if (facingMode === "environment") {
        specificCameraId = findBackCamera()
        if (specificCameraId) {
          logDebug(`Using specific back camera ID: ${specificCameraId.substring(0, 8)}...`)
          constraints = {
            video: {
              deviceId: { exact: specificCameraId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          }
        } else {
          logDebug("Using environment facingMode constraint")
          constraints = {
            video: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          }
        }
      } else {
        specificCameraId = findFrontCamera()
        if (specificCameraId) {
          logDebug(`Using specific front camera ID: ${specificCameraId.substring(0, 8)}...`)
          constraints = {
            video: {
              deviceId: { exact: specificCameraId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          }
        } else {
          logDebug("Using user facingMode constraint")
          constraints = {
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          }
        }
      }

      logDebug(`Requesting camera with constraints: ${JSON.stringify(constraints)}`)

      try {
        // Request the camera stream with current constraints
        const newStream = await navigator.mediaDevices.getUserMedia(constraints)

        // If we get here, we have camera access
        logDebug("Camera access successful!")

        // Get information about the active track
        const videoTrack = newStream.getVideoTracks()[0]
        if (videoTrack) {
          setActiveCamera(videoTrack.label)
          logDebug(`Active camera: ${videoTrack.label}`)

          // Log camera capabilities
          const capabilities = videoTrack.getCapabilities()
          logDebug(`Camera capabilities: ${JSON.stringify(capabilities)}`)

          // Try to set frame rate to improve performance
          if (capabilities.frameRate && capabilities.frameRate.max) {
            try {
              const settings = { frameRate: Math.min(30, capabilities.frameRate.max) }
              await videoTrack.applyConstraints(settings)
              logDebug(`Applied frame rate: ${settings.frameRate} fps`)
            } catch (e) {
              logDebug(`Could not apply frame rate settings: ${(e as Error).message}`)
            }
          }
        }

        setStream(newStream)
        setPermissionState("granted")

        if (videoRef.current) {
          // Important: Set srcObject to null first to reset any previous state
          videoRef.current.srcObject = null

          // Small delay before setting the new stream
          await delay(100)

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

          // Set video to low latency mode
          videoRef.current.setAttribute("muted", "true")

          // Optimize video performance
          if ("mozCancelFullScreen" in document) {
            // Firefox-specific
            videoRef.current.setAttribute("mozfullscreenchange", "true")
          }

          try {
            // Try to play the video
            await videoRef.current.play()
            logDebug("Video playing successfully")
            setNeedsUserPlayInteraction(false)
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
          // Try a different approach based on the attempt count
          if (attemptCount === 0) {
            // Try with basic constraints
            logDebug("Will try with basic constraints next")
          } else if (attemptCount === 1) {
            // Try with the opposite camera
            logDebug(`Will try with ${facingMode === "environment" ? "user" : "environment"} camera next`)
            setFacingMode(facingMode === "environment" ? "user" : "environment")
          } else if (attemptCount === 2 && availableCameras.length > 0) {
            // Try with the first available camera
            logDebug(`Will try with first available camera next`)
            setSelectedDeviceId(availableCameras[0].deviceId)
          } else if (attemptCount === 3 && availableCameras.length > 1) {
            // Try with the second available camera
            logDebug(`Will try with second available camera next`)
            setSelectedDeviceId(availableCameras[1].deviceId)
          } else {
            // Try with minimal constraints
            logDebug("Will try with minimal constraints next")
          }

          // Wait before trying again
          const delayMs = Math.min(1000 * Math.pow(1.5, attemptCount), 5000)
          logDebug(`Waiting ${delayMs}ms before next attempt...`)
          await delay(delayMs)

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
    findBackCamera,
    findFrontCamera,
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
        <div>• Requested facing mode: {facingMode}</div>
        <div>• Active camera: {activeCamera}</div>
        <div>• Selected device ID: {selectedDeviceId ? `${selectedDeviceId.substring(0, 8)}...` : "none"}</div>
        <div>• Available cameras: {availableCameras.length}</div>
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

      // Clear video element source before clearing stream
      if (videoRef.current) {
        videoRef.current.srcObject = null
        logDebug("Cleared video element source")
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

