import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Break-even Analysis | Mini Market",
  description: "Analyze when your business will reach its break-even point",
}

export default function BreakEvenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
