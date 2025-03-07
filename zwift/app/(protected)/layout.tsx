import type React from "react"
import { Sidebar } from "@/components/sidebar"
import { AuthProvider } from "@/components/auth-provider"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1">
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  )
}

