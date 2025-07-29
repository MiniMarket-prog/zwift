"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Camera,
  Package,
  Save,
  X,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Eye,
  Brain,
  CheckCircle,
  Clock,
  RefreshCw,
  Upload,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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

type AIAnalysisResult = {
  productName: string
  confidence: number
  description: string
  suggestedCategory: string
  extractedText: string[]
  estimatedPrice?: number
  brandName?: string
  productType?: string
  keyFeatures: string[]
}

type ScanResult = {
  aiAnalysis: AIAnalysisResult | null
  matchedProducts: Product[]
  isLoading: boolean
  error: string | null
  capturedImage: string | null
}

// AI-powered camera component
const AIProductCamera = ({
  onCapture,
  isActive,
}: {
  onCapture: (imageData: string) => void
  isActive: boolean
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [isReady, setIsReady] = useState(false)
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false)

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

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
          setIsReady(true)
        }

        try {
          await videoRef.current.play()
          setNeedsUserInteraction(false)
        } catch (err) {
          setNeedsUserInteraction(true)
        }
      }
    } catch (error) {
      console.error("Error starting camera:", error)
    }
  }, [facingMode])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsReady(false)
  }, [])

  // Capture image
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isReady) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data as base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8)
    onCapture(imageData)
  }, [onCapture, isReady])

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
      } catch (err) {
        console.error("Manual play failed:", err)
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

      {/* AI scanning overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          {/* AI scanning frame */}
          <div className="w-80 h-80 border-2 border-white rounded-lg relative">
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg" />

            {/* AI scanning animation */}
            <motion.div
              className="absolute inset-4 border border-primary/50 rounded-lg"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />

            {/* Center AI icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center"
              >
                <Brain className="h-8 w-8 text-primary" />
              </motion.div>
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute -bottom-24 left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-white text-sm font-medium">Position product within frame</p>
            <p className="text-white/70 text-xs mt-1">AI will analyze the entire product, not just barcodes</p>
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
        <Button
          variant="secondary"
          size="icon"
          className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70"
          onClick={switchCamera}
        >
          <RotateCcw className="h-4 w-4 text-white" />
        </Button>
      </div>

      {/* Capture button */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <Button
          size="lg"
          className="rounded-full w-20 h-20 bg-primary hover:bg-primary/90"
          onClick={captureImage}
          disabled={!isReady}
        >
          <Sparkles className="h-8 w-8" />
        </Button>
      </div>

      {/* Status indicator */}
      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isReady ? "bg-green-500" : "bg-yellow-500"}`} />
        {isReady ? "AI Ready" : "Loading..."}
      </div>
    </div>
  )
}

// AI Analysis Results Component
const AIAnalysisResults = ({
  analysis,
  matchedProducts,
  onSelectProduct,
  onCreateNew,
}: {
  analysis: AIAnalysisResult
  matchedProducts: Product[]
  onSelectProduct: (product: Product) => void
  onCreateNew: () => void
}) => {
  return (
    <div className="space-y-4">
      {/* AI Analysis Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            AI Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Identified Product</Label>
              <p className="text-lg font-semibold">{analysis.productName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {Math.round(analysis.confidence * 100)}% confidence
                </Badge>
                {analysis.brandName && (
                  <Badge variant="secondary" className="text-xs">
                    {analysis.brandName}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Category</Label>
              <p className="text-base">{analysis.suggestedCategory}</p>
              {analysis.estimatedPrice && (
                <p className="text-sm text-muted-foreground mt-1">
                  Estimated price: ${analysis.estimatedPrice.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Description</Label>
            <p className="text-sm text-muted-foreground">{analysis.description}</p>
          </div>

          {analysis.keyFeatures.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Key Features</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {analysis.keyFeatures.map((feature, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {analysis.extractedText.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Extracted Text</Label>
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-20 overflow-y-auto">
                {analysis.extractedText.join(" • ")}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matched Products */}
      {matchedProducts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Found Matching Products ({matchedProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {matchedProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors border"
                  onClick={() => onSelectProduct(product)}
                >
                  <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
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
                      <span className="text-xs text-muted-foreground">${product.price.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Select
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">No matching products found</p>
              <p className="text-sm text-amber-700">Would you like to create a new product based on the AI analysis?</p>
            </div>
            <Button onClick={onCreateNew} size="sm" className="bg-amber-600 hover:bg-amber-700">
              Create New
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Product Creation Dialog
const CreateProductDialog = ({
  isOpen,
  onClose,
  aiAnalysis,
  categories,
  onSave,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  aiAnalysis: AIAnalysisResult | null
  categories: Category[]
  onSave: (product: Partial<Product>) => Promise<void>
  isLoading: boolean
}) => {
  const [newProduct, setNewProduct] = useState<Partial<Product>>({})

  useEffect(() => {
    if (aiAnalysis) {
      setNewProduct({
        name: aiAnalysis.productName,
        price: aiAnalysis.estimatedPrice || 0,
        stock: 0,
        min_stock: 5,
        category_id: "", // Updated default value to be a non-empty string
        barcode: "",
        purchase_price: aiAnalysis.estimatedPrice ? aiAnalysis.estimatedPrice * 0.7 : 0,
      })
    }
  }, [aiAnalysis])

  const handleSave = async () => {
    if (!newProduct.name) return
    await onSave(newProduct)
  }

  if (!aiAnalysis) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create New Product
          </DialogTitle>
          <DialogDescription>Create a new product based on AI analysis</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              value={newProduct.name || ""}
              onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter product name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Selling Price</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={newProduct.price || ""}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, price: Number.parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-price">Purchase Price</Label>
              <Input
                id="purchase-price"
                type="number"
                min="0"
                step="0.01"
                value={newProduct.purchase_price || ""}
                onChange={(e) =>
                  setNewProduct((prev) => ({ ...prev, purchase_price: Number.parseFloat(e.target.value) || 0 }))
                }
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Initial Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={newProduct.stock || ""}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, stock: Number.parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-stock">Minimum Stock</Label>
              <Input
                id="min-stock"
                type="number"
                min="0"
                value={newProduct.min_stock || ""}
                onChange={(e) =>
                  setNewProduct((prev) => ({ ...prev, min_stock: Number.parseInt(e.target.value) || 0 }))
                }
                placeholder="5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={newProduct.category_id || ""}
              onValueChange={(value) => setNewProduct((prev) => ({ ...prev, category_id: value || null }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode (Optional)</Label>
            <Input
              id="barcode"
              value={newProduct.barcode || ""}
              onChange={(e) => setNewProduct((prev) => ({ ...prev, barcode: e.target.value }))}
              placeholder="Enter barcode if available"
            />
          </div>

          {/* AI Analysis Preview */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <Label className="text-sm font-medium">AI Analysis Summary</Label>
            <p className="text-xs text-muted-foreground mt-1">{aiAnalysis.description}</p>
            {aiAnalysis.keyFeatures.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {aiAnalysis.keyFeatures.slice(0, 3).map((feature, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !newProduct.name} className="w-full sm:w-auto">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Product
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AIProductScannerPage() {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult>({
    aiAnalysis: null,
    matchedProducts: [],
    isLoading: false,
    error: null,
    capturedImage: null,
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [recentScans, setRecentScans] = useState<AIAnalysisResult[]>([])
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

  // Analyze image with AI
  const analyzeImageWithAI = async (imageData: string) => {
    setScanResult((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // Send image to AI analysis endpoint
      const response = await fetch("/api/ai-product-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze image")
      }

      const aiAnalysis: AIAnalysisResult = await response.json()

      // Search for matching products in database
      const matchedProducts = await searchMatchingProducts(aiAnalysis)

      setScanResult({
        aiAnalysis,
        matchedProducts,
        isLoading: false,
        error: null,
        capturedImage: imageData,
      })

      // Add to recent scans
      setRecentScans((prev) => [aiAnalysis, ...prev.slice(0, 4)])
    } catch (error) {
      console.error("Error analyzing image:", error)
      setScanResult((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to analyze image. Please try again.",
      }))
    }
  }

  // Search for matching products
  const searchMatchingProducts = async (analysis: AIAnalysisResult): Promise<Product[]> => {
    try {
      const searchTerms = [analysis.productName, analysis.brandName, ...analysis.keyFeatures, ...analysis.extractedText]
        .filter(Boolean)
        .slice(0, 5) // Limit search terms

      const searchQueries = searchTerms.map((term) => `name.ilike.%${term}%`).join(",")

      const { data, error } = await supabase.from("products").select("*").or(searchQueries).limit(10)

      if (error) throw error

      // Sort by relevance (simple scoring based on name similarity)
      const scored = (data || []).map((product) => {
        let score = 0
        const productNameLower = product.name.toLowerCase()
        const analysisNameLower = analysis.productName.toLowerCase()

        // Exact match bonus
        if (productNameLower === analysisNameLower) score += 100
        // Partial match bonus
        if (productNameLower.includes(analysisNameLower) || analysisNameLower.includes(productNameLower)) score += 50
        // Brand match bonus
        if (analysis.brandName && productNameLower.includes(analysis.brandName.toLowerCase())) score += 30
        // Feature matches
        analysis.keyFeatures.forEach((feature) => {
          if (productNameLower.includes(feature.toLowerCase())) score += 10
        })

        return { product, score }
      })

      return scored
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.product)
        .slice(0, 5)
    } catch (error) {
      console.error("Error searching products:", error)
      return []
    }
  }

  // Handle image capture
  const handleImageCapture = (imageData: string) => {
    setIsCameraActive(false)
    analyzeImageWithAI(imageData)
  }

  // Handle product selection
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    // Here you could open an edit dialog similar to the barcode scanner
    toast({
      title: "Product Selected",
      description: `Selected ${product.name} for editing`,
    })
  }

  // Handle create new product
  const handleCreateNew = () => {
    setIsCreateDialogOpen(true)
  }

  // Save new product
  const handleSaveNewProduct = async (productData: Partial<Product>) => {
    setIsCreating(true)
    try {
      const { data, error } = await supabase.from("products").insert([productData]).select().single()

      if (error) throw error

      toast({
        title: "Product Created",
        description: `${productData.name} has been created successfully`,
      })

      setIsCreateDialogOpen(false)
      setSelectedProduct(data)
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageData = e.target?.result as string
      analyzeImageWithAI(imageData)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      {/* Header */}
      <div className="bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Product Scanner
            </h1>
            <p className="text-sm text-muted-foreground">Identify products using AI vision - no barcode needed</p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {recentScans.length} recent
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* AI Camera Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              AI Vision Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isCameraActive ? (
              <div className="text-center space-y-4">
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Brain className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">AI Camera is off</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setIsCameraActive(true)} size="lg" className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    Start AI Camera
                  </Button>
                  <div className="relative">
                    <Button variant="outline" size="lg" className="relative overflow-hidden bg-transparent">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-64">
                <AIProductCamera onCapture={handleImageCapture} isActive={isCameraActive} />
              </div>
            )}
            {isCameraActive && (
              <Button variant="outline" onClick={() => setIsCameraActive(false)} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Stop Camera
              </Button>
            )}
          </CardContent>
        </Card>

        {/* AI Analysis Results */}
        <AnimatePresence>
          {scanResult.isLoading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="mb-4"
                    >
                      <Brain className="h-8 w-8 mx-auto text-primary" />
                    </motion.div>
                    <p className="text-muted-foreground">AI is analyzing the product...</p>
                    <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
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
                  <span>{scanResult.error}</span>
                  <Button variant="outline" size="sm" onClick={() => setIsCameraActive(true)}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {scanResult.aiAnalysis && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <AIAnalysisResults
                analysis={scanResult.aiAnalysis}
                matchedProducts={scanResult.matchedProducts}
                onSelectProduct={handleSelectProduct}
                onCreateNew={handleCreateNew}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent AI Scans */}
        {recentScans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent AI Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentScans.map((scan, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-1">{scan.productName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {Math.round(scan.confidence * 100)}% confidence
                        </Badge>
                        <span className="text-xs text-muted-foreground">{scan.suggestedCategory}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {scan.estimatedPrice && (
                        <div className="font-semibold text-sm">${scan.estimatedPrice.toFixed(2)}</div>
                      )}
                      {scan.brandName && <div className="text-xs text-muted-foreground">{scan.brandName}</div>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Product Dialog */}
      <CreateProductDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        aiAnalysis={scanResult.aiAnalysis}
        categories={categories}
        onSave={handleSaveNewProduct}
        isLoading={isCreating}
      />
    </div>
  )
}
