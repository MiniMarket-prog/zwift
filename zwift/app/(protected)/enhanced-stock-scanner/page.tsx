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
import { createClient } from "@/lib/supabase-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"

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

// Enhanced barcode scanner with AI-powered barcode reading
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
  const [hasFlash, setHasFlash] = useState(false)
  const [flashOn, setFlashOn] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [isCapturing, setIsCapturing] = useState(false)

  // Add debug info with timestamp
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo((prev) => {
      const newInfo = [...prev, `[${timestamp}] ${message}`]
      return newInfo.slice(-10)
    })
    console.log(`[Scanner Debug] ${message}`)
  }

  // AI-powered barcode capture
  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return

    setIsCapturing(true)
    addDebugInfo("Starting AI barcode capture...")

    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      if (!context) {
        addDebugInfo("Canvas context not available")
        return
      }

      // Capture high-quality image for AI analysis
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = canvas.toDataURL("image/jpeg", 0.95)

      addDebugInfo("Sending image to AI for barcode analysis...")

      const response = await fetch("/api/ai-barcode-reader", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageData,
          mode: "manual", // Always use manual mode for better accuracy
        }),
      })

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`)
      }

      const result = await response.json()

      addDebugInfo(`AI response: ${result.barcode} (${Math.round(result.confidence * 100)}% confidence)`)

      if (result.barcode && result.barcode.length >= 8 && result.isValid) {
        addDebugInfo(`Successfully detected barcode: ${result.barcode}`)
        handleSuccessfulScan(result.barcode)
      } else {
        addDebugInfo(`AI could not detect a valid barcode. Confidence: ${Math.round(result.confidence * 100)}%`)
        // Show user feedback
        toast({
          title: "No Barcode Detected",
          description: "AI couldn't find a clear barcode. Try adjusting the angle or lighting.",
          variant: "destructive",
        })
      }
    } catch (error) {
      addDebugInfo(`AI capture error: ${(error as Error).message}`)
      toast({
        title: "Capture Failed",
        description: "Failed to analyze image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCapturing(false)
    }
  }

  // Handle successful scan
  const handleSuccessfulScan = (barcode: string) => {
    addDebugInfo(`Successful scan: ${barcode}`)

    // Play success sound
    try {
      const audio = new Audio("/sounds/beep.mp3")
      audio.play().catch(() => {})
    } catch (e) {}

    // Call the callback
    onScan(barcode)
  }

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      addDebugInfo(`Starting camera with facing mode: ${facingMode}`)

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadeddata = () => {
          addDebugInfo("Video data loaded, camera ready")
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

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    addDebugInfo("Camera stopped")
  }, [])

  // Toggle flash
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
    addDebugInfo(`Switching to ${facingMode === "user" ? "environment" : "user"} camera`)
  }, [stopCamera, facingMode])

  // Handle manual play
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

      {/* AI-powered scanning overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          {/* Scanning frame */}
          <div className="w-64 h-64 border-2 border-white rounded-lg relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

            {/* AI indicator */}
            <div className="absolute top-2 right-2 bg-primary/90 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <Brain className="h-3 w-3" />
              AI Ready
            </div>

            {/* Capture indicator when processing */}
            {isCapturing && (
              <motion.div
                className="absolute inset-4 border-2 border-primary rounded-lg bg-primary/20"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            )}
          </div>

          {/* Instructions */}
          <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-white text-sm font-medium">Position barcode within frame</p>
            <p className="text-white/70 text-xs mt-1">
              {isCapturing ? "AI is analyzing the barcode..." : "Tap capture button when ready"}
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

      {/* AI Capture button */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <Button
          size="lg"
          className="rounded-full w-20 h-20 bg-primary hover:bg-primary/90 shadow-lg"
          onClick={captureAndAnalyze}
          disabled={isCapturing}
        >
          {isCapturing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <Brain className="h-8 w-8" />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center">
              <Brain className="h-6 w-6 mb-1" />
              <span className="text-xs">Capture</span>
            </div>
          )}
        </Button>
      </div>

      {/* Status indicator */}
      <div className="absolute top-4 left-4 space-y-2">
        <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          {isCapturing ? "AI Analyzing..." : "AI Ready"}
        </div>
      </div>

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
  const supabase = createClient()

  // Remove the aiReadingEnabled state and toggleAIReading function
  // const [aiReadingEnabled, setAiReadingEnabled] = useState(false)
  // const toggleAIReading = () => { setAiReadingEnabled(!aiReadingEnabled) }

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
            {/* Update the header description */}
            <p className="text-sm text-muted-foreground">
              AI-powered barcode scanning - always uses AI for maximum accuracy
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
            {/* Update the card header description */}
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Brain className="h-4 w-4 text-primary" />
                  AI-powered barcode reading
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Manual capture for precision
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
                {/* Remove the Auto Detect explanation section and replace with: */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-3">
                    <Brain className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">AI-Powered Scanning</h4>
                      <p className="text-sm text-blue-800 mb-2">
                        This scanner always uses AI to read barcodes for maximum accuracy and reliability.
                      </p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Position barcode within the frame</li>
                        <li>• Tap the capture button when ready</li>
                        <li>• AI analyzes the image for barcode detection</li>
                        <li>• Works with unclear or damaged barcodes</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <Button onClick={() => setIsCameraActive(true)} size="lg" className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Start AI Enhanced Scanner
                </Button>
              </div>
            ) : (
              <div className="w-full h-64">
                {/* Update the scanner component call to remove the AI props: */}
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
