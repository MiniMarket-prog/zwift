"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

export interface ProfitMarginCardProps {
  metrics: {
    overallMetrics?: {
      averageProfitMargin: number
      totalProfit: number
    }
  } | null
}

export function ProfitMarginCard({ metrics }: ProfitMarginCardProps) {
  if (!metrics || !metrics.overallMetrics) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
          <CardDescription>Average profit margin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">--.--%</div>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  const profitMargin = metrics.overallMetrics.averageProfitMargin || 0
  const totalProfit = metrics.overallMetrics.totalProfit || 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
          Profit Margin
        </CardTitle>
        <CardDescription>Average profit margin</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{(profitMargin * 100).toFixed(1)}%</div>
        <p className="text-xs text-muted-foreground">
          Total profit: <span className="font-medium text-green-600">${totalProfit.toFixed(2)}</span>
        </p>
      </CardContent>
    </Card>
  )
}

