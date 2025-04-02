"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CreditCard, Banknote, Loader2, Printer, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"

interface SaleConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (shouldPrint?: boolean) => Promise<void> | void
  cartItems: Array<{
    id: string
    product: {
      id: string
      name: string
      price: number
      image?: string | null
    }
    quantity: number
    price: number
  }>
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  currency: string
  language: string
  isProcessing: boolean
  onCancel: () => void
}

export function SaleConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  cartItems,
  subtotal,
  tax,
  total,
  paymentMethod,
  currency,
  language,
  isProcessing,
  onCancel,
}: SaleConfirmationDialogProps) {
  const [selectedPayment, setSelectedPayment] = useState<string>(paymentMethod || "cash")
  const [showReceipt, setShowReceipt] = useState(false)

  const handleConfirm = async (shouldPrint = false) => {
    if (!selectedPayment) return

    try {
      await onConfirm(shouldPrint)
      setShowReceipt(true)
    } catch (error) {
      console.error("Error confirming sale:", error)
    }
  }

  const handleClose = () => {
    setSelectedPayment(paymentMethod || "cash")
    setShowReceipt(false)
    onClose()
  }

  // Format currency helper function
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat(language, {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Sale</DialogTitle>
          <DialogDescription>Review the items and select a payment method to complete the sale.</DialogDescription>
        </DialogHeader>

        {!showReceipt ? (
          <>
            <div className="py-4">
              <h3 className="font-medium mb-2">Items:</h3>
              <ScrollArea className="h-[300px] rounded-md border p-2">
                {cartItems?.length > 0 ? (
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 border-b pb-3 last:border-0">
                        <div className="h-12 w-12 relative bg-muted rounded overflow-hidden flex-shrink-0">
                          {item.product.image ? (
                            <img
                              src={item.product.image || "/placeholder.svg"}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error("Image failed to load:", item.product.image)
                                e.currentTarget.src = "/placeholder.svg"
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-1">{item.product.name}</h4>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-sm text-muted-foreground">
                              {formatPrice(item.price)} × {item.quantity}
                            </span>
                            <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-2 text-center text-muted-foreground">No items in cart</div>
                )}
              </ScrollArea>

              <div className="mt-4 space-y-2 border-t pt-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span className="font-medium">{formatPrice(tax)}</span>
                </div>

                {/* Centered total amount */}
                <div className="text-center mt-6 mb-2">
                  <div className="text-lg font-semibold text-muted-foreground">Total:</div>
                  <div className="text-3xl font-bold mt-1">{formatPrice(total)}</div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-medium mb-2">Payment Method:</h3>
                <div className="flex gap-2">
                  <Button
                    variant={selectedPayment === "cash" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setSelectedPayment("cash")}
                  >
                    <Banknote className="mr-2 h-4 w-4" />
                    Cash
                  </Button>
                  <Button
                    variant={selectedPayment === "card" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setSelectedPayment("card")}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Card
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={onCancel} className="sm:order-1">
                Cancel
              </Button>
              <Button
                onClick={() => handleConfirm(false)}
                disabled={!selectedPayment || isProcessing}
                className={cn(
                  "sm:order-2 bg-emerald-600 hover:bg-emerald-700",
                  "text-white border-emerald-600 hover:border-emerald-700",
                  "focus-visible:ring-emerald-500",
                  isProcessing && "opacity-70 cursor-not-allowed",
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Complete Sale"
                )}
              </Button>
              <Button
                onClick={() => handleConfirm(true)}
                disabled={!selectedPayment || isProcessing}
                variant="outline"
                className="sm:order-3"
              >
                <Printer className="mr-2 h-4 w-4" />
                Complete & Print
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-4">
            <ScrollArea className="max-h-[400px] mb-4">
              <div className="p-4 border rounded-md">
                <h2 className="text-center font-bold text-lg mb-2">Sale Complete</h2>
                <p className="text-center text-muted-foreground mb-4">Your sale has been processed successfully.</p>
                <div className="text-center mb-4">
                  <div className="text-lg font-semibold text-muted-foreground">Total Amount</div>
                  <div className="text-3xl font-bold mt-1">{formatPrice(total)}</div>
                </div>
                <div className="flex justify-center">
                  <Button
                    onClick={() => handleConfirm(true)}
                    className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print Receipt
                  </Button>
                </div>
              </div>
            </ScrollArea>

            <Button variant="outline" onClick={handleClose} className="w-full mt-2">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

