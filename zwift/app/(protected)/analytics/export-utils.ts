export function exportToCSV(data: any[], filename: string) {
    if (!data || !data.length) {
      console.error("No data to export")
      return
    }
  
    // Get headers from the first object
    const headers = Object.keys(data[0])
  
    // Create CSV content
    const csvContent = [
      // Headers row
      headers.join(","),
      // Data rows
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            // Format numbers with 2 decimal places
            if (typeof value === "number") {
              return value.toFixed(2)
            }
            // Wrap strings in quotes and escape existing quotes
            if (typeof value === "string") {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value || ""
          })
          .join(","),
      ),
    ].join("\n")
  
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  