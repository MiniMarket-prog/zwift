"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Printer, X, CheckCircle2, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"

type CartItem = {
  id: string
  product: {
    id: string
    name: string
    price: number
    image?: string | null
  }
  quantity: number
  price: number
}

type SaleConfirmationDialogProps = {
  isOpen: boolean
  onClose: () => void
  cartItems: CartItem[]
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  currency: string
  language: string
  isProcessing: boolean
  onConfirm: (shouldPrint: boolean) => Promise<void>
  onCancel: () => void
}

export function SaleConfirmationDialog({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  tax,
  total,
  paymentMethod,
  currency,
  language,
  isProcessing,
  onConfirm,
  onCancel,
}: SaleConfirmationDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isProcessing) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Confirm Sale
            {isProcessing && <span className="text-xs text-muted-foreground animate-pulse">(Processing...)</span>}
          </DialogTitle>
          <DialogDescription>Review your sale before completing</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Products Grid */}
          <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
            {cartItems.map((item) => (
              <div key={item.id} className="border rounded-md p-2 text-center">
                <div className="h-16 w-16 mx-auto bg-muted rounded-md overflow-hidden mb-1">
                  {item.product.image ? (
                    <img
                      src={item.product.image || "/placeholder.svg"}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">x{item.quantity}</p>
              </div>
            ))}
          </div>

          {/* Sale Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(subtotal, currency, language)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tax:</span>
              <span>{formatCurrency(tax, currency, language)}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg mt-2">
              <span>Total:</span>
              <span>{formatCurrency(total, currency, language)}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="capitalize">{paymentMethod}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            className="bg-green-500 hover:bg-green-600 text-white border-0 transition-colors"
            onClick={() => onConfirm(false)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                OK
              </>
            )}
          </Button>
          <Button onClick={() => onConfirm(true)} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

