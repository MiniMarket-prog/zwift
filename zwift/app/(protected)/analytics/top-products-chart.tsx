"use client"

import { Bar } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js"

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export interface TopProductsChartProps {
  metrics: {
    productPerformance?: Array<{
      productId: string
      productName: string
      totalQuantity: number
      totalSales: number
      totalCost: number
      totalProfit: number
      profitMargin: number
    }>
  } | null
  type?: "profit" | "revenue" | "quantity"
}

export function TopProductsChart({ metrics, type = "profit" }: TopProductsChartProps) {
  if (!metrics || !metrics.productPerformance || metrics.productPerformance.length === 0) {
    return <div className="flex items-center justify-center h-[250px]">No data available</div>
  }

  // Sort products based on the selected metric
  const sortedProducts = [...metrics.productPerformance]
    .sort((a, b) => {
      if (type === "profit") {
        return b.totalProfit - a.totalProfit
      } else if (type === "revenue") {
        return b.totalSales - a.totalSales
      } else {
        return b.totalQuantity - a.totalQuantity
      }
    })
    .slice(0, 5)

  const labels = sortedProducts.map((product) => product.productName)

  let values: number[] = []
  if (type === "profit") {
    values = sortedProducts.map((product) => product.totalProfit)
  } else if (type === "revenue") {
    values = sortedProducts.map((product) => product.totalSales)
  } else {
    values = sortedProducts.map((product) => product.totalQuantity)
  }

  const data = {
    labels,
    datasets: [
      {
        label: type === "profit" ? "Profit" : type === "revenue" ? "Revenue" : "Units Sold",
        data: values,
        backgroundColor: [
          "rgba(53, 162, 235, 0.8)",
          "rgba(53, 162, 235, 0.7)",
          "rgba(53, 162, 235, 0.6)",
          "rgba(53, 162, 235, 0.5)",
          "rgba(53, 162, 235, 0.4)",
        ],
        borderColor: [
          "rgb(53, 162, 235)",
          "rgb(53, 162, 235)",
          "rgb(53, 162, 235)",
          "rgb(53, 162, 235)",
          "rgb(53, 162, 235)",
        ],
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            if (type === "quantity") {
              return value
            }
            return "$" + value
          },
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
            if (type === "quantity") {
              label += context.parsed.y.toFixed(0)
            } else {
              label += "$" + context.parsed.y.toFixed(2)
            }
            return label
          },
        },
      },
    },
  }

  return (
    <div className="h-[250px]">
      <Bar data={data} options={options} />
    </div>
  )
}

