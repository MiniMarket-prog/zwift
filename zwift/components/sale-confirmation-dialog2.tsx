"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatPrice } from "@/lib/utils2"

interface SaleConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
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
    discount?: number // Explicitly optional
  }>
  onConfirm: (shouldPrint?: boolean) => Promise<void> | void
  isLoading?: boolean
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
  cartItems,
  onConfirm,
  isLoading,
  subtotal,
  tax,
  total,
  paymentMethod,
  currency,
  language,
  isProcessing,
  onCancel,
}: SaleConfirmationDialogProps) {
  const totalPrice = cartItems.reduce((acc, item) => {
    return acc + item.price * item.quantity * (1 - (item.discount ?? 0) / 100)
  }, 0)

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Sale</AlertDialogTitle>
          <AlertDialogDescription>Are you sure you want to confirm this sale?</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <h3 className="col-span-4 font-semibold text-sm">Order Summary</h3>
            <ul>
              {cartItems.map((item) => (
                <li key={item.id} className="grid grid-cols-1 gap-2 border-b py-2">
                  <div className="flex items-center space-x-2">
                    {item.product.image && (
                      <img
                        src={item.product.image || "/placeholder.svg"}
                        alt={item.product.name}
                        width={50}
                        height={50}
                        className="rounded-md"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium">{item.product.name}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-muted-foreground">
                      {formatPrice(item.price)} × {item.quantity}
                      {(item.discount ?? 0) > 0 && ` (-${item.discount ?? 0}%)`}
                    </span>
                    <span className="font-medium">
                      {formatPrice(item.price * item.quantity * (1 - (item.discount ?? 0) / 100))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="col-span-4 flex justify-between font-bold">
              <span>Total:</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm()} disabled={isProcessing}>
            {isLoading ? "Confirming..." : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

