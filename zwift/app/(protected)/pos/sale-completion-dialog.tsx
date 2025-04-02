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
import { ShoppingCart, Printer, FileText } from "lucide-react"
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

type SaleCompletionDialogProps = {
  isOpen: boolean
  onClose: () => void
  saleData: {
    id: string
    items: CartItem[]
    total: number
    tax: number
    subtotal: number
    payment_method: string
    date: string
  } | null
  onPrint: () => void
  onViewDetails: () => void
  currency: string
  language: string
}

export function SaleCompletionDialog({
  isOpen,
  onClose,
  saleData,
  onPrint,
  onViewDetails,
  currency,
  language,
}: SaleCompletionDialogProps) {
  if (!saleData) return null

  const isPending = saleData.id === "pending"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-green-600">✓</span> Sale Completed
            {isPending && <span className="text-xs text-muted-foreground animate-pulse">(Processing...)</span>}
          </DialogTitle>
          <DialogDescription>
            {isPending ? "Your sale is being processed. You can view the details below." : `Receipt #${saleData.id}`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Products Grid */}
          <div className="grid grid-cols-3 gap-2">
            {saleData.items.slice(0, 6).map((item) => (
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

          {saleData.items.length > 6 && (
            <p className="text-xs text-center text-muted-foreground">+{saleData.items.length - 6} more items</p>
          )}

          {/* Sale Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(saleData.subtotal, currency, language)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tax:</span>
              <span>{formatCurrency(saleData.tax, currency, language)}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg mt-2">
              <span>Total:</span>
              <span>{formatCurrency(saleData.total, currency, language)}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="capitalize">{saleData.payment_method}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" onClick={onViewDetails} disabled={isPending}>
            <FileText className="mr-2 h-4 w-4" />
            View Details
          </Button>
          <Button onClick={onPrint} disabled={isPending}>
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

