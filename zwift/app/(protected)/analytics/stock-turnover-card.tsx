"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"

export interface StockTurnoverCardProps {
  metrics: {
    overallMetrics?: {
      averageStockTurnover: number
      totalQuantity: number
    }
  } | null
}

export function StockTurnoverCard({ metrics }: StockTurnoverCardProps) {
  if (!metrics || !metrics.overallMetrics) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Stock Turnover</CardTitle>
          <CardDescription>Average inventory turnover rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">-.-x</div>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  const turnoverRate = metrics.overallMetrics.averageStockTurnover || 0
  const totalQuantitySold = metrics.overallMetrics.totalQuantity || 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <RefreshCw className="h-4 w-4 mr-2 text-purple-500" />
          Stock Turnover
        </CardTitle>
        <CardDescription>Average inventory turnover rate</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{turnoverRate.toFixed(1)}x</div>
        <p className="text-xs text-muted-foreground">Total units sold: {totalQuantitySold}</p>
      </CardContent>
    </Card>
  )
}

