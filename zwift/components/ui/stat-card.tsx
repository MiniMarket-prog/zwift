import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"

const iconVariants = cva("rounded-md p-2", {
  variants: {
    variant: {
      default: "bg-primary/10 text-primary",
      success: "bg-green-500/10 text-green-500",
      warning: "bg-amber-500/10 text-amber-500",
      danger: "bg-red-500/10 text-red-500",
      info: "bg-blue-500/10 text-blue-500",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: number
  variant?: "default" | "success" | "warning" | "danger" | "info"
  className?: string
}

export function StatCard({ title, value, description, icon, trend, variant = "default", className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className={cn(iconVariants({ variant }))}>{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend !== undefined && (
          <div
            className={cn(
              "text-xs font-medium mt-2",
              trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : "text-muted-foreground",
            )}
          >
            {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} {Math.abs(trend)}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  )
}

