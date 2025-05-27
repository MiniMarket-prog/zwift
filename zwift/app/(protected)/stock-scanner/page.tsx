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

// Camera scanner component
const BarcodeScanner = ({
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
  const [isScanning, setIsScanning] = useState(false)

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // Check if flash is available
      const videoTrack = stream.getVideoTracks()[0]
      const capabilities = videoTrack.getCapabilities()
      setHasFlash(!!(capabilities as any).torch)
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
      } catch (error) {
        console.error("Error toggling flash:", error)
      }
    }
  }, [flashOn, hasFlash])

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [])

  // Simulate barcode detection (in a real app, you'd use a barcode detection library)
  const simulateScan = useCallback(() => {
    if (isScanning) return

    setIsScanning(true)
    // Simulate scanning delay
    setTimeout(() => {
      // Generate a random barcode for demo
      const demoBarcodes = ["1234567890123", "9876543210987", "5555555555555", "1111111111111", "7777777777777"]
      const randomBarcode = demoBarcodes[Math.floor(Math.random() * demoBarcodes.length)]
      onScan(randomBarcode)
      setIsScanning(false)
    }, 1000)
  }, [onScan, isScanning])

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

      {/* Scanning overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
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
          </div>

          {/* Instructions */}
          <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-white text-sm font-medium">Position barcode within frame</p>
            <p className="text-white/70 text-xs mt-1">Tap to scan manually</p>
          </div>
        </div>
      </div>

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

      {/* Manual scan button */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <Button
          size="lg"
          className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90"
          onClick={simulateScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <Scan className="h-6 w-6" />
            </motion.div>
          ) : (
            <Camera className="h-6 w-6" />
          )}
        </Button>
      </div>
    </div>
  )
}

// Product edit dialog
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

        {/* Product Header */}
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
                    className="h-12 w-12"
                    onClick={() => adjustStock(-1)}
                    disabled={(editedProduct.stock || 0) <= 0}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{editedProduct.stock || 0}</div>
                    <div className="text-xs text-muted-foreground">units</div>
                  </div>
                  <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => adjustStock(1)}>
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
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
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

export default function StockScannerPage() {
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
      {/* Header */}
      <div className="bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Stock Scanner</h1>
            <p className="text-sm text-muted-foreground">Scan products to manage inventory</p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {recentScans.length} recent
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Camera Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Barcode Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isCameraActive ? (
              <div className="text-center space-y-4">
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Camera is off</p>
                  </div>
                </div>
                <Button onClick={() => setIsCameraActive(true)} size="lg" className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
              </div>
            ) : (
              <div className="w-full h-64">
                <BarcodeScanner onScan={handleScan} isActive={isCameraActive} />
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

        {/* Scan Result */}
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
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {scanResult.error && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Card className="border-destructive">
                <CardContent className="flex items-center gap-3 py-4">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">Product Not Found</p>
                    <p className="text-sm text-muted-foreground">{scanResult.error}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentScans.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => {
                      setScanResult({ product, isLoading: false, error: null })
                      setIsEditDialogOpen(true)
                    }}
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
