import type React from "react"
export default function ProfitAnalysisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="p-6 max-w-7xl mx-auto">{children}</div>
}
