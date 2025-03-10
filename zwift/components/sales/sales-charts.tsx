"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useRef } from "react"
import type { SalesByDay, SalesByPaymentMethod, CategorySales } from "@/app/actions/sales"
import { format } from "date-fns"

export function SalesTrendChart({ salesByDay }: { salesByDay: SalesByDay[] }) {
  const chartRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!chartRef.current || salesByDay.length === 0) return

    const ctx = chartRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, chartRef.current.width, chartRef.current.height)

    // Chart dimensions
    const width = chartRef.current.width
    const height = chartRef.current.height
    const padding = { top: 20, right: 20, bottom: 40, left: 60 }

    // Calculate chart area
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Find max value for scaling
    const maxSales = Math.max(...salesByDay.map((day) => day.total), 1)

    // Draw axes
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, height - padding.bottom)
    ctx.lineTo(width - padding.right, height - padding.bottom)
    ctx.stroke()

    // Draw Y-axis labels
    ctx.fillStyle = "#6b7280"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight * (5 - i)) / 5
      const value = (maxSales * i) / 5
      ctx.fillText(`$${value.toFixed(0)}`, padding.left - 5, y)
    }

    // Draw X-axis labels (dates)
    ctx.textAlign = "center"
    ctx.textBaseline = "top"

    // If we have more than 10 days, only show some labels
    const step = salesByDay.length > 10 ? Math.ceil(salesByDay.length / 10) : 1

    salesByDay.forEach((day, i) => {
      if (i % step === 0 || i === salesByDay.length - 1) {
        const x = padding.left + (chartWidth * i) / (salesByDay.length - 1 || 1)
        const formattedDate = format(new Date(day.date), "MMM d")
        ctx.fillText(formattedDate, x, height - padding.bottom + 5)
      }
    })

    // Draw sales line
    ctx.strokeStyle = "#3b82f6"
    ctx.lineWidth = 2
    ctx.beginPath()

    salesByDay.forEach((day, i) => {
      const x = padding.left + (chartWidth * i) / (salesByDay.length - 1 || 1)
      const y = height - padding.bottom - chartHeight * (day.total / maxSales)

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Add sales data points
    ctx.fillStyle = "#3b82f6"
    salesByDay.forEach((day, i) => {
      const x = padding.left + (chartWidth * i) / (salesByDay.length - 1 || 1)
      const y = height - padding.bottom - chartHeight * (day.total / maxSales)

      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()
    })

    // Add title
    ctx.fillStyle = "#111827"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText("Daily Sales", width / 2, 5)
  }, [salesByDay])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Trend</CardTitle>
        <CardDescription>View your sales performance over time</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <canvas ref={chartRef} width={400} height={300} className="w-full h-full" />
      </CardContent>
    </Card>
  )
}

export function PaymentMethodChart({ salesByPaymentMethod }: { salesByPaymentMethod: SalesByPaymentMethod[] }) {
  const chartRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!chartRef.current || salesByPaymentMethod.length === 0) return

    const ctx = chartRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, chartRef.current.width, chartRef.current.height)

    // Chart dimensions
    const width = chartRef.current.width
    const height = chartRef.current.height
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(centerX, centerY) - 40

    // Calculate total for percentages
    const total = salesByPaymentMethod.reduce((sum, method) => sum + method.total, 0)

    // Colors for pie slices
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

    // Draw pie chart
    let startAngle = 0
    salesByPaymentMethod.forEach((method, i) => {
      const sliceAngle = (method.total / total) * 2 * Math.PI

      ctx.fillStyle = colors[i % colors.length]
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle)
      ctx.closePath()
      ctx.fill()

      // Calculate position for label
      const labelAngle = startAngle + sliceAngle / 2
      const labelRadius = radius * 0.7
      const labelX = centerX + Math.cos(labelAngle) * labelRadius
      const labelY = centerY + Math.sin(labelAngle) * labelRadius

      // Draw percentage label if slice is big enough
      if (method.total / total > 0.05) {
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 12px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(`${Math.round((method.total / total) * 100)}%`, labelX, labelY)
      }

      startAngle += sliceAngle
    })

    // Draw legend
    const legendX = 10
    let legendY = height - 10 - salesByPaymentMethod.length * 20

    ctx.textAlign = "left"
    ctx.textBaseline = "middle"

    salesByPaymentMethod.forEach((method, i) => {
      const color = colors[i % colors.length]

      // Draw color box
      ctx.fillStyle = color
      ctx.fillRect(legendX, legendY - 6, 12, 12)

      // Draw method name and percentage
      ctx.fillStyle = "#111827"
      ctx.font = "12px sans-serif"
      ctx.fillText(
        `${method.method.charAt(0).toUpperCase() + method.method.slice(1)} (${Math.round((method.total / total) * 100)}%)`,
        legendX + 20,
        legendY,
      )

      legendY += 20
    })

    // Add title
    ctx.fillStyle = "#111827"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText("Sales by Payment Method", width / 2, 5)
  }, [salesByPaymentMethod])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>Distribution of sales by payment type</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <canvas ref={chartRef} width={400} height={300} className="w-full h-full" />
      </CardContent>
    </Card>
  )
}

export function CategorySalesChart({ categorySales }: { categorySales: CategorySales[] }) {
  const chartRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!chartRef.current || categorySales.length === 0) return

    const ctx = chartRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, chartRef.current.width, chartRef.current.height)

    // Chart dimensions
    const width = chartRef.current.width
    const height = chartRef.current.height
    const padding = { top: 30, right: 20, bottom: 60, left: 60 }

    // Calculate chart area
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Limit to top 5 categories
    const topCategories = categorySales.slice(0, 5)

    // Find max value for scaling
    const maxSales = Math.max(...topCategories.map((cat) => cat.total), 1)

    // Draw axes
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, height - padding.bottom)
    ctx.lineTo(width - padding.right, height - padding.bottom)
    ctx.stroke()

    // Draw Y-axis labels
    ctx.fillStyle = "#6b7280"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight * (5 - i)) / 5
      const value = (maxSales * i) / 5
      ctx.fillText(`$${value.toFixed(0)}`, padding.left - 5, y)
    }

    // Calculate bar width
    const barWidth = chartWidth / (topCategories.length * 2)

    // Draw bars and labels
    topCategories.forEach((category, i) => {
      const x = padding.left + (i * 2 + 1) * barWidth
      const barHeight = (chartHeight * category.total) / maxSales
      const y = height - padding.bottom - barHeight

      // Draw bar
      ctx.fillStyle = "#3b82f6"
      ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight)

      // Draw category name
      ctx.fillStyle = "#6b7280"
      ctx.font = "10px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "top"

      // Truncate long category names
      let categoryName = category.category
      if (categoryName.length > 10) {
        categoryName = categoryName.substring(0, 8) + "..."
      }

      ctx.fillText(categoryName, x, height - padding.bottom + 5)

      // Draw value on top of bar
      ctx.fillStyle = "#3b82f6"
      ctx.font = "10px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      ctx.fillText(`$${category.total.toFixed(0)}`, x, y - 2)
    })

    // Add title
    ctx.fillStyle = "#111827"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText("Sales by Category", width / 2, 5)
  }, [categorySales])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>Sales breakdown by product category</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <canvas ref={chartRef} width={400} height={300} className="w-full h-full" />
      </CardContent>
    </Card>
  )
}

