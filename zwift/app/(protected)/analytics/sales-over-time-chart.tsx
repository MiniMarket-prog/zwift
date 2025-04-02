"use client"

import { useMemo } from "react"
import { Line } from "react-chartjs-2"
import { format, parseISO, eachDayOfInterval, isSameDay } from "date-fns"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import type { DateRange } from "react-day-picker"

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export interface SalesOverTimeChartProps {
  salesData: any[]
  dateRange: DateRange
  showProfitLine?: boolean
  height?: number
}

export function SalesOverTimeChart({
  salesData,
  dateRange,
  showProfitLine = false,
  height = 250,
}: SalesOverTimeChartProps) {
  const chartData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return {
        labels: [],
        datasets: [],
      }
    }

    // Generate dates for the x-axis
    const dates = eachDayOfInterval({
      start: dateRange.from,
      end: dateRange.to,
    })

    // Initialize data arrays
    const salesByDay = dates.map(() => 0)
    const profitByDay = dates.map(() => 0)

    // Process sales data
    salesData.forEach((sale) => {
      const saleDate = parseISO(sale.created_at)
      const dateIndex = dates.findIndex((d) => isSameDay(d, saleDate))

      if (dateIndex >= 0) {
        // Add sale amount to the appropriate day
        salesByDay[dateIndex] += sale.total || 0 // Changed from total_amount to total

        // Calculate and add profit
        let saleProfit = 0
        if (sale.sale_items) {
          // Changed from sale.items to sale.sale_items
          sale.sale_items.forEach((item: any) => {
            // Find the product to get its purchase price
            const itemRevenue = (item.price || 0) * (item.quantity || 0) * (1 - (item.discount || 0) / 100)
            const itemCost = (item.purchase_price || 0) * (item.quantity || 0) // This might need to be fetched from products
            saleProfit += itemRevenue - itemCost
          })
        }
        profitByDay[dateIndex] += saleProfit
      }
    })

    // Log the data for debugging
    console.log("Sales by day:", salesByDay)
    console.log("Profit by day:", profitByDay)

    return {
      labels: dates.map((date) => format(date, "MMM dd")),
      datasets: [
        {
          label: "Revenue",
          data: salesByDay,
          borderColor: "rgb(53, 162, 235)",
          backgroundColor: "rgba(53, 162, 235, 0.5)",
          tension: 0.3,
          fill: true,
        },
        ...(showProfitLine
          ? [
              {
                label: "Profit",
                data: profitByDay,
                borderColor: "rgb(34, 197, 94)",
                backgroundColor: "rgba(34, 197, 94, 0.5)",
                tension: 0.3,
                fill: false,
                borderDash: [5, 5],
              },
            ]
          : []),
      ],
    }
  }, [salesData, dateRange, showProfitLine])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => "$" + value,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || ""
            if (label) {
              label += ": "
            }
            label += "$" + context.parsed.y.toFixed(2)
            return label
          },
        },
      },
    },
  }

  if (!salesData || salesData.length === 0 || !dateRange?.from || !dateRange?.to) {
    return <div className="flex items-center justify-center h-[250px]">No sales data available</div>
  }

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={chartData} options={options} />
    </div>
  )
}

