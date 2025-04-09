"use client"

import { useState, useEffect } from "react"
import { format, subMonths } from "date-fns"
import { fetchROIData, type ROIData } from "@/lib/roi-service"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { formatCurrency, getCurrentCurrency, type SupportedCurrency } from "@/lib/format-currency"
import { Calendar, Download, RefreshCw, TrendingUp, DollarSign, Calculator, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase-client"

// Import recharts components
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// Define period options
type PeriodOption = "3months" | "6months" | "1year" | "2years" | "all" | "custom"

export default function ROIPage() {
  // State variables
  const [roiData, setRoiData] = useState<ROIData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodOption>("1year")
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: subMonths(new Date(), 12),
    to: new Date(),
  })
  const [currency, setCurrency] = useState<SupportedCurrency>("USD")

  // Hooks
  const { toast } = useToast()
  const { language } = useLanguage()
  const supabase = createClient()

  // Fetch currency setting
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const currencyValue = await getCurrentCurrency(supabase)
        setCurrency(currencyValue as SupportedCurrency)
      } catch (error) {
        console.error("Error fetching currency setting:", error)
        setCurrency("USD") // Default fallback
      }
    }

    fetchCurrency()
  }, [supabase])

  // Fetch ROI data based on selected period
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        let fromDate: Date
        let toDate = new Date()

        switch (period) {
          case "3months":
            fromDate = subMonths(toDate, 3)
            break
          case "6months":
            fromDate = subMonths(toDate, 6)
            break
          case "1year":
            fromDate = subMonths(toDate, 12)
            break
          case "2years":
            fromDate = subMonths(toDate, 24)
            break
          case "all":
            fromDate = new Date(2000, 0, 1) // Far back enough to include all data
            break
          case "custom":
            fromDate = customDateRange.from
            toDate = customDateRange.to
            break
          default:
            fromDate = subMonths(toDate, 12)
        }

        const data = await fetchROIData(fromDate, toDate)
        setRoiData(data)
      } catch (error) {
        console.error("Error fetching ROI data:", error)
        toast({
          title: "Error",
          description: "Failed to load ROI data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [period, customDateRange, toast])

  // Handle period change
  const handlePeriodChange = (value: string) => {
    setPeriod(value as PeriodOption)
  }

  // Handle custom date range selection
  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setCustomDateRange({ from: range.from, to: range.to })
    }
  }

  // Handle data refresh
  const handleRefresh = () => {
    // Re-fetch data with current settings
    const fetchData = async () => {
      setIsLoading(true)
      try {
        let fromDate: Date
        let toDate = new Date()

        switch (period) {
          case "custom":
            fromDate = customDateRange.from
            toDate = customDateRange.to
            break
          case "3months":
            fromDate = subMonths(toDate, 3)
            break
          case "6months":
            fromDate = subMonths(toDate, 6)
            break
          case "1year":
            fromDate = subMonths(toDate, 12)
            break
          case "2years":
            fromDate = subMonths(toDate, 24)
            break
          case "all":
            fromDate = new Date(2000, 0, 1)
            break
          default:
            fromDate = subMonths(toDate, 12)
        }

        const data = await fetchROIData(fromDate, toDate)
        setRoiData(data)

        toast({
          title: "Data Refreshed",
          description: "ROI data has been updated",
        })
      } catch (error) {
        console.error("Error refreshing ROI data:", error)
        toast({
          title: "Error",
          description: "Failed to refresh ROI data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }

  // Export data to CSV
  const exportToCSV = () => {
    if (!roiData) return

    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,"

    // Add headers
    csvContent += "Metric,Value\n"

    // Add summary data
    csvContent += `Total Investment,${roiData.totalInvestment}\n`
    csvContent += `Net Profit,${roiData.netProfit}\n`
    csvContent += `ROI (%),${roiData.roi.toFixed(2)}\n`
    csvContent += `Annualized ROI (%),${roiData.annualizedRoi.toFixed(2)}\n`
    csvContent += `Payback Period (months),${roiData.paybackPeriod?.toFixed(2) || "N/A"}\n`
    csvContent += `Break-even Point,${roiData.breakEvenPoint?.toFixed(2) || "N/A"}\n`
    csvContent += `Profitability Index,${roiData.profitabilityIndex?.toFixed(2) || "N/A"}\n\n`

    // Add monthly data
    csvContent += "Month,Net Profit,Investment,ROI (%)\n"
    roiData.monthlyData.forEach((month) => {
      csvContent += `${month.formattedMonth},${month.netProfit},${month.investment},${month.roi.toFixed(2)}\n`
    })

    // Add investment data
    csvContent += "\nInvestments\n"
    csvContent += "Date,Amount,Description\n"
    roiData.investments.forEach((inv) => {
      const date = inv.investment_date ? format(new Date(inv.investment_date), "yyyy-MM-dd") : "N/A"
      csvContent += `${date},${inv.amount},${inv.description || "N/A"}\n`
    })

    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `roi_data_${format(new Date(), "yyyy-MM-dd")}.csv`)
    document.body.appendChild(link)

    // Trigger download
    link.click()

    // Clean up
    document.body.removeChild(link)

    toast({
      title: "Export Complete",
      description: "ROI data has been exported to CSV",
    })
  }

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Return on Investment (ROI)</h1>
          <p className="text-muted-foreground">Track and analyze your business investment performance</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last 1 Year</SelectItem>
              <SelectItem value="2years">Last 2 Years</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {period === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  {customDateRange.from ? (
                    <>
                      {format(customDateRange.from, "MMM d, yyyy")} - {format(customDateRange.to, "MMM d, yyyy")}
                    </>
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={customDateRange.from}
                  selected={{
                    from: customDateRange.from,
                    to: customDateRange.to,
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      handleDateRangeChange(range)
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button variant="outline" onClick={exportToCSV} disabled={!roiData || isLoading}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <span className="text-muted-foreground">Loading...</span> : `${roiData?.roi.toFixed(2)}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Return on your total investment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Annualized ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                `${roiData?.annualizedRoi.toFixed(2)}%`
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Annual rate of return</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                formatCurrency(roiData?.totalInvestment || 0, currency, language)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Capital invested in the business</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                formatCurrency(roiData?.netProfit || 0, currency, language)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total profit after all expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payback Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
              <div className="text-xl font-bold">
                {isLoading ? (
                  <span className="text-muted-foreground">Loading...</span>
                ) : roiData?.paybackPeriod ? (
                  `${roiData.paybackPeriod.toFixed(1)} months`
                ) : (
                  "N/A"
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Time needed to recover the investment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Break-even Point</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-muted-foreground" />
              <div className="text-xl font-bold">
                {isLoading ? (
                  <span className="text-muted-foreground">Loading...</span>
                ) : roiData?.breakEvenPoint ? (
                  formatCurrency(roiData.breakEvenPoint, currency, language)
                ) : (
                  "N/A"
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sales volume needed to cover costs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profitability Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-muted-foreground" />
              <div className="text-xl font-bold">
                {isLoading ? (
                  <span className="text-muted-foreground">Loading...</span>
                ) : roiData?.profitabilityIndex ? (
                  roiData.profitabilityIndex.toFixed(2)
                ) : (
                  "N/A"
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ratio of profit to investment ({">"}1 is good)</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="monthly" className="mb-6">
        <TabsList>
          <TabsTrigger value="monthly">Monthly ROI</TabsTrigger>
          <TabsTrigger value="investment">Investment Breakdown</TabsTrigger>
          <TabsTrigger value="comparison">Profit vs Investment</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Monthly ROI Performance</CardTitle>
              <CardDescription>Return on investment tracked over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : roiData?.monthlyData && roiData.monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={roiData.monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="formattedMonth" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === "ROI") return [`${value.toFixed(2)}%`, name]
                          return [formatCurrency(value, currency, language), name]
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="roi"
                        name="ROI"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                      />
                      <Line yAxisId="left" type="monotone" dataKey="netProfit" name="Net Profit" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <TrendingUp className="h-16 w-16 mb-4" />
                    <p>No data available for the selected period</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investment">
          <Card>
            <CardHeader>
              <CardTitle>Investment Breakdown</CardTitle>
              <CardDescription>Distribution of investments by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : roiData?.investmentsByCategory && Object.keys(roiData.investmentsByCategory).length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(roiData.investmentsByCategory).map(([name, value], index) => ({
                          name,
                          value,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {Object.entries(roiData.investmentsByCategory).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value, currency, language), "Investment"]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <DollarSign className="h-16 w-16 mb-4" />
                    <p>No investment data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Profit vs Investment Comparison</CardTitle>
              <CardDescription>Monthly comparison of net profit against cumulative investment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : roiData?.monthlyData && roiData.monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roiData.monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="formattedMonth" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number, name: string) => [formatCurrency(value, currency, language), name]}
                      />
                      <Legend />
                      <Bar dataKey="investment" name="Cumulative Investment" fill="#8884d8" />
                      <Bar dataKey="netProfit" name="Net Profit" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Calculator className="h-16 w-16 mb-4" />
                    <p>No comparison data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Investments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Records</CardTitle>
          <CardDescription>A detailed list of all capital investments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin mr-2" />
              <p>Loading investments...</p>
            </div>
          ) : roiData?.investments && roiData.investments.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>ROI Contribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roiData.investments.map((investment) => {
                    // Calculate this investment's contribution to overall ROI
                    const contributionPercentage =
                      roiData.totalInvestment > 0 ? (investment.amount / roiData.totalInvestment) * 100 : 0

                    return (
                      <TableRow key={investment.id}>
                        <TableCell>
                          {investment.investment_date
                            ? format(new Date(investment.investment_date), "MMM d, yyyy")
                            : "No date"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(investment.amount, currency, language)}
                        </TableCell>
                        <TableCell>
                          {investment.description || (
                            <span className="text-muted-foreground italic">No description</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={contributionPercentage > 20 ? "default" : "outline"}>
                            {contributionPercentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <DollarSign className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No investments recorded</h3>
              <p className="text-muted-foreground">Add investments in the Initial Investments page</p>
              <Button asChild className="mt-4">
                <a href="/initial-investments">Go to Investments</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
