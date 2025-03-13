"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Bell, HelpCircle, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  showSearch?: boolean
  onSearch?: (value: string) => void
  searchPlaceholder?: string
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  showSearch = false,
  onSearch,
  searchPlaceholder = "Search...",
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
        {showSearch && (
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder={searchPlaceholder} className="pl-8" onChange={(e) => onSearch?.(e.target.value)} />
          </div>
        )}

        <div className="flex items-center gap-2">
          {actions}
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center">3</Badge>
          </Button>
          <Button variant="outline" size="icon">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

