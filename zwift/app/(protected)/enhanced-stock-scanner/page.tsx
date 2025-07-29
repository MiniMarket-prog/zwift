"use client"

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

// Types (same as your original)
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

// Enhanced barcode scanner with AI fallback
const EnhancedBarcodeScanner = ({
  onScan,
  isActive,
}: {
  onScan: (barcode: string) => void
  isActive: boolean
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [hasFlash, setHasFlash] = useState(false)
  const [flashOn, setFlashOn] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [isScanning, setIsScanning] = useState(false)
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null)
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false)
  const [quaggaLoaded, setQuaggaLoaded] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [isUsingAI, setIsUsingAI] = useState(false)
  const [aiAttempts, setAiAttempts] = useState(0)
  const maxAiAttempts = 3

  // Check if BarcodeDetector is available
  const isBarcodeDetectorSupported = typeof window !== "undefined" && "BarcodeDetector" in window

  // Add debug info with timestamp
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo((prev) => {
      const newInfo = [...prev, `[${timestamp}] ${message}`]
      return newInfo.slice(-10) // Keep last 10 messages
    })
    console.log(`[Scanner Debug] ${message}`)
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

  // AI Barcode Reading Function
  const readBarcodeWithAI = async (imageData: string): Promise<string | null> => {
    try {
      addDebugInfo(`AI attempt ${aiAttempts + 1}/${maxAiAttempts} - analyzing image...`)
      setIsUsingAI(true)

      const response = await fetch("/api/ai-barcode-reader", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData }),
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`)
      }

      const result = await response.json()

      if (result.barcode && result.barcode.length >= 8) {
        addDebugInfo(`AI successfully detected barcode: ${result.barcode}`)
        return result.barcode
      } else {
        addDebugInfo(`AI could not detect valid barcode. Confidence: ${result.confidence}`)
        return null
      }
    } catch (error) {
      addDebugInfo(`AI barcode reading failed: ${(error as Error).message}`)
      return null
    } finally {
      setIsUsingAI(false)
    }
  }

  // Capture image for AI analysis
  const captureImageForAI = async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current) return null

    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      if (!context) return null

      // Set canvas size to match video with higher resolution for AI
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Get image data as base64
      return canvas.toDataURL("image/jpeg", 0.9)
    } catch (error) {
      addDebugInfo(`Image capture failed: ${(error as Error).message}`)
      return null
    }
  }

  // Enhanced manual capture with AI fallback
  const enhancedManualCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return

    addDebugInfo("Enhanced manual capture initiated")

    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      if (!context) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Try native BarcodeDetector first
      if (isBarcodeDetectorSupported) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["ean_13", "ean_8", "code_39", "code_128", "qr_code", "upc_a", "upc_e"],
          })
          const barcodes = await barcodeDetector.detect(canvas)
          if (barcodes.length > 0) {
            const barcode = barcodes[0].rawValue
            addDebugInfo(`Native API detected: ${barcode}`)
            handleSuccessfulScan(barcode)
            return
          }
        } catch (error) {
          addDebugInfo(`Native detection failed: ${(error as Error).message}`)
        }
      }

      // Try ZXing fallback
      try {
        const ZXing = await import("@zxing/library")
        const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas)
        const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource))
        const result = new ZXing.MultiFormatReader().decode(binaryBitmap)
        if (result && result.getText()) {
          const barcode = result.getText()
          addDebugInfo(`ZXing detected: ${barcode}`)
          handleSuccessfulScan(barcode)
          return
        }
      } catch (error) {
        addDebugInfo(`ZXing detection failed: ${(error as Error).message}`)
      }

      // If traditional methods fail, try AI (with attempt limit)
      if (aiAttempts < maxAiAttempts) {
        addDebugInfo("Traditional methods failed, trying AI barcode reading...")
        setAiAttempts((prev) => prev + 1)

        const imageData = canvas.toDataURL("image/jpeg", 0.9)
        const aiBarcode = await readBarcodeWithAI(imageData)

        if (aiBarcode) {
          addDebugInfo(`AI successfully read barcode: ${aiBarcode}`)
          handleSuccessfulScan(aiBarcode)
          // Reset AI attempts on success
          setAiAttempts(0)
          return
        }
      }

      // All methods failed
      addDebugInfo("All barcode detection methods failed")
      if (aiAttempts >= maxAiAttempts) {
        addDebugInfo("Maximum AI attempts reached")
        // Reset attempts after a delay
        setTimeout(() => setAiAttempts(0), 10000)
      }
    } catch (error) {
      addDebugInfo(`Enhanced capture error: ${(error as Error).message}`)
    }
  }

  // Start camera (same as original)
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      addDebugInfo(`Starting camera with facing mode: ${facingMode}`)
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadeddata = () => {
          addDebugInfo("Video data loaded, starting barcode detection")
          startBarcodeDetection()
        }
        try {
          await videoRef.current.play()
          addDebugInfo("Video playing successfully")
          setNeedsUserInteraction(false)
        } catch (err) {
          addDebugInfo(`Play failed: ${(err as Error).message}`)
          setNeedsUserInteraction(true)
        }
      }
      // Check if flash is available
      const videoTrack = stream.getVideoTracks()[0]
      const capabilities = videoTrack.getCapabilities()
      setHasFlash(!!(capabilities as any).torch)
    } catch (error) {
      addDebugInfo(`Camera error: ${(error as Error).message}`)
      console.error("Error starting camera:", error)
    }
  }, [facingMode])

  // Start barcode detection (same as original but enhanced)
  const startBarcodeDetection = async () => {
    if (!videoRef.current || !canvasRef.current) {
      addDebugInfo("Cannot start detection: video or canvas ref not available")
      return
    }

    setIsScanning(true)
    addDebugInfo("Starting barcode detection")

    // Try native BarcodeDetector first
    if (isBarcodeDetectorSupported) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_39", "code_128", "qr_code", "upc_a", "upc_e"],
        })
        addDebugInfo("Using native BarcodeDetector API")
        startNativeDetection(barcodeDetector)
        return
      } catch (error) {
        addDebugInfo(`BarcodeDetector failed: ${(error as Error).message}`)
      }
    }

    // Fallback to Quagga if available
    if (quaggaLoaded) {
      addDebugInfo("Using Quagga library")
      startQuaggaDetection()
      return
    }

    // Final fallback to ZXing
    addDebugInfo("Using ZXing library")
    startZXingDetection()
  }

  // Native BarcodeDetector scanning (same as original)
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
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        const barcodes = await detector.detect(canvas)
        if (barcodes.length > 0) {
          const barcode = barcodes[0].rawValue
          if (barcode !== lastDetectedCode && barcode.length >= 8) {
            addDebugInfo(`Native API detected: ${barcode}`)
            handleSuccessfulScan(barcode)
          }
        }
      } catch (error) {
        // Ignore detection errors, they're normal when no barcode is present
      }
    }, 300)
  }

  // Quagga scanning (same as original)
  const startQuaggaDetection = async () => {
    if (!videoRef.current) {
      addDebugInfo("Cannot start Quagga: video element not available")
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
              width: { min: 640 },
              height: { min: 480 },
            },
          },
          locator: {
            patchSize: "medium",
            halfSample: true,
          },
          numOfWorkers: 2,
          frequency: 10,
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_39_reader", "code_128_reader", "upc_reader", "upc_e_reader"],
            multiple: false,
          },
          locate: true,
        },
        (err: Error | null) => {
          if (err) {
            addDebugInfo(`Quagga init error: ${err.message}`)
            startZXingDetection()
            return
          }
          Quagga.default.start()
          addDebugInfo("Quagga started successfully")
        },
      )
      Quagga.default.onDetected((result: any) => {
        if (result && result.codeResult && result.codeResult.code) {
          const barcode = result.codeResult.code
          if (barcode !== lastDetectedCode && barcode.length >= 8) {
            addDebugInfo(`Quagga detected: ${barcode}`)
            handleSuccessfulScan(barcode)
          }
        }
      })
    } catch (error) {
      addDebugInfo(`Quagga error: ${(error as Error).message}`)
      startZXingDetection()
    }
  }

  // ZXing scanning (same as original)
  const startZXingDetection = async () => {
    try {
      const ZXing = await import("@zxing/library")
      const codeReader = new ZXing.BrowserMultiFormatReader()
      addDebugInfo("ZXing initialized")
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
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
          const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas)
          const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource))
          try {
            const result = new ZXing.MultiFormatReader().decode(binaryBitmap)
            if (result && result.getText()) {
              const barcode = result.getText()
              if (barcode !== lastDetectedCode && barcode.length >= 8) {
                addDebugInfo(`ZXing detected: ${barcode}`)
                handleSuccessfulScan(barcode)
              }
            }
          } catch (error) {
            if (!(error instanceof ZXing.NotFoundException)) {
              addDebugInfo(`ZXing decode error: ${(error as Error).message}`)
            }
          }
        } catch (error) {
          addDebugInfo(`ZXing processing error: ${(error as Error).message}`)
        }
      }, 500)
    } catch (error) {
      addDebugInfo(`ZXing import error: ${(error as Error).message}`)
    }
  }

  // Handle successful scan (same as original)
  const handleSuccessfulScan = (barcode: string) => {
    setLastDetectedCode(barcode)
    // Stop scanning
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setIsScanning(false)
    // Play success sound
    try {
      const audio = new Audio("/sounds/beep.mp3")
      audio.play().catch(() => {})
    } catch (e) {}
    // Call the callback
    onScan(barcode)
  }

  // Other functions (same as original)
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setIsScanning(false)
    addDebugInfo("Camera stopped")
  }, [])

  const toggleFlash = useCallback(async () => {
    if (streamRef.current && hasFlash) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      try {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !flashOn } as any],
        })
        setFlashOn(!flashOn)
      } catch (error) {
        console.error("Error toggling flash:", error)
      }
    }
  }, [flashOn, hasFlash])

  const switchCamera = useCallback(() => {
    stopCamera()
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [stopCamera])

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

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Enhanced scanning overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          {/* Scanning frame */}
          <div className="w-64 h-64 border-2 border-white rounded-lg relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

            {/* Scanning line animation */}
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-primary shadow-lg"
              animate={{
                y: [0, 256, 0],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />

            {/* AI indicator when using AI */}
            {isUsingAI && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="bg-primary/90 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  >
                    <Brain className="h-3 w-3" />
                  </motion.div>
                  AI Reading...
                </div>
              </motion.div>
            )}
          </div>

          {/* Enhanced instructions */}
          <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-white text-sm font-medium">Position barcode within frame</p>
            <p className="text-white/70 text-xs mt-1">
              {isScanning
                ? isUsingAI
                  ? "AI is reading the barcode..."
                  : "Scanning automatically..."
                : "Tap capture for AI-assisted reading"}
            </p>
          </div>
        </div>
      </div>

      {/* Play button for browsers that require user interaction */}
      {needsUserInteraction && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <Button onClick={handleManualPlay} size="lg">
            <Camera className="h-4 w-4 mr-2" />
            Tap to Start Camera
          </Button>
        </div>
      )}

      {/* Camera controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
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
        <Button
          variant="secondary"
          size="icon"
          className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70"
          onClick={switchCamera}
        >
          <RotateCcw className="h-4 w-4 text-white" />
        </Button>
      </div>

      {/* Enhanced manual capture button */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <Button
          size="lg"
          className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90 relative"
          onClick={enhancedManualCapture}
          disabled={isUsingAI}
        >
          {isUsingAI ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <Brain className="h-6 w-6" />
            </motion.div>
          ) : (
            <Camera className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Enhanced scanning status */}
      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
        {isUsingAI ? (
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <Brain className="h-4 w-4" />
            </motion.div>
            AI Reading...
          </div>
        ) : isScanning ? (
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <Scan className="h-4 w-4" />
            </motion.div>
            Scanning...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            AI Enhanced
          </div>
        )}
      </div>

      {/* AI attempts indicator */}
      {aiAttempts > 0 && (
        <div className="absolute bottom-4 left-4 bg-primary/80 text-white px-2 py-1 rounded text-xs">
          AI: {aiAttempts}/{maxAiAttempts} attempts
        </div>
      )}

      {/* Debug info (only show in development) */}
      {process.env.NODE_ENV === "development" && debugInfo.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs max-w-xs">
          {debugInfo.slice(-3).map((info, i) => (
            <div key={i}>{info}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// Product edit dialog (same as your original)
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

        {/* Product Header with AI detection indicator */}
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
              {/* AI Enhanced indicator */}
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Brain className="h-3 w-3" />
                AI Enhanced
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
            {/* Quick Stock Adjustment */}
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

// Main component (same structure as your original with enhanced scanner)
export default function EnhancedStockScannerPage() {
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

        // Show success toast with AI indicator
        toast({
          title: "Product Found! 🎯",
          description: `${data.name} - Enhanced with AI barcode reading`,
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
      {/* Enhanced Header */}
      <div className="bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Enhanced Stock Scanner
            </h1>
            <p className="text-sm text-muted-foreground">
              Smart barcode scanning with AI fallback - works even with unclear barcodes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {recentScans.length} recent
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              AI Powered
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* AI Enhanced Camera Scanner */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Enhanced Barcode Scanner
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Traditional scanning
                </span>
                <span className="flex items-center gap-1">
                  <Brain className="h-4 w-4 text-primary" />
                  AI fallback for unclear codes
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isCameraActive ? (
              <div className="text-center space-y-4">
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative">
                      <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <Brain className="h-6 w-6 absolute -top-1 -right-1 text-primary bg-background rounded-full p-1" />
                    </div>
                    <p className="text-muted-foreground">AI Enhanced Camera is off</p>
                  </div>
                </div>
                <Button onClick={() => setIsCameraActive(true)} size="lg" className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Start AI Enhanced Scanner
                </Button>
              </div>
            ) : (
              <div className="w-full h-64">
                <EnhancedBarcodeScanner onScan={handleScan} isActive={isCameraActive} />
              </div>
            )}
            {isCameraActive && (
              <Button variant="outline" onClick={() => setIsCameraActive(false)} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Stop Scanner
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Manual Search (same as original) */}
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

        {/* Scan Result with AI indicator */}
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
                    <p className="text-xs text-muted-foreground mt-1">AI enhanced search in progress</p>
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
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Recent Scans */}
        {recentScans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Scans
                <Badge variant="secondary" className="text-xs">
                  AI Enhanced
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
                      {/* AI indicator */}
                      <Brain className="h-3 w-3 absolute -top-1 -right-1 text-primary bg-background rounded-full p-0.5" />
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

      {/* Product Edit Dialog (same as original) */}
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
