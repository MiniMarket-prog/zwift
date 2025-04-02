"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Search } from "lucide-react"

interface ProductPerformanceTableProps {
  data: Array<{
    productId: string
    productName: string
    totalQuantity: number
    totalSales: number
    totalCost: number
    totalProfit: number
    profitMargin: number
  }>
}

export function ProductPerformanceTable({ data }: ProductPerformanceTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<string>("totalProfit")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Filter data based on search term
  const filteredData = data.filter((item) => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))

  // Sort data based on sort field and direction
  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortField as keyof typeof a]
    const bValue = b[sortField as keyof typeof b]

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    return 0
  })

  // Handle sort
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Sort by <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleSort("productName")}>Product Name</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort("totalQuantity")}>Quantity Sold</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort("totalSales")}>Revenue</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort("totalProfit")}>Profit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort("profitMargin")}>Profit Margin</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length > 0 ? (
              sortedData.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-right">{item.totalQuantity}</TableCell>
                  <TableCell className="text-right">${item.totalSales.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${item.totalCost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${item.totalProfit.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{(item.profitMargin * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

