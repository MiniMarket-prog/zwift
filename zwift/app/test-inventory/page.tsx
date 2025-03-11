"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { generateTestInventoryActivity } from "@/app/actions/test-inventory-activity"

export default function TestInventoryPage() {
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleGenerateActivity() {
    setIsLoading(true)
    try {
      const response = await generateTestInventoryActivity()
      setResult(response)
    } catch (error: any) {
      // Add type assertion for error
      setResult({
        success: false,
        message: `Error: ${error?.message || "Unknown error"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Test Inventory Activity</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Test Activity</CardTitle>
          <CardDescription>
            This will update a random inventory item's quantity to trigger the inventory activity recording.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Click the button below to increase the quantity of a random inventory item by 5 units. This should trigger
            the inventory_activity recording function.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateActivity} disabled={isLoading}>
            {isLoading ? "Processing..." : "Generate Activity"}
          </Button>
        </CardFooter>
      </Card>

      {result && (
        <Card className={result.success ? "bg-green-50" : "bg-red-50"}>
          <CardHeader>
            <CardTitle>{result.success ? "Success" : "Error"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2">{result.message}</p>
            {result.success && (
              <p className="text-sm">Activity recorded: {result.activityRecorded ? "Yes ✅" : "No ❌"}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

