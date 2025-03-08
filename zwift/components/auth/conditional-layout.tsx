"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/toaster"

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith("/auth")

  return (
    <>
      {isAuthPage ? (
        children
      ) : (
        <SidebarProvider>
          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1">{children}</main>
          </div>
        </SidebarProvider>
      )}
      <Toaster />
    </>
  )
}

