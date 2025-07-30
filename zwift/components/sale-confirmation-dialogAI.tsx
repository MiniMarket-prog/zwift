
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
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useState } from "react"

interface SaleConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (shouldPrint?: boolean) => void
  cartItems: any[]
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  currency: string
  language: string
  isProcessing: boolean
  onCancel: () => void
}

export const SaleConfirmationDialog = ({
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
}: SaleConfirmationDialogProps) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(paymentMethod)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language, {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Sale</AlertDialogTitle>
          <AlertDialogDescription>Are you sure you want to process this sale?</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="payment-method" className="text-right">
              Payment Method
            </Label>
            <RadioGroup defaultValue={paymentMethod} className="col-span-3" onValueChange={setSelectedPaymentMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="r1" />
                <Label htmlFor="r1">Cash</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit" id="r2" />
                <Label htmlFor="r2">Credit Card</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debit" id="r3" />
                <Label htmlFor="r3">Debit Card</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mobile" id="r4" />
                <Label htmlFor="r4">Mobile Payment</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isProcessing} onClick={() => onConfirm()}>
            {isProcessing ? "Processing..." : "Confirm Sale"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
