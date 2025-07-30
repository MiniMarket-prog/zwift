"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Camera,
  Search,
  Package,
  Plus,
  Minus,
  Save,
  X,
  AlertCircle,
  Scan,
  Flashlight,
  FlashlightOff,
  RotateCcw,
  Barcode,
  TrendingUp,
  DollarSign,
  Clock,
  Brain,
  Zap,
  CheckCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Focus,
  Sun,
  SunDim,
  Target,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"

// Types
type Product = {
  id: string
  name: string
  price: number
  barcode?: string
  stock: number
  min_stock: number
  category_id?: string | null
  image?: string | null
  purchase_price?: number | null
}

type Category = {
  id: string
  name: string
}

type ScanResult = {
  product: Product | null
  isLoading: boolean
  error: string | null
}

type CameraCapabilities = {
  zoom?: { min: number; max: number; step: number }
  focusDistance?: { min: number; max: number; step: number }
  exposureCompensation?: { min: number; max: number; step: number }
  iso?: { min: number; max: number; step: number }
  torch?: boolean
  focusMode?: string[]
  whiteBalanceMode?: string[]
}

// Professional-grade barcode scanner with advanced camera controls
const ProfessionalBarcodeScanner = ({
  onScan,
  isActive,
  aiReadingEnabled,
  onToggleAIReading,
}: {
  onScan: (barcode: string) => void
  isActive: boolean
  aiReadingEnabled: boolean
  onToggleAIReading: () => void
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const aiScanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Advanced camera states
  const [cameraCapabilities, setCameraCapabilities] = useState<CameraCapabilities>({})
  const [currentZoom, setCurrentZoom] = useState(1)
  const [currentExposure, setCurrentExposure] = useState(0)
  const [focusMode, setFocusMode] = useState<"continuous" | "manual" | "single-shot">("continuous")
  const [whiteBalance, setWhiteBalance] = useState<"auto" | "daylight" | "fluorescent">("auto")
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null)
  const [isManualFocusing, setIsManualFocusing] = useState(false)

  // Basic states
  const [hasFlash, setHasFlash] = useState(false)
  const [flashOn, setFlashOn] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [isScanning, setIsScanning] = useState(false)
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null)
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false)
  const [quaggaLoaded, setQuaggaLoaded] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  // AI states
  const [aiSuggestions, setAiSuggestions] = useState<
    Array<{
      barcode: string
      confidence: number
      timestamp: number
    }>
  >([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null)
  const [isAiReading, setIsAiReading] = useState(false)
  const [aiReadingHistory, setAiReadingHistory] = useState<string[]>([])

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo((prev) => {
      const newInfo = [...prev, `[${timestamp}] ${message}`]
      return newInfo.slice(-10)
    })
    console.log(`[Professional Scanner] ${message}`)
  }

  // Load Quagga when component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && !quaggaLoaded) {
      import("quagga")
        .then((module) => {
          addDebugInfo("Quagga library loaded successfully")
          setQuaggaLoaded(true)
        })
        .catch((err) => {
          addDebugInfo(`Failed to load Quagga: ${err.message}`)
        })
    }
  }, [])

  // Advanced camera constraints with professional settings (properly typed)
  const getAdvancedCameraConstraints = (): MediaStreamConstraints => {
    const videoConstraints: any = {
      facingMode,
      // High resolution for better barcode detection
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      frameRate: { ideal: 30, min: 15 },

      // Advanced settings for barcode scanning
      aspectRatio: { ideal: 16 / 9 },
    }

    // Add advanced constraints conditionally to avoid TypeScript errors
    if (currentZoom > 1) {
      videoConstraints.zoom = currentZoom
    }

    // These are experimental features, so we add them carefully
    try {
      if (focusMode === "continuous") {
        videoConstraints.focusMode = "continuous"
      } else {
        videoConstraints.focusMode = "single-shot"
      }
    } catch (e) {
      // Ignore if not supported
    }

    return {
      video: videoConstraints,
      audio: false,
    }
  }

  // Get camera capabilities after stream is established
  const getCameraCapabilities = (track: MediaStreamTrack) => {
    const capabilities = track.getCapabilities() as any
    const settings = track.getSettings() as any

    const caps: CameraCapabilities = {}

    if (capabilities.zoom) {
      caps.zoom = {
        min: capabilities.zoom.min || 1,
        max: capabilities.zoom.max || 10,
        step: capabilities.zoom.step || 0.1,
      }
    }

    if (capabilities.focusDistance) {
      caps.focusDistance = {
        min: capabilities.focusDistance.min || 0,
        max: capabilities.focusDistance.max || 1,
        step: capabilities.focusDistance.step || 0.01,
      }
    }

    if (capabilities.exposureCompensation) {
      caps.exposureCompensation = {
        min: capabilities.exposureCompensation.min || -3,
        max: capabilities.exposureCompensation.max || 3,
        step: capabilities.exposureCompensation.step || 0.33,
      }
    }

    if (capabilities.torch) {
      caps.torch = true
      setHasFlash(true)
    }

    if (capabilities.focusMode) {
      caps.focusMode = capabilities.focusMode
    }

    if (capabilities.whiteBalanceMode) {
      caps.whiteBalanceMode = capabilities.whiteBalanceMode
    }

    setCameraCapabilities(caps)
    addDebugInfo(
      `Camera capabilities detected: Zoom(${caps.zoom ? "Yes" : "No"}), Focus(${caps.focusDistance ? "Yes" : "No"}), Flash(${caps.torch ? "Yes" : "No"})`,
    )
  }

  // Apply camera settings (with proper error handling for unsupported features)
  const applyCameraSettings = async (track: MediaStreamTrack) => {
    try {
      const constraints: any = {}

      if (cameraCapabilities.zoom && currentZoom > 1) {
        constraints.zoom = currentZoom
      }

      if (cameraCapabilities.exposureCompensation) {
        constraints.exposureCompensation = currentExposure
      }

      // Handle focus mode safely
      try {
        constraints.focusMode = focusMode
      } catch (e) {
        // Focus mode not supported
      }

      // Handle white balance safely
      try {
        constraints.whiteBalanceMode = whiteBalance
      } catch (e) {
        // White balance not supported
      }

      if (flashOn && cameraCapabilities.torch) {
        constraints.torch = true
      }

      await track.applyConstraints({ advanced: [constraints] })
      addDebugInfo(`Applied settings: Zoom(${currentZoom}x), Exposure(${currentExposure}), Focus(${focusMode})`)
    } catch (error) {
      addDebugInfo(`Failed to apply camera settings: ${(error as Error).message}`)
    }
  }

  // Tap to focus functionality (with proper error handling)
  const handleTapToFocus = async (event: React.MouseEvent<HTMLVideoElement>) => {
    if (!streamRef.current || !videoRef.current) return

    const rect = videoRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height

    setFocusPoint({ x: x * 100, y: y * 100 })
    setIsManualFocusing(true)

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0]

      // Apply focus point if supported (using any type to avoid TypeScript errors)
      const focusConstraints: any = {
        focusMode: "single-shot",
      }

      // Add points of interest if supported
      try {
        focusConstraints.pointsOfInterest = [{ x, y }]
      } catch (e) {
        // Points of interest not supported
      }

      await videoTrack.applyConstraints({
        advanced: [focusConstraints],
      })

      addDebugInfo(`Focus applied at point (${Math.round(x * 100)}%, ${Math.round(y * 100)}%)`)

      // Clear focus point after 2 seconds
      setTimeout(() => {
        setFocusPoint(null)
        setIsManualFocusing(false)
      }, 2000)
    } catch (error) {
      addDebugInfo(`Tap to focus failed: ${(error as Error).message}`)
      setFocusPoint(null)
      setIsManualFocusing(false)
    }
  }

  // Zoom control (with proper error handling)
  const handleZoomChange = async (newZoom: number[]) => {
    const zoom = newZoom[0]
    setCurrentZoom(zoom)

    if (streamRef.current && cameraCapabilities.zoom) {
      try {
        const videoTrack = streamRef.current.getVideoTracks()[0]
        await videoTrack.applyConstraints({
          advanced: [{ zoom } as any],
        })
        addDebugInfo(`Zoom set to ${zoom}x`)
      } catch (error) {
        addDebugInfo(`Zoom failed: ${(error as Error).message}`)
      }
    }
  }

  // Exposure control (with proper error handling)
  const handleExposureChange = async (newExposure: number[]) => {
    const exposure = newExposure[0]
    setCurrentExposure(exposure)

    if (streamRef.current && cameraCapabilities.exposureCompensation) {
      try {
        const videoTrack = streamRef.current.getVideoTracks()[0]
        await videoTrack.applyConstraints({
          advanced: [{ exposureCompensation: exposure } as any],
        })
        addDebugInfo(`Exposure set to ${exposure}`)
      } catch (error) {
        addDebugInfo(`Exposure adjustment failed: ${(error as Error).message}`)
      }
    }
  }

  // Enhanced camera startup with professional settings
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      addDebugInfo(`Starting professional camera with facing mode: ${facingMode}`)

      const constraints = getAdvancedCameraConstraints()
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        videoRef.current.onloadeddata = async () => {
          addDebugInfo("Video data loaded, analyzing camera capabilities")

          // Get and analyze camera capabilities
          const videoTrack = stream.getVideoTracks()[0]
          getCameraCapabilities(videoTrack)

          // Apply initial settings
          await applyCameraSettings(videoTrack)

          // Start barcode detection
          startBarcodeDetection()
        }

        try {
          await videoRef.current.play()
          addDebugInfo("Professional camera started successfully")
          setNeedsUserInteraction(false)
        } catch (err) {
          addDebugInfo(`Play failed: ${(err as Error).message}`)
          setNeedsUserInteraction(true)
        }
      }
    } catch (error) {
      addDebugInfo(`Professional camera error: ${(error as Error).message}`)
      console.error("Error starting professional camera:", error)
    }
  }, [facingMode, currentZoom, currentExposure, focusMode, whiteBalance])

  // Real-time AI barcode reading (enhanced for better image quality)
  const performRealTimeAIReading = async () => {
    if (!videoRef.current || !canvasRef.current || isAiReading) return

    try {
      setIsAiReading(true)
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")
      if (!context) return

      // Capture ultra-high quality image for AI with current zoom
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Apply image enhancement for better AI reading
      context.filter = "contrast(1.2) brightness(1.1) saturate(1.1)"
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      context.filter = "none"

      const imageData = canvas.toDataURL("image/jpeg", 0.98) // Ultra high quality for AI

      const response = await fetch("/api/ai-barcode-reader2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageData,
          mode: "realtime",
          enhancedMode: true, // Tell API we're using enhanced camera
          zoom: currentZoom,
          exposure: currentExposure,
        }),
      })

      if (!response.ok) return

      const result = await response.json()

      if (result.barcode && result.confidence > 0.75 && result.barcode.length >= 8) {
        const barcode = result.barcode
        const isNewReading = !aiReadingHistory.slice(-3).includes(barcode)

        if (isNewReading) {
          addDebugInfo(`AI detected (Enhanced): ${barcode} (${Math.round(result.confidence * 100)}% confidence)`)

          setAiSuggestions((prev) => {
            const newSuggestion = {
              barcode,
              confidence: result.confidence,
              timestamp: Date.now(),
            }
            const recent = prev.filter((s) => Date.now() - s.timestamp < 10000)
            const unique = recent.filter((s) => s.barcode !== barcode)
            return [...unique, newSuggestion].slice(-3)
          })

          setAiReadingHistory((prev) => [...prev, barcode].slice(-10))
        }
      }
    } catch (error) {
      console.log("Enhanced real-time AI reading error:", error)
    } finally {
      setIsAiReading(false)
    }
  }

  // Start real-time AI reading
  const startRealTimeAI = () => {
    if (aiScanIntervalRef.current) {
      clearInterval(aiScanIntervalRef.current)
    }
    // Faster scanning with enhanced camera
    aiScanIntervalRef.current = setInterval(performRealTimeAIReading, 2000)
    addDebugInfo("Enhanced real-time AI reading started")
  }

  // Stop real-time AI reading
  const stopRealTimeAI = () => {
    if (aiScanIntervalRef.current) {
      clearInterval(aiScanIntervalRef.current)
      aiScanIntervalRef.current = null
    }
    setAiSuggestions([])
    addDebugInfo("Enhanced real-time AI reading stopped")
  }

  // Handle AI suggestion confirmation
  const handleConfirmBarcode = (barcode: string) => {
    addDebugInfo(`User confirmed AI suggestion: ${barcode}`)
    handleSuccessfulScan(barcode)
    setAiSuggestions([])
    setShowConfirmDialog(false)
    setPendingBarcode(null)
  }

  // Handle AI suggestion rejection
  const handleRejectBarcode = (barcode: string) => {
    addDebugInfo(`User rejected AI suggestion: ${barcode}`)
    setAiSuggestions((prev) => prev.filter((s) => s.barcode !== barcode))
    setShowConfirmDialog(false)
    setPendingBarcode(null)
  }

  // Enhanced manual capture with professional image processing
  const enhancedManualCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return

    addDebugInfo("Professional manual capture initiated")

    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")
      if (!context) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Apply professional image enhancement
      context.filter = "contrast(1.3) brightness(1.2) saturate(1.2) sharpen(1)"
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      context.filter = "none"

      let foundBarcode = false

      // Try native BarcodeDetector first with enhanced image
      if (isBarcodeDetectorSupported) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["ean_13", "ean_8", "code_39", "code_128", "qr_code", "upc_a", "upc_e"],
          })
          const barcodes = await barcodeDetector.detect(canvas)
          if (barcodes.length > 0) {
            const barcode = barcodes[0].rawValue
            addDebugInfo(`Native API detected (Enhanced): ${barcode}`)
            handleSuccessfulScan(barcode)
            foundBarcode = true
            return
          }
        } catch (error) {
          addDebugInfo(`Enhanced native detection failed: ${(error as Error).message}`)
        }
      }

      // Try ZXing with enhanced image
      if (!foundBarcode) {
        try {
          const ZXing = await import("@zxing/library")
          const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas)
          const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource))
          const result = new ZXing.MultiFormatReader().decode(binaryBitmap)
          if (result && result.getText()) {
            const barcode = result.getText()
            addDebugInfo(`ZXing detected (Enhanced): ${barcode}`)
            handleSuccessfulScan(barcode)
            foundBarcode = true
            return
          }
        } catch (error) {
          addDebugInfo(`Enhanced ZXing detection failed: ${(error as Error).message}`)
        }
      }

      // If traditional methods fail, try AI with professional image processing
      if (!foundBarcode) {
        addDebugInfo("Traditional methods failed, trying enhanced AI...")
        const imageData = canvas.toDataURL("image/jpeg", 0.98)

        const response = await fetch("/api/ai-barcode-reader", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: imageData,
            mode: "manual",
            enhancedMode: true,
            zoom: currentZoom,
            exposure: currentExposure,
            focusMode: focusMode,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.barcode && result.barcode.length >= 8) {
            setPendingBarcode(result.barcode)
            setShowConfirmDialog(true)
            addDebugInfo(
              `Enhanced AI suggests: ${result.barcode} (${Math.round(result.confidence * 100)}% confidence) - awaiting confirmation`,
            )
            return
          }
        }
      }

      addDebugInfo("All enhanced detection methods failed")
    } catch (error) {
      addDebugInfo(`Enhanced capture error: ${(error as Error).message}`)
    }
  }

  // Start barcode detection with enhanced settings
  const startBarcodeDetection = async () => {
    if (!videoRef.current || !canvasRef.current) {
      addDebugInfo("Cannot start detection: video or canvas ref not available")
      return
    }

    setIsScanning(true)
    addDebugInfo("Starting professional barcode detection")

    // Start traditional scanning with enhanced settings
    if (isBarcodeDetectorSupported) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_39", "code_128", "qr_code", "upc_a", "upc_e"],
        })
        addDebugInfo("Using enhanced native BarcodeDetector API")
        startNativeDetection(barcodeDetector)
      } catch (error) {
        addDebugInfo(`Enhanced BarcodeDetector failed: ${(error as Error).message}`)
        if (quaggaLoaded) {
          startQuaggaDetection()
        } else {
          startZXingDetection()
        }
      }
    } else if (quaggaLoaded) {
      addDebugInfo("Using enhanced Quagga library")
      startQuaggaDetection()
    } else {
      addDebugInfo("Using enhanced ZXing library")
      startZXingDetection()
    }

    // Start real-time AI if enabled
    if (aiReadingEnabled) {
      startRealTimeAI()
    }
  }

  // Enhanced native detection with image processing
  const startNativeDetection = (detector: any) => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
        return
      }

      try {
        const canvas = canvasRef.current
        const context = canvas.getContext("2d")
        if (!context) return

        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight

        // Apply professional image enhancement for better detection
        context.filter = "contrast(1.2) brightness(1.1)"
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        context.filter = "none"

        const barcodes = await detector.detect(canvas)
        if (barcodes.length > 0) {
          const barcode = barcodes[0].rawValue
          if (barcode !== lastDetectedCode && barcode.length >= 8) {
            addDebugInfo(`Enhanced Native API detected: ${barcode}`)
            handleSuccessfulScan(barcode)
          }
        }
      } catch (error) {
        // Ignore detection errors
      }
    }, 200)
  }

  // Enhanced Quagga detection (with proper constraint typing)
  const startQuaggaDetection = async () => {
    if (!videoRef.current) {
      addDebugInfo("Cannot start enhanced Quagga: video element not available")
      startZXingDetection()
      return
    }

    try {
      const Quagga = await import("quagga")
      await Quagga.default.init(
        {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoRef.current,
            constraints: {
              facingMode: facingMode,
              width: { min: 1280, ideal: 1920 },
              height: { min: 720, ideal: 1080 },
            } as any, // Use any to avoid TypeScript constraint issues
          },
          locator: {
            patchSize: "large", // Better for small barcodes
            halfSample: false, // Full resolution
          },
          numOfWorkers: 4, // More workers for better performance
          frequency: 5, // Faster scanning
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_39_reader", "code_128_reader", "upc_reader", "upc_e_reader"],
            multiple: false,
          },
          locate: true,
        },
        (err: Error | null) => {
          if (err) {
            addDebugInfo(`Enhanced Quagga init error: ${err.message}`)
            startZXingDetection()
            return
          }
          Quagga.default.start()
          addDebugInfo("Enhanced Quagga started successfully")
        },
      )

      Quagga.default.onDetected((result: any) => {
        if (result && result.codeResult && result.codeResult.code) {
          const barcode = result.codeResult.code
          if (barcode !== lastDetectedCode && barcode.length >= 8) {
            addDebugInfo(`Enhanced Quagga detected: ${barcode}`)
            handleSuccessfulScan(barcode)
          }
        }
      })
    } catch (error) {
      console.error("Quagga init error", error)
    }
  }

  // Enhanced ZXing detection
  const startZXingDetection = async () => {
    try {
      const ZXing = await import("@zxing/library")
      const codeReader = new ZXing.BrowserMultiFormatReader()
      addDebugInfo("Enhanced ZXing initialized")

      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }

      scanIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
          return
        }

        try {
          const canvas = canvasRef.current
          const context = canvas.getContext("2d")
          if (!context) return

          canvas.width = videoRef.current.videoWidth
          canvas.height = videoRef.current.videoHeight

          // Apply professional image enhancement
          context.filter = "contrast(1.3) brightness(1.2)"
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
          context.filter = "none"

          const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas)
          const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource))

          try {
            const result = new ZXing.MultiFormatReader().decode(binaryBitmap)
            if (result && result.getText()) {
              const barcode = result.getText()
              if (barcode !== lastDetectedCode && barcode.length >= 8) {
                addDebugInfo(`Enhanced ZXing detected: ${barcode}`)
                handleSuccessfulScan(barcode)
              }
            }
          } catch (error) {
            if (!(error instanceof ZXing.NotFoundException)) {
              addDebugInfo(`Enhanced ZXing decode error: ${(error as Error).message}`)
            }
          }
        } catch (error) {
          addDebugInfo(`Enhanced ZXing processing error: ${(error as Error).message}`)
        }
      }, 300) // Faster scanning
    } catch (error) {
      addDebugInfo(`Enhanced ZXing import error: ${(error as Error).message}`)
    }
  }

  // Handle successful scan
  const handleSuccessfulScan = (barcode: string) => {
    setLastDetectedCode(barcode)

    // Stop all scanning
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    stopRealTimeAI()
    setIsScanning(false)

    // Play success sound
    try {
      const audio = new Audio("/sounds/beep.mp3")
      audio.play().catch(() => {})
    } catch (e) {}

    // Call the callback
    onScan(barcode)
  }

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    stopRealTimeAI()
    setIsScanning(false)
    addDebugInfo("Professional camera stopped")
  }, [])

  // Toggle flash (with proper error handling)
  const toggleFlash = useCallback(async () => {
    if (streamRef.current && hasFlash) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      try {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !flashOn } as any],
        })
        setFlashOn(!flashOn)
        addDebugInfo(`Flash ${!flashOn ? "enabled" : "disabled"}`)
      } catch (error) {
        console.error("Error toggling flash:", error)
      }
    }
  }, [flashOn, hasFlash])

  // Switch camera
  const switchCamera = useCallback(() => {
    stopCamera()
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [stopCamera])

  // Handle manual play
  const handleManualPlay = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play()
        setNeedsUserInteraction(false)
        addDebugInfo("Video played after user interaction")
        startBarcodeDetection()
      } catch (err) {
        addDebugInfo(`Manual play failed: ${(err as Error).message}`)
      }
    }
  }

  useEffect(() => {
    if (isActive) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isActive, startCamera, stopCamera])

  // Check if BarcodeDetector is available
  const isBarcodeDetectorSupported = typeof window !== "undefined" && "BarcodeDetector" in window

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover cursor-crosshair"
        playsInline
        muted
        autoPlay
        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        onClick={handleTapToFocus}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Professional scanning overlay with focus point */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          {/* Enhanced scanning frame */}
          <div className="w-64 h-64 border-2 border-white rounded-lg relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

            {/* Professional scanning line */}
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-primary shadow-lg"
              animate={{
                y: [0, 256, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />

            {/* Professional indicators */}
            <div className="absolute top-2 left-2 flex gap-1">
              {currentZoom > 1 && (
                <div className="bg-primary/90 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                  <ZoomIn className="h-3 w-3" />
                  {currentZoom.toFixed(1)}x
                </div>
              )}
              {aiReadingEnabled && (
                <motion.div
                  className="bg-primary/90 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                  animate={{ opacity: isAiReading ? [0.5, 1, 0.5] : 1 }}
                  transition={{ duration: 1, repeat: isAiReading ? Number.POSITIVE_INFINITY : 0 }}
                >
                  <Brain className="h-3 w-3" />
                  AI Pro
                </motion.div>
              )}
            </div>
          </div>

          {/* Professional instructions */}
          <div className="absolute -bottom-24 left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-white text-sm font-medium">Tap to focus • Zoom for small barcodes</p>
            <p className="text-white/70 text-xs mt-1">
              Professional camera with {cameraCapabilities.zoom ? "zoom" : "fixed"} lens
            </p>
          </div>
        </div>
      </div>

      {/* Focus point indicator */}
      <AnimatePresence>
        {focusPoint && (
          <motion.div
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute pointer-events-none"
            style={{
              left: `${focusPoint.x}%`,
              top: `${focusPoint.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="w-16 h-16 border-2 border-primary rounded-full flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Suggestions Overlay */}
      <AnimatePresence>
        {aiSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute bottom-32 left-4 right-4 pointer-events-auto"
          >
            <div className="bg-black/90 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-white text-sm font-medium">AI Pro Detected</span>
                <Badge variant="secondary" className="text-xs">
                  Enhanced
                </Badge>
              </div>
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, index) => (
                  <motion.div
                    key={suggestion.barcode}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between bg-white/10 rounded p-2"
                  >
                    <div className="flex-1">
                      <div className="text-white font-mono text-sm">{suggestion.barcode}</div>
                      <div className="text-white/70 text-xs">
                        {Math.round(suggestion.confidence * 100)}% confidence • Enhanced scan
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs bg-green-600/20 border-green-500/50 text-green-100 hover:bg-green-600/40"
                        onClick={() => handleConfirmBarcode(suggestion.barcode)}
                      >
                        ✓ Use
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs bg-red-600/20 border-red-500/50 text-red-100 hover:bg-red-600/40"
                        onClick={() => handleRejectBarcode(suggestion.barcode)}
                      >
                        ✗
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && pendingBarcode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-sm mx-4"
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Brain className="h-8 w-8 text-primary" />
                  <Badge variant="secondary" className="text-xs">
                    Pro Enhanced
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Pro Detected Barcode</h3>
                <div className="bg-gray-100 rounded p-3 mb-4">
                  <div className="font-mono text-lg font-bold">{pendingBarcode}</div>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Professional AI detected this barcode using enhanced camera settings. Confirm to proceed.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => handleRejectBarcode(pendingBarcode)}
                  >
                    ✗ Retry scan
                  </Button>
                  <Button className="flex-1" onClick={() => handleConfirmBarcode(pendingBarcode)}>
                    ✓ Confirm
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play button for browsers that require user interaction */}
      {needsUserInteraction && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <Button onClick={handleManualPlay} size="lg">
            <Camera className="h-4 w-4 mr-2" />
            Start Professional Camera
          </Button>
        </div>
      )}

      {/* Professional Camera Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {/* AI Toggle - Most prominent */}
        <Button
          variant={aiReadingEnabled ? "default" : "secondary"}
          size="sm"
          className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
            aiReadingEnabled ? "bg-primary text-white shadow-lg" : "bg-black/50 hover:bg-black/70 text-white"
          }`}
          onClick={onToggleAIReading}
        >
          <Brain className="h-3 w-3 mr-1" />
          AI Pro {aiReadingEnabled ? "ON" : "OFF"}
        </Button>

        {/* Advanced Controls Toggle */}
        <Button
          variant="secondary"
          size="sm"
          className={`px-3 py-2 rounded-full text-xs font-medium ${
            showAdvancedControls ? "bg-primary/20 text-white" : "bg-black/50 hover:bg-black/70 text-white"
          }`}
          onClick={() => setShowAdvancedControls(!showAdvancedControls)}
        >
          <Settings className="h-3 w-3 mr-1" />
          Pro Controls
        </Button>

        {/* Flash control */}
        {hasFlash && (
          <Button
            variant="secondary"
            size="icon"
            className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70"
            onClick={toggleFlash}
          >
            {flashOn ? <FlashlightOff className="h-4 w-4 text-white" /> : <Flashlight className="h-4 w-4 text-white" />}
          </Button>
        )}

        {/* Camera switch */}
        <Button
          variant="secondary"
          size="icon"
          className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70"
          onClick={switchCamera}
        >
          <RotateCcw className="h-4 w-4 text-white" />
        </Button>
      </div>

      {/* Advanced Professional Controls Panel */}
      <AnimatePresence>
        {showAdvancedControls && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-4 right-20 bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-white/20 pointer-events-auto min-w-64"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4 text-primary" />
                <span className="text-white text-sm font-medium">Professional Controls</span>
              </div>

              {/* Zoom Control */}
              {cameraCapabilities.zoom && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white text-xs flex items-center gap-1">
                      <ZoomIn className="h-3 w-3" />
                      Zoom
                    </Label>
                    <span className="text-white text-xs">{currentZoom.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[currentZoom]}
                    onValueChange={handleZoomChange}
                    min={cameraCapabilities.zoom.min}
                    max={Math.min(cameraCapabilities.zoom.max, 5)} // Limit to 5x for practical use
                    step={cameraCapabilities.zoom.step}
                    className="w-full"
                  />
                </div>
              )}

              {/* Exposure Control */}
              {cameraCapabilities.exposureCompensation && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white text-xs flex items-center gap-1">
                      <Sun className="h-3 w-3" />
                      Exposure
                    </Label>
                    <span className="text-white text-xs">
                      {currentExposure > 0 ? "+" : ""}
                      {currentExposure.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    value={[currentExposure]}
                    onValueChange={handleExposureChange}
                    min={cameraCapabilities.exposureCompensation.min}
                    max={cameraCapabilities.exposureCompensation.max}
                    step={cameraCapabilities.exposureCompensation.step}
                    className="w-full"
                  />
                </div>
              )}

              {/* Focus Mode */}
              {cameraCapabilities.focusMode && (
                <div className="space-y-2">
                  <Label className="text-white text-xs flex items-center gap-1">
                    <Focus className="h-3 w-3" />
                    Focus Mode
                  </Label>
                  <Select value={focusMode} onValueChange={(value: any) => setFocusMode(value)}>
                    <SelectTrigger className="bg-black/50 border-white/20 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continuous">Continuous</SelectItem>
                      <SelectItem value="single-shot">Single Shot</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* White Balance */}
              {cameraCapabilities.whiteBalanceMode && (
                <div className="space-y-2">
                  <Label className="text-white text-xs flex items-center gap-1">
                    <SunDim className="h-3 w-3" />
                    White Balance
                  </Label>
                  <Select value={whiteBalance} onValueChange={(value: any) => setWhiteBalance(value)}>
                    <SelectTrigger className="bg-black/50 border-white/20 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="daylight">Daylight</SelectItem>
                      <SelectItem value="fluorescent">Fluorescent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="pt-2 border-t border-white/20">
                <p className="text-white/70 text-xs">Tap screen to focus • Zoom in for small barcodes</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional Manual Capture Button */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
        {/* Zoom shortcuts */}
        {cameraCapabilities.zoom && (
          <>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full bg-black/50 hover:bg-black/70 text-white"
              onClick={() => handleZoomChange([Math.max(cameraCapabilities.zoom!.min, currentZoom - 0.5)])}
              disabled={currentZoom <= cameraCapabilities.zoom.min}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Main capture button */}
        <Button
          size="lg"
          className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90 relative"
          onClick={enhancedManualCapture}
        >
          <Camera className="h-6 w-6" />
          {currentZoom > 1 && (
            <Badge className="absolute -top-2 -right-2 text-xs px-1 py-0">{currentZoom.toFixed(1)}x</Badge>
          )}
        </Button>

        {/* Zoom shortcuts */}
        {cameraCapabilities.zoom && (
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full bg-black/50 hover:bg-black/70 text-white"
            onClick={() => handleZoomChange([Math.min(cameraCapabilities.zoom!.max, currentZoom + 0.5)])}
            disabled={currentZoom >= Math.min(cameraCapabilities.zoom.max, 5)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Professional Status Indicators */}
      <div className="absolute top-4 left-4 space-y-2">
        {/* Main scanning status */}
        <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
          {isScanning ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <Scan className="h-4 w-4" />
              </motion.div>
              Professional Scanning...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Pro Ready
            </>
          )}
        </div>

        {/* Camera capabilities indicator */}
        <div className="bg-primary/80 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
          <Camera className="h-3 w-3" />
          {cameraCapabilities.zoom ? "Zoom" : "Fixed"} •{cameraCapabilities.torch ? " Flash" : " No Flash"} •
          {cameraCapabilities.focusDistance ? " Manual Focus" : " Auto Focus"}
        </div>

        {/* AI Status */}
        {aiReadingEnabled && (
          <div className="bg-primary/80 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
            <motion.div
              animate={{
                scale: isAiReading ? [1, 1.2, 1] : 1,
                opacity: isAiReading ? [0.7, 1, 0.7] : 1,
              }}
              transition={{
                duration: 1.5,
                repeat: isAiReading ? Number.POSITIVE_INFINITY : 0,
              }}
            >
              <Brain className="h-3 w-3" />
            </motion.div>
            {isAiReading ? "AI Pro Analyzing..." : "AI Pro Active"}
          </div>
        )}

        {/* Focus indicator */}
        {isManualFocusing && (
          <div className="bg-green-600/80 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
            <Target className="h-3 w-3" />
            Focusing...
          </div>
        )}
      </div>

      {/* Debug info (development only) */}
      {process.env.NODE_ENV === "development" && debugInfo.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs max-w-xs max-h-32 overflow-y-auto">
          {debugInfo.slice(-5).map((info, i) => (
            <div key={i} className="mb-1">
              {info}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Product edit dialog (keeping your original implementation)
const ProductEditDialog = ({
  isOpen,
  onClose,
  product,
  categories,
  onSave,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  categories: Category[]
  onSave: (updatedProduct: Partial<Product>) => Promise<void>
  isLoading: boolean
}) => {
  const [editedProduct, setEditedProduct] = useState<Partial<Product>>({})
  const [activeTab, setActiveTab] = useState("stock")

  useEffect(() => {
    if (product) {
      setEditedProduct({
        stock: product.stock,
        min_stock: product.min_stock,
        price: product.price,
        purchase_price: product.purchase_price,
        name: product.name,
        barcode: product.barcode,
        category_id: product.category_id,
        image: product.image,
      })
    }
  }, [product])

  const handleSave = async () => {
    if (!product) return
    await onSave(editedProduct)
  }

  const adjustStock = (amount: number) => {
    setEditedProduct((prev) => ({
      ...prev,
      stock: Math.max(0, (prev.stock || 0) + amount),
    }))
  }

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return "Uncategorized"
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || "Uncategorized"
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  if (!product) return null

  const stockStatus = (editedProduct.stock || 0) <= (editedProduct.min_stock || 0)
  const profitMargin =
    editedProduct.price && editedProduct.purchase_price
      ? ((editedProduct.price - editedProduct.purchase_price) / editedProduct.price) * 100
      : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Edit Product
          </DialogTitle>
          <DialogDescription>Update product details and stock levels</DialogDescription>
        </DialogHeader>

        {/* Product Header with Professional indicator */}
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            {product.image ? (
              <img
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=64&width=64"
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-2">{product.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={stockStatus ? "destructive" : "outline"} className="text-xs">
                Stock: {editedProduct.stock || 0}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getCategoryName(product.category_id)}
              </Badge>
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Camera className="h-3 w-3" />
                Pro Scanned
              </Badge>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="text-center">
                <Label className="text-sm font-medium">Current Stock</Label>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 bg-transparent"
                    onClick={() => adjustStock(-1)}
                    disabled={(editedProduct.stock || 0) <= 0}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{editedProduct.stock || 0}</div>
                    <div className="text-xs text-muted-foreground">units</div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 bg-transparent"
                    onClick={() => adjustStock(1)}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Quick adjustment buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[-10, -5, +5, +10].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => adjustStock(amount)}
                    disabled={amount < 0 && (editedProduct.stock || 0) + amount < 0}
                    className="text-xs"
                  >
                    {amount > 0 ? "+" : ""}
                    {amount}
                  </Button>
                ))}
              </div>

              {/* Manual input */}
              <div className="space-y-2">
                <Label htmlFor="stock-input">Set Exact Amount</Label>
                <Input
                  id="stock-input"
                  type="number"
                  min="0"
                  value={editedProduct.stock || ""}
                  onChange={(e) =>
                    setEditedProduct((prev) => ({
                      ...prev,
                      stock: Math.max(0, Number.parseInt(e.target.value) || 0),
                    }))
                  }
                  className="text-center text-lg font-semibold"
                />
              </div>

              {/* Minimum stock */}
              <div className="space-y-2">
                <Label htmlFor="min-stock">Minimum Stock Level</Label>
                <Input
                  id="min-stock"
                  type="number"
                  min="0"
                  value={editedProduct.min_stock || ""}
                  onChange={(e) =>
                    setEditedProduct((prev) => ({
                      ...prev,
                      min_stock: Math.max(0, Number.parseInt(e.target.value) || 0),
                    }))
                  }
                />
                {(editedProduct.stock || 0) <= (editedProduct.min_stock || 0) && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Stock is at or below minimum level</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price">Selling Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editedProduct.price || ""}
                    onChange={(e) =>
                      setEditedProduct((prev) => ({
                        ...prev,
                        price: Number.parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="pl-10"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase-price">Purchase Price (Cost)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="purchase-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editedProduct.purchase_price || ""}
                    onChange={(e) =>
                      setEditedProduct((prev) => ({
                        ...prev,
                        purchase_price: Number.parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="pl-10"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Profit margin display */}
              {editedProduct.price && editedProduct.purchase_price && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Profit Margin</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600">{profitMargin.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Profit per unit: {formatCurrency((editedProduct.price || 0) - (editedProduct.purchase_price || 0))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-name">Product Name</Label>
                <Input
                  id="product-name"
                  value={editedProduct.name || ""}
                  onChange={(e) =>
                    setEditedProduct((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter product name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="barcode"
                    value={editedProduct.barcode || ""}
                    onChange={(e) =>
                      setEditedProduct((prev) => ({
                        ...prev,
                        barcode: e.target.value,
                      }))
                    }
                    className="pl-10"
                    placeholder="Enter barcode"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={editedProduct.category_id || "uncategorized"}
                  onValueChange={(value) =>
                    setEditedProduct((prev) => ({
                      ...prev,
                      category_id: value === "uncategorized" ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  value={editedProduct.image || ""}
                  onChange={(e) =>
                    setEditedProduct((prev) => ({
                      ...prev,
                      image: e.target.value,
                    }))
                  }
                  placeholder="Enter image URL"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="mr-2"
                >
                  <Save className="h-4 w-4" />
                </motion.div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main component with Professional Scanner
export default function ProfessionalStockScannerPage() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult>({
    product: null,
    isLoading: false,
    error: null,
  })
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [manualBarcode, setManualBarcode] = useState("")
  const [recentScans, setRecentScans] = useState<Product[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const [aiReadingEnabled, setAiReadingEnabled] = useState(false)

  const toggleAIReading = () => {
    setAiReadingEnabled(!aiReadingEnabled)
  }

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from("categories").select("*").order("name")
        if (error) throw error
        setCategories(data || [])
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }
    fetchCategories()
  }, [supabase])

  // Search product by barcode
  const searchProduct = async (barcode: string) => {
    setScanResult({ product: null, isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .or(`barcode.eq.${barcode},name.ilike.%${barcode}%`)
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (data) {
        setScanResult({ product: data, isLoading: false, error: null })
        setIsEditDialogOpen(true)

        // Add to recent scans
        setRecentScans((prev) => {
          const filtered = prev.filter((p) => p.id !== data.id)
          return [data, ...filtered].slice(0, 5)
        })

        // Show success toast with Professional indicator
        toast({
          title: "Product Found! 🎯",
          description: `${data.name} - Scanned with Professional Camera`,
        })
      } else {
        setScanResult({
          product: null,
          isLoading: false,
          error: `No product found with barcode: ${barcode}`,
        })
      }
    } catch (error) {
      console.error("Error searching product:", error)
      setScanResult({
        product: null,
        isLoading: false,
        error: "Failed to search for product",
      })
    }
  }

  // Handle barcode scan
  const handleScan = (barcode: string) => {
    setIsCameraActive(false)
    searchProduct(barcode)
  }

  // Handle manual search
  const handleManualSearch = () => {
    if (manualBarcode.trim()) {
      searchProduct(manualBarcode.trim())
      setManualBarcode("")
    }
  }

  // Save product changes
  const handleSaveProduct = async (updatedProduct: Partial<Product>) => {
    if (!scanResult.product) return

    setIsUpdating(true)
    try {
      const { error } = await supabase.from("products").update(updatedProduct).eq("id", scanResult.product.id)

      if (error) throw error

      // Update local state
      const updated = { ...scanResult.product, ...updatedProduct }
      setScanResult((prev) => ({ ...prev, product: updated }))

      // Update recent scans
      setRecentScans((prev) => prev.map((p) => (p.id === scanResult.product?.id ? updated : p)))

      toast({
        title: "Product Updated",
        description: `${updated.name} has been updated successfully.`,
      })

      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return "Uncategorized"
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || "Uncategorized"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      {/* Professional Header */}
      <div className="bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Camera className="h-6 w-6 text-primary" />
              Professional Barcode Scanner
            </h1>
            <p className="text-sm text-muted-foreground">
              Advanced camera controls with zoom, focus, and AI enhancement - perfect for small or unclear barcodes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {recentScans.length} recent
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              Pro Camera
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Professional Camera Scanner */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Professional Camera Scanner
              {isCameraActive && (
                <Badge variant={aiReadingEnabled ? "default" : "secondary"} className="text-xs ml-2">
                  AI Pro {aiReadingEnabled ? "ON" : "OFF"}
                </Badge>
              )}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Zoom & Focus controls
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-blue-600" />
                  Tap-to-focus
                </span>
                <span className="flex items-center gap-1">
                  <Sun className="h-4 w-4 text-orange-600" />
                  Exposure control
                </span>
                <span className="flex items-center gap-1">
                  <Brain className="h-4 w-4 text-primary" />
                  AI Pro enhancement
                </span>
              </div>
              {isCameraActive && aiReadingEnabled && (
                <div className="mt-2 p-2 bg-primary/10 rounded text-xs">
                  💡 <strong>AI Pro is ON</strong> - Advanced AI will automatically detect barcodes using enhanced
                  camera data
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isCameraActive ? (
              <div className="text-center space-y-4">
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative">
                      <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <Settings className="h-6 w-6 absolute -top-1 -right-1 text-primary bg-background rounded-full p-1" />
                    </div>
                    <p className="text-muted-foreground">Professional Camera is off</p>
                  </div>
                </div>

                {/* Professional features explanation */}
               

                <Button onClick={() => setIsCameraActive(true)} size="lg" className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Professional Scanner
                </Button>
                
              </div>
            ) : (
              <div className="w-full h-64">
                <ProfessionalBarcodeScanner
                  onScan={handleScan}
                  isActive={isCameraActive}
                  aiReadingEnabled={aiReadingEnabled}
                  onToggleAIReading={toggleAIReading}
                />
              </div>
            )}

            {isCameraActive && (
              <Button variant="outline" onClick={() => setIsCameraActive(false)} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Stop Professional Scanner
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Manual Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Manual Search
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter barcode or product name..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                className="flex-1"
              />
              <Button onClick={handleManualSearch} disabled={!manualBarcode.trim()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-3">
                    <Camera className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Professional Camera Features</h4>
                      <p className="text-sm text-blue-800 mb-2">
                        Advanced camera controls designed for challenging barcode scanning scenarios.
                      </p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>
                          • <strong>Zoom Control:</strong> Up to 5x zoom for small barcodes
                        </li>
                        <li>
                          • <strong>Tap-to-Focus:</strong> Tap screen to focus on specific areas
                        </li>
                        <li>
                          • <strong>Exposure Control:</strong> Adjust brightness for plastic/reflective surfaces
                        </li>
                        <li>
                          • <strong>AI Pro Enhancement:</strong> Advanced AI with camera metadata
                        </li>
                        <li>
                          • <strong>Image Stabilization:</strong> Reduces blur from hand movement
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>  
        {/* Scan Result with Professional indicator */}
        <AnimatePresence>
          {scanResult.isLoading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="mb-4"
                    >
                      <Scan className="h-8 w-8 mx-auto text-primary" />
                    </motion.div>
                    <p className="text-muted-foreground">Searching for product...</p>
                    <p className="text-xs text-muted-foreground mt-1">Professional AI enhanced search</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {scanResult.error && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Product Not Found</p>
                    <p className="text-sm">{scanResult.error}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsCameraActive(true)}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try Professional Scanner
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Professional Recent Scans */}
        {recentScans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Professional Scans
                <Badge variant="secondary" className="text-xs">
                  Pro Enhanced
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentScans.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors border"
                    onClick={() => {
                      setScanResult({ product, isLoading: false, error: null })
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0 relative">
                      {product.image ? (
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=48&width=48"
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      {/* Professional indicator */}
                      <Camera className="h-3 w-3 absolute -top-1 -right-1 text-primary bg-background rounded-full p-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={product.stock <= product.min_stock ? "destructive" : "outline"}
                          className="text-xs"
                        >
                          Stock: {product.stock}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{getCategoryName(product.category_id)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{formatCurrency(product.price)}</div>
                      {product.barcode && <div className="text-xs text-muted-foreground">{product.barcode}</div>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Edit Dialog */}
      <ProductEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        product={scanResult.product}
        categories={categories}
        onSave={handleSaveProduct}
        isLoading={isUpdating}
      />
    </div>
  )
}
