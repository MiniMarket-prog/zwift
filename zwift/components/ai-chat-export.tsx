"use client"

import { Button } from "@/components/ui/button"
import { Download, FileText, Table } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface AiChatExportProps {
  data: any[]
  filename: string
  type: "csv" | "json" | "txt"
}

export function AiChatExport({ data, filename, type }: AiChatExportProps) {
  const exportData = () => {
    try {
      let content = ""
      let mimeType = ""
      let fileExtension = ""

      switch (type) {
        case "csv":
          if (data.length > 0) {
            const headers = Object.keys(data[0]).join(",")
            const rows = data.map((row) => Object.values(row).join(",")).join("\n")
            content = `${headers}\n${rows}`
          }
          mimeType = "text/csv"
          fileExtension = "csv"
          break
        case "json":
          content = JSON.stringify(data, null, 2)
          mimeType = "application/json"
          fileExtension = "json"
          break
        case "txt":
          content = data.map((item) => JSON.stringify(item)).join("\n")
          mimeType = "text/plain"
          fileExtension = "txt"
          break
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${filename}.${fileExtension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `Data exported as ${filename}.${fileExtension}`,
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export data",
        variant: "destructive",
      })
    }
  }

  const getIcon = () => {
    switch (type) {
      case "csv":
        return <Table className="h-4 w-4" />
      case "json":
      case "txt":
        return <FileText className="h-4 w-4" />
      default:
        return <Download className="h-4 w-4" />
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={exportData} className="gap-2 bg-transparent">
      {getIcon()}
      Export {type.toUpperCase()}
    </Button>
  )
}
