"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Download } from "lucide-react"

interface PaginationControlProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  showFirstLast?: boolean
  className?: string
  onExportPDF?: () => void
  onExportCSV?: () => void
  isExporting?: boolean
}

export function PaginationControl({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50, 100],
  showFirstLast = true,
  className = "",
  onExportPDF,
  onExportCSV,
  isExporting = false,
}: PaginationControlProps) {
  const [inputPage, setInputPage] = useState<string>(currentPage.toString())

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPage(e.target.value)
  }

  const handlePageInputBlur = () => {
    const page = Number.parseInt(inputPage, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page)
    } else {
      setInputPage(currentPage.toString())
    }
  }

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePageInputBlur()
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
      setInputPage(page.toString())
    }
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-2 ${className}`}>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-start">
        {pageSize !== undefined && onPageSizeChange && (
          <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number.parseInt(value, 10))}>
            <SelectTrigger className="w-16">
              <SelectValue placeholder={pageSize.toString()} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Export buttons */}
        {onExportPDF && (
          <Button variant="outline" size="icon" onClick={onExportPDF} disabled={isExporting} aria-label="Export PDF">
            <FileText className="h-4 w-4" />
          </Button>
        )}

        {onExportCSV && (
          <Button variant="outline" size="icon" onClick={onExportCSV} disabled={isExporting} aria-label="Export CSV">
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 my-2 sm:my-0">
        {showFirstLast && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 min-w-[120px] justify-center">
          <span className="text-sm font-medium">Page</span>
          <input
            type="text"
            value={inputPage}
            onChange={handlePageInputChange}
            onBlur={handlePageInputBlur}
            onKeyDown={handlePageInputKeyDown}
            className="w-12 h-8 text-center border rounded-md font-medium"
            aria-label="Current page"
          />
          <span className="text-sm font-medium">of {totalPages}</span>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {showFirstLast && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="w-16 hidden sm:block">{/* Empty div to balance the layout */}</div>
    </div>
  )
}
