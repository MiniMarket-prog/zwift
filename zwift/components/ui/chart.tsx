"use client"

import * as React from "react"
import {
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  AreaChart as RechartsAreaChart,
} from "recharts"
import { cn } from "@/lib/utils"

// Define chart colors
const chartColors = {
  primary: "hsl(var(--chart-1))",
  secondary: "hsl(var(--chart-2))",
  tertiary: "hsl(var(--chart-3))",
  quaternary: "hsl(var(--chart-4))",
  quinary: "hsl(var(--chart-5))",
}

// Define chart config type
type ChartConfig = Record<
  string,
  {
    label: string
    color: string
  }
>

// Chart container component
interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
}

export function ChartContainer({ config, className, children, ...props }: ChartContainerProps) {
  // Create CSS variables for chart colors
  const style = React.useMemo(() => {
    return Object.entries(config).reduce(
      (acc, [key, value]) => {
        acc[`--color-${key}`] = value.color
        return acc
      },
      {} as Record<string, string>,
    )
  }, [config])

  return (
    <div className={cn("w-full", className)} style={style} {...props}>
      {children}
    </div>
  )
}

// Chart tooltip component
interface ChartTooltipProps extends React.ComponentPropsWithoutRef<typeof Tooltip> {
  className?: string
}

export function ChartTooltip({ className, ...props }: ChartTooltipProps) {
  return <Tooltip {...props} content={<ChartTooltipContent />} />
}

// Chart tooltip content component
interface ChartTooltipContentProps {
  active?: boolean
  payload?: any[]
  label?: string
}

export function ChartTooltipContent({ active, payload, label }: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <span className="text-[0.70rem] uppercase text-muted-foreground">{label}</span>
        </div>
        <div className="flex flex-col">
          {payload.map((item) => (
            <span key={item.name} className="flex items-center gap-1 text-[0.70rem] text-muted-foreground">
              <div
                className="h-1 w-1 rounded-full"
                style={{
                  backgroundColor: item.color,
                }}
              />
              {item.name}: {item.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Bar Chart component
interface BarChartProps {
  data: any[]
  xAxisDataKey: string
  yAxisDataKey: string
  className?: string
}

export function BarChart({ data, xAxisDataKey, yAxisDataKey, className }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisDataKey} />
        <YAxis />
        <ChartTooltip />
        <Legend />
        <Bar dataKey={yAxisDataKey} fill="var(--color-primary)" />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

// Line Chart component
interface LineChartProps {
  data: any[]
  xAxisDataKey: string
  yAxisDataKey: string
  className?: string
}

export function LineChart({ data, xAxisDataKey, yAxisDataKey, className }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisDataKey} />
        <YAxis />
        <ChartTooltip />
        <Legend />
        <Line type="monotone" dataKey={yAxisDataKey} stroke="var(--color-primary)" />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

// Area Chart component
interface AreaChartProps {
  data: any[]
  xAxisDataKey: string
  yAxisDataKey: string
  className?: string
}

export function AreaChart({ data, xAxisDataKey, yAxisDataKey, className }: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <RechartsAreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisDataKey} />
        <YAxis />
        <ChartTooltip />
        <Legend />
        <Area type="monotone" dataKey={yAxisDataKey} fill="var(--color-primary)" stroke="var(--color-primary)" />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}

