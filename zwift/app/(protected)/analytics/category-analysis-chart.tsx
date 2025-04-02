"use client"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface CategoryAnalysisChartProps {
  metrics: any
  categories: any[]
  type: "sales" | "revenue" | "profit"
}

export function CategoryAnalysisChart({ metrics, categories, type }: CategoryAnalysisChartProps) {
  if (!metrics || !metrics.categoryPerformance) {
    return <div className="flex justify-center items-center h-64">No data available</div>
  }

  // Sort data by the selected metric in descending order and take top 10
  const sortedData = [...metrics.categoryPerformance]
    .sort((a, b) => {
      if (type === "sales") return b.totalQuantity - a.totalQuantity
      if (type === "revenue") return b.totalSales - a.totalSales
      return b.totalProfit - a.totalProfit
    })
    .slice(0, 10)
    .map((category) => ({
      name: category.categoryName || "Uncategorized",
      sales: Number.parseFloat(category.totalSales.toFixed(2)),
      quantity: Number.parseFloat(category.totalQuantity.toFixed(0)),
      profit: Number.parseFloat(category.totalProfit.toFixed(2)),
      margin: Number.parseFloat((category.profitMargin * 100).toFixed(1)),
    }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sortedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => (type === "sales" ? `${value}` : `$${value}`)} />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === "margin") return [`${value}%`, "Profit Margin"]
            if (name === "quantity") return [value, "Units Sold"]
            return [`$${value}`, name === "sales" ? "Revenue" : "Profit"]
          }}
        />
        <Legend />
        <Bar
          dataKey={type === "sales" ? "quantity" : type === "revenue" ? "sales" : "profit"}
          name={type === "sales" ? "Units Sold" : type === "revenue" ? "Revenue" : "Profit"}
          fill={type === "sales" ? "#8884d8" : type === "revenue" ? "#82ca9d" : "#ffc658"}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

