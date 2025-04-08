"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { formatCurrency, getCurrentCurrency, type SupportedCurrency } from "@/lib/format-currency"
import { Plus, Pencil, Trash2, DollarSign, FileText, Loader2, RefreshCw, ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Define types based on your database schema
interface InitialInvestment {
  id: string
  amount: number
  description: string | null
  investment_date: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export default function InitialInvestmentsPage() {
  // State variables
  const [investments, setInvestments] = useState<InitialInvestment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<InitialInvestment | null>(null)
  const [selectedInvestment, setSelectedInvestment] = useState<InitialInvestment | null>(null)
  const [sortField, setSortField] = useState<keyof InitialInvestment>("investment_date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [userId, setUserId] = useState<string | null>(null)

  // Form state
  const [amount, setAmount] = useState<number | "">("")
  const [description, setDescription] = useState("")
  const [investmentDate, setInvestmentDate] = useState<Date>(new Date())

  // Date input state for direct input
  const [dateInputValue, setDateInputValue] = useState("")

  // Hooks
  const supabase = createClient()
  const { toast } = useToast()
  const { language } = useLanguage()
  const [currency, setCurrency] = useState<SupportedCurrency>("USD")

  // Update date input value when investment date changes
  useEffect(() => {
    if (investmentDate) {
      setDateInputValue(format(investmentDate, "yyyy-MM-dd"))
    }
  }, [investmentDate])

  // Fetch user ID and investments on component mount
  useEffect(() => {
    const fetchUserAndData = async () => {
      await fetchCurrentUser()
      await fetchInvestments()
      await fetchCurrency()
    }

    fetchUserAndData()
  }, [])

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        throw error
      }

      if (user) {
        setUserId(user.id)
      } else {
        // Handle case where user is not authenticated
        toast({
          title: "Authentication Required",
          description: "You need to be logged in to manage investments",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching user:", error)
    }
  }

  // Fetch currency setting
  const fetchCurrency = async () => {
    try {
      const currencyValue = await getCurrentCurrency(supabase)
      // Cast the string to SupportedCurrency type
      setCurrency(currencyValue as SupportedCurrency)
    } catch (error) {
      console.error("Error fetching currency setting:", error)
      setCurrency("USD") // Default fallback
    }
  }

  // Fetch investments from the database
  const fetchInvestments = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("initial_investments")
        .select("*")
        .order(sortField, { ascending: sortDirection === "asc" })

      if (error) throw error

      setInvestments(data || [])
    } catch (error) {
      console.error("Error fetching investments:", error)
      toast({
        title: "Error",
        description: "Failed to load investments",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle sort change
  const handleSort = (field: keyof InitialInvestment) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Effect to refetch when sort changes
  useEffect(() => {
    fetchInvestments()
  }, [sortField, sortDirection])

  // Open dialog for adding a new investment
  const handleAddInvestment = () => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to add investments",
        variant: "destructive",
      })
      return
    }

    setEditingInvestment(null)
    setAmount("")
    setDescription("")
    const today = new Date()
    setInvestmentDate(today)
    setDateInputValue(format(today, "yyyy-MM-dd"))
    setIsDialogOpen(true)
  }

  // Open dialog for editing an existing investment
  const handleEditInvestment = (investment: InitialInvestment) => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to edit investments",
        variant: "destructive",
      })
      return
    }

    setEditingInvestment(investment)
    setAmount(investment.amount)
    setDescription(investment.description || "")

    const date = investment.investment_date ? new Date(investment.investment_date) : new Date()
    setInvestmentDate(date)
    setDateInputValue(format(date, "yyyy-MM-dd"))

    setIsDialogOpen(true)
  }

  // Open dialog for deleting an investment
  const handleDeleteClick = (investment: InitialInvestment) => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to delete investments",
        variant: "destructive",
      })
      return
    }

    setSelectedInvestment(investment)
    setIsDeleteDialogOpen(true)
  }

  // Handle date input change
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDateInputValue(value)

    // Update the date if the input is valid
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setInvestmentDate(date)
      }
    }
  }

  // Submit form for adding/editing an investment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "You need to be logged in to save investments",
        variant: "destructive",
      })
      return
    }

    if (amount === "") {
      toast({
        title: "Error",
        description: "Amount is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const investmentData = {
        amount,
        description: description || null,
        investment_date: investmentDate?.toISOString() || null,
        user_id: userId, // Include the user_id in the data
      }

      if (editingInvestment) {
        // Update existing investment
        const { error } = await supabase
          .from("initial_investments")
          .update(investmentData)
          .eq("id", editingInvestment.id)

        if (error) throw error

        toast({
          title: "Success",
          description: "Investment updated successfully",
        })
      } else {
        // Add new investment
        const { error } = await supabase.from("initial_investments").insert([investmentData])

        if (error) throw error

        toast({
          title: "Success",
          description: "Investment added successfully",
        })
      }

      // Close dialog and refresh data
      setIsDialogOpen(false)
      fetchInvestments()
    } catch (error) {
      console.error("Error saving investment:", error)
      toast({
        title: "Error",
        description: `Failed to save investment: ${(error as any)?.message || "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete an investment
  const handleDeleteInvestment = async () => {
    if (!selectedInvestment || !userId) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from("initial_investments").delete().eq("id", selectedInvestment.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Investment deleted successfully",
      })

      // Close dialog and refresh data
      setIsDeleteDialogOpen(false)
      fetchInvestments()
    } catch (error) {
      console.error("Error deleting investment:", error)
      toast({
        title: "Error",
        description: `Failed to delete investment: ${(error as any)?.message || "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate total investment
  const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0)

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Initial Investments</h1>
          <p className="text-muted-foreground">Track and manage your initial capital investments</p>
        </div>

        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <Button onClick={handleAddInvestment}>
            <Plus className="mr-2 h-4 w-4" />
            Add Investment
          </Button>

          <Button variant="outline" onClick={fetchInvestments} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvestment, currency, language)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {investments.length} investment {investments.length === 1 ? "entry" : "entries"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Latest Investment</CardTitle>
          </CardHeader>
          <CardContent>
            {investments.length > 0 ? (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    investments.sort(
                      (a, b) =>
                        new Date(b.investment_date || b.created_at).getTime() -
                        new Date(a.investment_date || a.created_at).getTime(),
                    )[0].amount,
                    currency,
                    language,
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {investments.length > 0 && investments[0].investment_date
                    ? format(new Date(investments[0].investment_date), "MMM d, yyyy")
                    : "No date recorded"}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No investments recorded</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Investment Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(investments.map((inv) => inv.description)))
                .filter(Boolean)
                .map((desc, index) => (
                  <Badge key={index} variant="outline">
                    {desc}
                  </Badge>
                ))}
              {investments.length === 0 && <div className="text-muted-foreground">No categories yet</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Records</CardTitle>
          <CardDescription>A detailed list of all initial capital investments</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <p>Loading investments...</p>
            </div>
          ) : investments.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No investments recorded</h3>
              <p className="text-muted-foreground">Add your first investment to get started</p>
              <Button onClick={handleAddInvestment} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Investment
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("investment_date")}
                    >
                      <div className="flex items-center">
                        Date
                        {sortField === "investment_date" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center">
                        Amount
                        {sortField === "amount" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("description")}>
                      <div className="flex items-center">
                        Description
                        {sortField === "description" && <ArrowUpDown className="ml-2 h-4 w-4" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments.map((investment) => (
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
                        {investment.description || <span className="text-muted-foreground italic">No description</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditInvestment(investment)}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(investment)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Investment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingInvestment ? "Edit Investment" : "Add Investment"}</DialogTitle>
            <DialogDescription>
              {editingInvestment
                ? "Update the details of your investment"
                : "Enter the details of your initial investment"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <div className="col-span-3 relative">
                  <DollarSign className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-8"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number.parseFloat(e.target.value) : "")}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  Date
                </Label>
                <div className="col-span-3">
                  {/* Direct date input for better cross-browser compatibility */}
                  <Input
                    id="date"
                    type="date"
                    value={dateInputValue}
                    onChange={handleDateInputChange}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <div className="col-span-3">
                  <Textarea
                    id="description"
                    placeholder="Enter a description for this investment"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingInvestment ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  <>{editingInvestment ? "Update" : "Add"} Investment</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Investment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this investment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedInvestment && (
              <div className="rounded-md bg-muted p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Amount:</span>
                  <span>{formatCurrency(selectedInvestment.amount, currency, language)}</span>
                </div>
                {selectedInvestment.description && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-medium">Description:</span>
                    <span>{selectedInvestment.description}</span>
                  </div>
                )}
                {selectedInvestment.investment_date && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-medium">Date:</span>
                    <span>{format(new Date(selectedInvestment.investment_date), "PPP")}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteInvestment} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>Delete</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
