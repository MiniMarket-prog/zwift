"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function DebugSupabase({ items }: { items: any[] }) {
  const [showData, setShowData] = useState(false)

  return (
    <div className="border p-4 rounded-md">
      <h3 className="font-medium mb-2">Supabase Debug</h3>
      <p>Items fetched: {items.length}</p>
      <Button variant="outline" size="sm" onClick={() => setShowData(!showData)} className="mt-2">
        {showData ? "Hide" : "Show"} Data
      </Button>

      {showData && (
        <pre className="mt-4 p-2 bg-muted rounded-md overflow-auto text-xs">{JSON.stringify(items, null, 2)}</pre>
      )}
    </div>
  )
}

