"use client"

import { useState } from "react"
import { PaginationControl } from "@/components/pagination-control"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function PaginationExample() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isExporting, setIsExporting] = useState(false)
  const totalItems = 80
  const totalPages = Math.ceil(totalItems / pageSize)
  const { toast } = useToast()

  // Example data - in a real app, you would fetch this based on currentPage and pageSize
  const generateItems = () => {
    const startItem = (currentPage - 1) * pageSize + 1
    const endItem = Math.min(startItem + pageSize - 1, totalItems)
    return Array.from({ length: endItem - startItem + 1 }, (_, i) => ({
      id: startItem + i,
      name: `Item ${startItem + i}`,
      description: `Description for item ${startItem + i}`,
    }))
  }

  const items = generateItems()

  // Mock export functions
  const handleExportPDF = () => {
    setIsExporting(true)

    // Simulate export delay
    setTimeout(() => {
      toast({
        title: "PDF Export",
        description: "Your PDF has been generated and downloaded.",
      })
      setIsExporting(false)
    }, 1500)
  }

  const handleExportCSV = () => {
    setIsExporting(true)

    // Simulate export delay
    setTimeout(() => {
      toast({
        title: "CSV Export",
        description: "Your CSV file has been generated and downloaded.",
      })
      setIsExporting(false)
    }, 1500)
  }

  return (
    <div className="container py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pagination Example</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isExporting && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Generating export...</span>
              </div>
            )}

            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">{item.id}</td>
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="py-2">
              <PaginationControl
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                className="mt-4"
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                isExporting={isExporting}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

