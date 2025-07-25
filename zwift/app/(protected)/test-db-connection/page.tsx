"use client"

import { Input } from "@/components/ui/input"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Database, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { getLowStockProducts, getMostSoldProducts, getSlowMovingProducts } from "@/lib/supabaseAI"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export default function TestDbConnectionPage() {
  const [lowStockData, setLowStockData] = useState<any>(null)
  const [mostSoldData, setMostSoldData] = useState<any>(null)
  const [slowMovingData, setSlowMovingData] = useState<any>(null)

  const [lowStockError, setLowStockError] = useState<string | null>(null)
  const [mostSoldError, setMostSoldError] = useState<string | null>(null)
  const [slowMovingError, setSlowMovingError] = useState<string | null>(null)

  const [isLoadingLowStock, setIsLoadingLowStock] = useState(false)
  const [isLoadingMostSold, setIsLoadingMostSold] = useState(false)
  const [isLoadingSlowMoving, setIsLoadingSlowMoving] = useState(false)

  const [periodDays, setPeriodDays] = useState(30) // Default period for sales queries

  const runTest = async (
    testFunction: Function,
    setData: React.Dispatch<React.SetStateAction<any>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    ...args: any[]
  ) => {
    setLoading(true)
    setData(null)
    setError(null)
    try {
      const result = await testFunction(...args)
      setData(result)
      setError(null)
    } catch (err: any) {
      console.error(`Error in ${testFunction.name}:`, err)
      setError(err.message || "An unknown error occurred.")
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleTestLowStock = () => {
    runTest(getLowStockProducts, setLowStockData, setLowStockError, setIsLoadingLowStock)
  }

  const handleTestMostSold = () => {
    runTest(getMostSoldProducts, setMostSoldData, setMostSoldError, setIsLoadingMostSold, periodDays)
  }

  const handleTestSlowMoving = () => {
    runTest(getSlowMovingProducts, setSlowMovingData, setSlowMovingError, setIsLoadingSlowMoving, periodDays)
  }

  // Log errors to console for easier debugging
  useEffect(() => {
    if (lowStockError) console.error("Low Stock Test Error:", lowStockError)
    if (mostSoldError) console.error("Most Sold Test Error:", mostSoldError)
    if (slowMovingError) console.error("Slow Moving Test Error:", slowMovingError)
  }, [lowStockError, mostSoldError, slowMovingError])

  return (
    <div className="container py-10 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8 text-green-600" />
            Supabase Connection Test
          </h1>
          <p className="text-muted-foreground mt-1">
            Test direct database function calls to diagnose connection issues.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            handleTestLowStock()
            handleTestMostSold()
            handleTestSlowMoving()
          }}
          disabled={isLoadingLowStock || isLoadingMostSold || isLoadingSlowMoving}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4 mr-2",
              (isLoadingLowStock || isLoadingMostSold || isLoadingSlowMoving) && "animate-spin",
            )}
          />
          Run All Tests
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Test Card: Low Stock Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">getLowStockProducts()</CardTitle>
            <Button onClick={handleTestLowStock} disabled={isLoadingLowStock} size="sm">
              {isLoadingLowStock ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingLowStock && (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            )}
            {!isLoadingLowStock && lowStockError && (
              <div className="text-red-500 flex items-center gap-2">
                <XCircle className="h-5 w-5" /> Error: {lowStockError}
              </div>
            )}
            {!isLoadingLowStock && lowStockData && (
              <div className="text-green-600 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" /> Success!
              </div>
            )}
            {!isLoadingLowStock && lowStockData && (
              <ScrollArea className="h-48 mt-4 border rounded-md p-2 text-sm bg-gray-50">
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(lowStockData, null, 2)}</pre>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Test Card: Most Sold Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">getMostSoldProducts()</CardTitle>
            <Button onClick={handleTestMostSold} disabled={isLoadingMostSold} size="sm">
              {isLoadingMostSold ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <label htmlFor="most-sold-period" className="text-sm font-medium">
                Period (Days):
              </label>
              <Input
                id="most-sold-period"
                type="number"
                min="1"
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value))}
                className="w-24 ml-2 inline-flex"
              />
            </div>
            {isLoadingMostSold && (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            )}
            {!isLoadingMostSold && mostSoldError && (
              <div className="text-red-500 flex items-center gap-2">
                <XCircle className="h-5 w-5" /> Error: {mostSoldError}
              </div>
            )}
            {!isLoadingMostSold && mostSoldData && (
              <div className="text-green-600 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" /> Success!
              </div>
            )}
            {!isLoadingMostSold && mostSoldData && (
              <ScrollArea className="h-48 mt-4 border rounded-md p-2 text-sm bg-gray-50">
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(mostSoldData, null, 2)}</pre>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Test Card: Slow Moving Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">getSlowMovingProducts()</CardTitle>
            <Button onClick={handleTestSlowMoving} disabled={isLoadingSlowMoving} size="sm">
              {isLoadingSlowMoving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <label htmlFor="slow-moving-period" className="text-sm font-medium">
                Period (Days):
              </label>
              <Input
                id="slow-moving-period"
                type="number"
                min="1"
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value))}
                className="w-24 ml-2 inline-flex"
              />
            </div>
            {isLoadingSlowMoving && (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            )}
            {!isLoadingSlowMoving && slowMovingError && (
              <div className="text-red-500 flex items-center gap-2">
                <XCircle className="h-5 w-5" /> Error: {slowMovingError}
              </div>
            )}
            {!isLoadingSlowMoving && slowMovingData && (
              <div className="text-green-600 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" /> Success!
              </div>
            )}
            {!isLoadingSlowMoving && slowMovingData && (
              <ScrollArea className="h-48 mt-4 border rounded-md p-2 text-sm bg-gray-50">
                <pre className="whitespace-pre-wrap break-all">{JSON.stringify(slowMovingData, null, 2)}</pre>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
