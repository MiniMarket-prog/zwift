import { Suspense } from "react"
import SuppliersClient from "./SuppliersClient"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Suppliers | POS System",
  description: "Manage your suppliers",
}

export default function SuppliersPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<Skeleton className="w-full h-[600px]" />}>
        <SuppliersClient />
      </Suspense>
    </div>
  )
}

