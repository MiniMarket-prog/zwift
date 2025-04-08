"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { CalendarIcon, Download, Info } from "lucide-react"
import type { DateRange } from "react-day-picker"
import {
  getBreakEvenMetrics,
  getBreakEvenChartData,
  getBreakEvenSensitivityData,
  getBreakEvenScenarios,
  type BreakEvenPeriod,
  type BreakEvenMetrics,
  type BreakEvenChartData,
  type BreakEvenSensitivityData,
  type BreakEvenScenario,
} from "@/lib/break-even-service"
import { formatCurrency, getCurrentCurrency, type SupportedCurrency } from "@/lib/format-currency"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Cell,
} from "recharts"
import { createClient } from "@/lib/supabase-client3"

export default function BreakEvenPage() {
  const [period, setPeriod] = useState<BreakEvenPeriod>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  })
  const [metrics, setMetrics] = useState<BreakEvenMetrics | null>(null)
  const [chartData, setChartData] = useState<BreakEvenChartData[]>([])
  const [sensitivityData, setSensitivityData] = useState<BreakEvenSensitivityData[]>([])
  const [scenarios, setScenarios] = useState<BreakEvenScenario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  // Add error state to track and display errors
  const [error, setError] = useState<string | null>(null)
  // Add currency state
  const [currency, setCurrency] = useState<SupportedCurrency>("USD")

  // Update the fetchData function in the useEffect to include better error handling:
  async function fetchData() {
    setIsLoading(true)
    setError(null)
    try {
      console.log("Fetching break-even data...")
      const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined
      const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined

      console.log(`Period: ${period}, Start: ${startDate}, End: ${endDate}`)

      // Fetch currency setting
      const supabase = createClient()
      const currencyValue = await getCurrentCurrency(supabase)
      setCurrency(currencyValue as SupportedCurrency)

      const metricsData = await getBreakEvenMetrics(period, startDate, endDate)
      console.log("Metrics data:", metricsData)
      setMetrics(metricsData)

      const chartData = await getBreakEvenChartData(period, startDate, endDate)
      console.log("Chart data:", chartData)
      setChartData(chartData)

      const sensitivityData = getBreakEvenSensitivityData()
      console.log("Sensitivity data:", sensitivityData)
      setSensitivityData(sensitivityData)

      const scenariosData = await getBreakEvenScenarios()
      console.log("Scenarios data:", scenariosData)
      setScenarios(scenariosData)
    } catch (error) {
      console.error("Error fetching break-even data:", error)
      setError(`Failed to load data: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [period, dateRange])

  const handleExportData = () => {
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,"

    // Add headers
    csvContent += "Metric,Value\n"

    // Add metrics data
    if (metrics) {
      csvContent += `Total Investment,${metrics.totalInvestment}\n`
      csvContent += `Cumulative Profit,${metrics.cumulativeProfit}\n`
      csvContent += `Break-even Point,${metrics.breakEvenPoint}\n`
      csvContent += `Break-even Percentage,${metrics.breakEvenPercentage.toFixed(2)}%\n`
      csvContent += `Days to Break-even,${metrics.daysToBreakEven || "N/A"}\n`
      csvContent += `Projected Break-even Date,${metrics.projectedBreakEvenDate ? format(metrics.projectedBreakEvenDate, "yyyy-MM-dd") : "N/A"}\n`
      csvContent += `Fixed Costs,${metrics.fixedCosts}\n`
      csvContent += `Variable Costs Per Unit,${metrics.variableCostsPerUnit.toFixed(2)}\n`
      csvContent += `Revenue Per Unit,${metrics.revenuePerUnit.toFixed(2)}\n`
      csvContent += `Contribution Margin,${metrics.contributionMargin.toFixed(2)}\n`
      csvContent += `Contribution Margin Ratio,${(metrics.contributionMarginRatio * 100).toFixed(2)}%\n`
      csvContent += `Break-even Units,${Math.round(metrics.breakEvenUnits)}\n`
      csvContent += `Break-even Sales,${metrics.breakEvenSales.toFixed(2)}\n`
    }

    // Add chart data
    csvContent += "\nDate,Investment,Profit,Cumulative Profit,Break-even Point\n"
    chartData.forEach((item) => {
      csvContent += `${item.date},${item.investment},${item.profit},${item.cumulativeProfit},${item.breakEvenPoint}\n`
    })

    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `break-even-analysis-${format(new Date(), "yyyy-MM-dd")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const breakEvenProgress = metrics ? Math.min(100, (metrics.cumulativeProfit / metrics.totalInvestment) * 100) : 0

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading break-even analysis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-lg font-semibold text-red-800">Error Loading Data</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Break-even Analysis</h1>
          <p className="text-muted-foreground">
            Track when your business will recover its investments and become profitable
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as BreakEvenPeriod)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {period === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange?.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}

          <Button variant="outline" size="icon" onClick={handleExportData}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Break-even Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics ? `${breakEvenProgress.toFixed(1)}%` : "0%"}</div>
                <Progress value={breakEvenProgress} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {breakEvenProgress >= 100
                    ? "Break-even achieved!"
                    : `${(100 - breakEvenProgress).toFixed(1)}% remaining to break-even`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Investment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics ? formatCurrency(metrics.totalInvestment, currency, "en") : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Capital to recover</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cumulative Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics ? formatCurrency(metrics.cumulativeProfit, currency, "en") : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Total profit generated</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Projected Break-even</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.projectedBreakEvenDate ? format(metrics.projectedBreakEvenDate, "MMM d, yyyy") : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {metrics?.daysToBreakEven ? `In ${Math.round(metrics.daysToBreakEven)} days` : "Insufficient data"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Break-even Progress Chart</CardTitle>
                <CardDescription>Cumulative profit vs. total investment over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return format(date, "MMM d")
                        }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        yAxisId="left"
                        tickFormatter={(value) => formatCurrency(value, currency, "en").split(".")[0]}
                        tick={{ fontSize: 12 }}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => formatCurrency(value, currency, "en")}
                        labelFormatter={(label) => format(new Date(label), "MMMM d, yyyy")}
                      />
                      <Legend />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="cumulativeProfit"
                        name="Cumulative Profit"
                        fill="#10b981"
                        stroke="#10b981"
                        fillOpacity={0.3}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="breakEvenPoint"
                        name="Break-even Point"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Profit vs. Investment</CardTitle>
                <CardDescription>Compare monthly profit against investment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value)
                          return format(date, "MMM d")
                        }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        tickFormatter={(value) => formatCurrency(value, currency, "en").split(".")[0]}
                        tick={{ fontSize: 12 }}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => formatCurrency(value, currency, "en")}
                        labelFormatter={(label) => format(new Date(label), "MMMM d, yyyy")}
                      />
                      <Legend />
                      <Bar dataKey="investment" name="Investment" fill="#3b82f6" />
                      <Bar dataKey="profit" name="Profit" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Break-even Metrics</CardTitle>
              <CardDescription>Detailed metrics for break-even analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Fixed Costs</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total fixed costs that don't vary with sales volume</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xl font-semibold">
                      {metrics ? formatCurrency(metrics.fixedCosts, currency, "en") : "—"}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Variable Cost Per Unit</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Average cost that varies with each unit sold</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xl font-semibold">
                      {metrics ? formatCurrency(metrics.variableCostsPerUnit, currency, "en") : "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Revenue Per Unit</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Average revenue generated per unit sold</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xl font-semibold">
                      {metrics ? formatCurrency(metrics.revenuePerUnit, currency, "en") : "—"}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Contribution Margin</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Revenue per unit minus variable costs per unit</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xl font-semibold">
                      {metrics ? formatCurrency(metrics.contributionMargin, currency, "en") : "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Break-even Units</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Number of units needed to sell to break even</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xl font-semibold">
                      {metrics ? Math.round(metrics.breakEvenUnits).toLocaleString() : "—"}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Break-even Sales</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total sales revenue needed to break even</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xl font-semibold">
                      {metrics ? formatCurrency(metrics.breakEvenSales, currency, "en") : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Break-even Scenarios</CardTitle>
              <CardDescription>Compare different business scenarios and their impact on break-even</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead>Fixed Costs</TableHead>
                    <TableHead>Variable Costs</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Days to Break-even</TableHead>
                    <TableHead>Break-even Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenarios.map((scenario) => (
                    <TableRow key={scenario.name}>
                      <TableCell className="font-medium">{scenario.name}</TableCell>
                      <TableCell>
                        {scenario.fixedCostMultiplier < 1 ? "↓" : scenario.fixedCostMultiplier > 1 ? "↑" : "—"}
                        {Math.abs((scenario.fixedCostMultiplier - 1) * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell>
                        {scenario.variableCostMultiplier < 1 ? "↓" : scenario.variableCostMultiplier > 1 ? "↑" : "—"}
                        {Math.abs((scenario.variableCostMultiplier - 1) * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell>
                        {scenario.revenueMultiplier > 1 ? "↑" : scenario.revenueMultiplier < 1 ? "↓" : "—"}
                        {Math.abs((scenario.revenueMultiplier - 1) * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell>
                        {scenario.breakEvenDays ? Math.round(scenario.breakEvenDays).toLocaleString() : "N/A"}
                      </TableCell>
                      <TableCell>
                        {scenario.breakEvenDate ? format(scenario.breakEvenDate, "MMM d, yyyy") : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-8 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={scenarios.filter((s) => s.breakEvenDays !== null)}
                    layout="vertical"
                    margin={{ top: 20, right: 20, bottom: 20, left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `${value} days`} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                    <RechartsTooltip formatter={(value: number) => `${Math.round(value)} days`} />
                    <Bar dataKey="breakEvenDays" name="Days to Break-even">
                      {scenarios
                        .filter((s) => s.breakEvenDays !== null)
                        .map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "Base Case"
                                ? "#3b82f6"
                                : entry.breakEvenDays &&
                                    entry.breakEvenDays < (scenarios[0].breakEvenDays || Number.POSITIVE_INFINITY)
                                  ? "#10b981"
                                  : "#ef4444"
                            }
                          />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sensitivity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sensitivity Analysis</CardTitle>
                <CardDescription>How changes in revenue and costs affect break-even</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sensitivityData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="scenario" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(value) => `${value} days`} tick={{ fontSize: 12 }} />
                      <RechartsTooltip formatter={(value: number) => `${value} days`} />
                      <Bar dataKey="breakEvenDays" name="Days to Break-even">
                        {sensitivityData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.scenario === "Base Case"
                                ? "#3b82f6"
                                : entry.breakEvenDays < sensitivityData[0].breakEvenDays
                                  ? "#10b981"
                                  : "#ef4444"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Break-even Dates by Scenario</CardTitle>
                <CardDescription>Projected break-even dates for different scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scenario</TableHead>
                      <TableHead>Break-even Date</TableHead>
                      <TableHead>Days to Break-even</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sensitivityData.map((item) => (
                      <TableRow key={item.scenario}>
                        <TableCell className="font-medium">{item.scenario}</TableCell>
                        <TableCell>{item.breakEvenDate}</TableCell>
                        <TableCell>{item.breakEvenDays}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
