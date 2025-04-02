"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

interface ReceiptPrinterProps {
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  currency: string
  language: string
  storeName?: string
  saleId?: string
  onPrintComplete?: () => void
  autoPrint?: boolean
}

export function ReceiptPrinter({
  items,
  subtotal,
  tax,
  total,
  paymentMethod,
  currency,
  language,
  storeName = "MiniMarket",
  saleId = "",
  onPrintComplete,
  autoPrint = true,
}: ReceiptPrinterProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const [receiptNumber] = useState(() =>
    Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0"),
  )

  // Format currency based on language
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Format date based on language
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(language, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const printReceipt = async () => {
    if (!receiptRef.current) return

    setIsPrinting(true)
    setPrintError(null)

    try {
      const printWindow = window.open("", "_blank", "width=300,height=600")

      if (!printWindow) {
        throw new Error("Popup blocked. Please allow popups for this site.")
      }

      // Add print-specific styles
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${receiptNumber}</title>
            <style>
              @page {
                size: 80mm auto;  /* Width for standard thermal receipt */
                margin: 0;
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.2;
                width: 100%;
                max-width: 300px;
                margin: 0 auto;
                padding: 5mm;
              }
              .receipt {
                width: 100%;
              }
              .header, .footer {
                text-align: center;
                margin-bottom: 10px;
              }
              .divider {
                border-top: 1px dashed #000;
                margin: 5px 0;
              }
              .item-row {
                display: flex;
                justify-content: space-between;
              }
              .item-name {
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .item-qty {
                width: 30px;
                text-align: center;
                margin: 0 5px;
              }
              .item-price {
                width: 70px;
                text-align: right;
              }
              .totals {
                margin-top: 10px;
                text-align: right;
              }
              .total-line {
                display: flex;
                justify-content: space-between;
              }
              .grand-total {
                font-weight: bold;
                font-size: 14px;
                margin-top: 5px;
              }
              .payment-info {
                margin-top: 10px;
              }
              @media print {
                body {
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            ${receiptRef.current.innerHTML}
          </body>
        </html>
      `)

      // Add a small delay to ensure the content is loaded
      setTimeout(() => {
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()

        // Close the window after printing (or after a timeout if print is canceled)
        setTimeout(() => {
          printWindow.close()
          setIsPrinting(false)
          if (onPrintComplete) onPrintComplete()
        }, 1000)
      }, 500)
    } catch (error) {
      console.error("Print error:", error)
      setPrintError(error instanceof Error ? error.message : "Failed to print receipt")
      setIsPrinting(false)
    }
  }

  // Auto-print when component mounts if autoPrint is true
  useEffect(() => {
    if (autoPrint) {
      // Small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        printReceipt()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [autoPrint])

  return (
    <div>
      {/* Hidden receipt template that will be used for printing */}
      <div ref={receiptRef} className="receipt hidden">
        <div className="header">
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>{storeName}</div>
          <div>{formatDate(new Date())}</div>
          <div>Receipt #{receiptNumber}</div>
          {saleId && <div>Sale ID: {saleId}</div>}
        </div>

        <div className="divider"></div>

        <div className="items">
          <div className="receipt-items space-y-1">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <div className="flex-1 truncate mr-2">
                  <span className="font-mono">
                    {item.name} x {item.quantity}
                  </span>
                </div>
                <div className="flex-shrink-0 font-mono text-right">
                  {new Intl.NumberFormat(language, {
                    style: "currency",
                    currency,
                  }).format(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="divider"></div>

        <div className="totals">
          <div className="total-line">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="total-line">
            <span>Tax:</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="total-line grand-total">
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="divider"></div>

        <div className="payment-info">
          <div>Payment Method: {paymentMethod}</div>
        </div>

        <div className="divider"></div>

        <div className="footer">
          <div>Thank you for your purchase!</div>
          <div>Please come again</div>
        </div>
      </div>

      {/* Manual print button as fallback */}
      <Button onClick={printReceipt} disabled={isPrinting} variant="outline" className="w-full mt-4">
        <Printer className="mr-2 h-4 w-4" />
        {isPrinting ? "Printing..." : "Print Receipt"}
      </Button>

      {printError && (
        <div className="text-red-500 text-sm mt-2">
          Error: {printError}. Please try again or check your printer settings.
        </div>
      )}
    </div>
  )
}

