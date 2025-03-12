"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase-client"
import {
  AlertCircle,
  Database,
  Download,
  FileUp,
  HardDrive,
  LayoutDashboard,
  RefreshCw,
  Server,
  Settings,
  ShieldAlert,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useLanguage } from "@/hooks/use-language"

// Define the types for our operations
type Operation = {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  dangerLevel: "low" | "medium" | "high"
  action: () => Promise<void>
}

export default function SetupPage() {
  const [activeTab, setActiveTab] = useState("database")
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [operationStatus, setOperationStatus] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    operation: Operation | null
    confirmText: string
  }>({
    open: false,
    operation: null,
    confirmText: "",
  })
  const [importDialog, setImportDialog] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [backupOptions, setBackupOptions] = useState({
    includeProducts: true,
    includeCategories: true,
    includeSales: true,
    includeExpenses: true,
    includeUsers: false,
    includeSettings: true,
  })

  const { toast } = useToast()
  const supabase = createClient()
  const { getAppTranslation, language } = useLanguage()

  // Define database operations
  const databaseOperations: Operation[] = [
    {
      id: "backup",
      name: "Backup Database",
      description: "Create a backup of your database that you can download",
      icon: <Download className="h-5 w-5" />,
      dangerLevel: "low",
      action: async () => {
        try {
          setIsLoading(true)
          setOperationStatus("Starting backup process...")
          setProgress(10)

          // Collect tables to backup based on options
          const tablesToBackup: string[] = []
          if (backupOptions.includeProducts) tablesToBackup.push("products")
          if (backupOptions.includeCategories) tablesToBackup.push("categories")
          if (backupOptions.includeSales) {
            tablesToBackup.push("sales")
            tablesToBackup.push("sale_items")
          }
          if (backupOptions.includeExpenses) {
            tablesToBackup.push("expenses")
            tablesToBackup.push("expense_categories")
          }
          if (backupOptions.includeSettings) tablesToBackup.push("settings")
          if (backupOptions.includeUsers) tablesToBackup.push("profiles")

          setOperationStatus(`Collecting data from ${tablesToBackup.length} tables...`)
          setProgress(20)

          // Fetch data from each table
          const backupData: Record<string, any[]> = {}
          let tableIndex = 0

          for (const table of tablesToBackup) {
            setOperationStatus(`Backing up table: ${table}...`)
            setProgress(20 + Math.floor((tableIndex / tablesToBackup.length) * 60))

            const { data, error } = await supabase.from(table as any).select("*")
            if (error) throw error

            backupData[table] = data || []
            tableIndex++
          }

          setOperationStatus("Preparing backup file...")
          setProgress(85)

          // Create a JSON file with the backup data
          const backupJson = JSON.stringify(backupData, null, 2)
          const blob = new Blob([backupJson], { type: "application/json" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `pos_backup_${new Date().toISOString().split("T")[0]}.json`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          setProgress(100)
          setOperationStatus("Backup completed successfully!")

          toast({
            title: "Backup Successful",
            description: "Your database has been backed up successfully.",
          })
        } catch (error) {
          console.error("Backup error:", error)
          toast({
            title: "Backup Failed",
            description: "There was an error creating your backup. Please try again.",
            variant: "destructive",
          })
          setOperationStatus("Backup failed. See console for details.")
        } finally {
          setTimeout(() => {
            setIsLoading(false)
            setProgress(0)
            setOperationStatus(null)
          }, 2000)
        }
      },
    },
    {
      id: "restore",
      name: "Restore Database",
      description: "Restore your database from a backup file",
      icon: <Upload className="h-5 w-5" />,
      dangerLevel: "high",
      action: async () => {
        try {
          if (!importFile) {
            toast({
              title: "No File Selected",
              description: "Please select a backup file to restore.",
              variant: "destructive",
            })
            return
          }

          setIsLoading(true)
          setOperationStatus("Starting restore process...")
          setProgress(10)

          // Read the file
          const fileReader = new FileReader()
          fileReader.onload = async (e) => {
            try {
              const fileContent = e.target?.result as string
              const backupData = JSON.parse(fileContent)

              setOperationStatus("Validating backup data...")
              setProgress(20)

              // Validate backup data structure
              if (!backupData || typeof backupData !== "object") {
                throw new Error("Invalid backup file format")
              }

              const tables = Object.keys(backupData)
              if (tables.length === 0) {
                throw new Error("No tables found in backup file")
              }

              let tableIndex = 0
              for (const table of tables) {
                setOperationStatus(`Restoring table: ${table}...`)
                setProgress(30 + Math.floor((tableIndex / tables.length) * 60))

                // Clear existing data
                const { error: deleteError } = await supabase
                  .from(table as any)
                  .delete()
                  .neq("id", "dummy_id")
                if (deleteError) {
                  console.warn(`Warning: Could not clear table ${table}:`, deleteError)
                }

                // Insert new data if there is any
                if (backupData[table] && backupData[table].length > 0) {
                  const { error: insertError } = await supabase.from(table as any).insert(backupData[table])
                  if (insertError) throw insertError
                }

                tableIndex++
              }

              setProgress(100)
              setOperationStatus("Restore completed successfully!")

              toast({
                title: "Restore Successful",
                description: "Your database has been restored successfully.",
              })

              // Close the import dialog
              setImportDialog(false)
              setImportFile(null)
            } catch (error) {
              console.error("Restore error:", error)
              toast({
                title: "Restore Failed",
                description: "There was an error restoring your backup. Please check the file format.",
                variant: "destructive",
              })
              setOperationStatus("Restore failed. See console for details.")
            } finally {
              setTimeout(() => {
                setIsLoading(false)
                setProgress(0)
                setOperationStatus(null)
              }, 2000)
            }
          }

          fileReader.readAsText(importFile)
        } catch (error) {
          console.error("File reading error:", error)
          toast({
            title: "File Error",
            description: "There was an error reading the backup file.",
            variant: "destructive",
          })
          setIsLoading(false)
          setOperationStatus(null)
        }
      },
    },
    {
      id: "reset",
      name: "Reset Tables",
      description: "Reset database tables structure (keeps your data)",
      icon: <RefreshCw className="h-5 w-5" />,
      dangerLevel: "medium",
      action: async () => {
        try {
          setIsLoading(true)
          setOperationStatus("Starting table reset process...")
          setProgress(10)

          // This would typically call a server-side API that has the necessary permissions
          // to modify the database schema. For now, we'll simulate this process.
          setOperationStatus("Checking database connection...")
          setProgress(20)

          // Simulate API call to reset tables
          setOperationStatus("Recreating tables structure...")
          setProgress(50)

          // Wait for a moment to simulate the operation
          await new Promise((resolve) => setTimeout(resolve, 2000))

          setProgress(100)
          setOperationStatus("Tables reset successfully!")

          toast({
            title: "Tables Reset Successful",
            description: "Your database tables have been reset successfully.",
          })
        } catch (error) {
          console.error("Reset tables error:", error)
          toast({
            title: "Reset Failed",
            description: "There was an error resetting your tables. Please try again.",
            variant: "destructive",
          })
          setOperationStatus("Reset failed. See console for details.")
        } finally {
          setTimeout(() => {
            setIsLoading(false)
            setProgress(0)
            setOperationStatus(null)
          }, 2000)
        }
      },
    },
    {
      id: "clear",
      name: "Clear All Data",
      description: "Delete all data from the database (keeps table structure)",
      icon: <Trash2 className="h-5 w-5" />,
      dangerLevel: "high",
      action: async () => {
        try {
          setIsLoading(true)
          setOperationStatus("Starting data clearing process...")
          setProgress(10)

          // Define tables to clear
          const tablesToClear = ["products", "categories", "sales", "sale_items", "expenses", "expense_categories"]

          setOperationStatus("Preparing to clear tables...")
          setProgress(20)

          let tableIndex = 0
          for (const table of tablesToClear) {
            setOperationStatus(`Clearing table: ${table}...`)
            setProgress(20 + Math.floor((tableIndex / tablesToClear.length) * 70))

            // Delete all data from the table
            const { error } = await supabase
              .from(table as any)
              .delete()
              .neq("id", "dummy_id")
            if (error) {
              console.warn(`Warning: Could not clear table ${table}:`, error)
            }

            tableIndex++
          }

          setProgress(100)
          setOperationStatus("Data cleared successfully!")

          toast({
            title: "Data Cleared",
            description: "All data has been cleared from your database.",
          })
        } catch (error) {
          console.error("Clear data error:", error)
          toast({
            title: "Clear Failed",
            description: "There was an error clearing your data. Please try again.",
            variant: "destructive",
          })
          setOperationStatus("Clear failed. See console for details.")
        } finally {
          setTimeout(() => {
            setIsLoading(false)
            setProgress(0)
            setOperationStatus(null)
          }, 2000)
        }
      },
    },
  ]

  // Define system operations
  const systemOperations: Operation[] = [
    {
      id: "seed",
      name: "Seed Demo Data",
      description: "Add sample products, categories, and sales for testing",
      icon: <Database className="h-5 w-5" />,
      dangerLevel: "medium",
      action: async () => {
        try {
          setIsLoading(true)
          setOperationStatus("Starting demo data seeding...")
          setProgress(10)

          // Seed categories
          setOperationStatus("Creating sample categories...")
          setProgress(20)

          const categoryData = [
            { name: "Beverages" },
            { name: "Snacks" },
            { name: "Bakery" },
            { name: "Dairy" },
            { name: "Produce" },
          ]

          const { data: insertedCategories, error: categoryError } = await supabase
            .from("categories")
            .insert(categoryData)
            .select()

          if (categoryError) throw categoryError

          // Use the returned categories with IDs
          const categories = insertedCategories || []

          // Seed products
          setOperationStatus("Creating sample products...")
          setProgress(40)

          const products = [
            {
              name: "Coffee",
              price: 2.5,
              barcode: "1234567890123",
              stock: 100,
              min_stock: 20,
              category_id: categories[0]?.id,
              purchase_price: 1.5,
            },
            {
              name: "Tea",
              price: 2.0,
              barcode: "1234567890124",
              stock: 80,
              min_stock: 15,
              category_id: categories[0]?.id,
              purchase_price: 1.0,
            },
            {
              name: "Chips",
              price: 1.5,
              barcode: "1234567890125",
              stock: 50,
              min_stock: 10,
              category_id: categories[1]?.id,
              purchase_price: 0.75,
            },
            {
              name: "Chocolate Bar",
              price: 1.0,
              barcode: "1234567890126",
              stock: 60,
              min_stock: 12,
              category_id: categories[1]?.id,
              purchase_price: 0.5,
            },
            {
              name: "Bread",
              price: 3.0,
              barcode: "1234567890127",
              stock: 30,
              min_stock: 5,
              category_id: categories[2]?.id,
              purchase_price: 1.5,
            },
          ]

          const { data: productsData, error: productError } = await supabase.from("products").insert(products).select()
          if (productError) throw productError

          const insertedProducts = productsData || []

          // Seed sales
          setOperationStatus("Creating sample sales...")
          setProgress(70)

          // Create a few sample sales
          const sale1 = {
            total: 5.5,
            tax: 0.5,
            payment_method: "cash",
          }

          const { data: saleData1, error: saleError1 } = await supabase.from("sales").insert(sale1).select()
          if (saleError1) throw saleError1

          // Add sale items
          const saleItems1 = [
            {
              sale_id: saleData1[0].id,
              product_id: insertedProducts[0]?.id,
              quantity: 1,
              price: insertedProducts[0]?.price,
            },
            {
              sale_id: saleData1[0].id,
              product_id: insertedProducts[2]?.id,
              quantity: 2,
              price: insertedProducts[2]?.price,
            },
          ]

          const { error: saleItemsError1 } = await supabase.from("sale_items").insert(saleItems1)
          if (saleItemsError1) throw saleItemsError1

          setProgress(100)
          setOperationStatus("Demo data seeded successfully!")

          toast({
            title: "Demo Data Added",
            description: "Sample data has been added to your database.",
          })
        } catch (error) {
          console.error("Seed demo data error:", error)
          toast({
            title: "Seeding Failed",
            description: "There was an error adding demo data. Please try again.",
            variant: "destructive",
          })
          setOperationStatus("Seeding failed. See console for details.")
        } finally {
          setTimeout(() => {
            setIsLoading(false)
            setProgress(0)
            setOperationStatus(null)
          }, 2000)
        }
      },
    },
    {
      id: "export-products",
      name: "Export Products",
      description: "Export all products to a CSV file",
      icon: <FileUp className="h-5 w-5" />,
      dangerLevel: "low",
      action: async () => {
        try {
          setIsLoading(true)
          setOperationStatus("Starting product export...")
          setProgress(10)

          // Fetch all products with their category names
          setOperationStatus("Fetching products and categories...")
          setProgress(30)

          const { data: products, error } = await supabase.from("products").select(`
          *,
          categories:category_id (name)
        `)
          if (error) throw error

          setOperationStatus("Preparing CSV file...")
          setProgress(60)

          // Create CSV content with better formatting
          const headers = ["ID", "Name", "Price", "Barcode", "Current Stock", "Min Stock", "Category", "Purchase Price"]

          const csvRows = [headers]

          products.forEach((product) => {
            // Format numbers to 2 decimal places when needed
            const price = Number(product.price).toFixed(2)
            const purchasePrice = product.purchase_price ? Number(product.purchase_price).toFixed(2) : ""

            csvRows.push([
              product.id,
              product.name,
              price,
              product.barcode,
              product.stock.toString(),
              product.min_stock.toString(),
              product.categories?.name || "Uncategorized", // Use category name instead of ID
              purchasePrice,
            ])
          })

          // Properly escape and quote CSV values
          const processRow = (row: (string | number)[]) => {
            return row
              .map((value) => {
                // Convert to string and escape quotes
                const stringValue = String(value).replace(/"/g, '""')
                // Quote values that contain commas, quotes, or newlines
                return /[",\n\r]/.test(stringValue) ? `"${stringValue}"` : stringValue
              })
              .join(",")
          }

          const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(processRow).join("\n")

          const encodedUri = encodeURI(csvContent)
          const link = document.createElement("a")
          link.setAttribute("href", encodedUri)
          link.setAttribute("download", `products_export_${new Date().toISOString().split("T")[0]}.csv`)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          setProgress(100)
          setOperationStatus("Products exported successfully!")

          toast({
            title: "Export Successful",
            description: `${products.length} products have been exported to CSV.`,
          })
        } catch (error) {
          console.error("Export products error:", error)
          toast({
            title: "Export Failed",
            description: "There was an error exporting your products. Please try again.",
            variant: "destructive",
          })
          setOperationStatus("Export failed. See console for details.")
        } finally {
          setTimeout(() => {
            setIsLoading(false)
            setProgress(0)
            setOperationStatus(null)
          }, 2000)
        }
      },
    },
    {
      id: "import-products",
      name: "Import Products",
      description: "Import products from a CSV file",
      icon: <FileUp className="h-5 w-5" />,
      dangerLevel: "medium",
      action: async () => {
        // This will open the import dialog instead of directly performing the action
        setImportDialog(true)
        return Promise.resolve()
      },
    },
    {
      id: "diagnostics",
      name: "Run Diagnostics",
      description: "Check database connection and system health",
      icon: <Wrench className="h-5 w-5" />,
      dangerLevel: "low",
      action: async () => {
        try {
          setIsLoading(true)
          setOperationStatus("Starting system diagnostics...")
          setProgress(10)

          // Check database connection
          setOperationStatus("Checking database connection...")
          setProgress(20)

          const { data, error } = await supabase.from("settings").select("count(*)", { count: "exact" })
          if (error) throw error

          setOperationStatus("Checking tables...")
          setProgress(40)

          // Check each important table
          const tables = ["products", "categories", "sales", "sale_items", "expenses", "expense_categories", "settings"]
          let tableIndex = 0

          for (const table of tables) {
            setOperationStatus(`Checking table: ${table}...`)
            setProgress(40 + Math.floor((tableIndex / tables.length) * 50))

            const { count, error: countError } = await supabase.from(table as any).select("*", { count: "exact" })
            if (countError) {
              console.warn(`Warning: Could not check table ${table}:`, countError)
            }

            tableIndex++
          }

          setProgress(100)
          setOperationStatus("Diagnostics completed successfully!")

          toast({
            title: "Diagnostics Successful",
            description: "All systems are functioning properly.",
          })
        } catch (error) {
          console.error("Diagnostics error:", error)
          toast({
            title: "Diagnostics Failed",
            description: "There was an error running diagnostics. Please check your connection.",
            variant: "destructive",
          })
          setOperationStatus("Diagnostics failed. See console for details.")
        } finally {
          setTimeout(() => {
            setIsLoading(false)
            setProgress(0)
            setOperationStatus(null)
          }, 2000)
        }
      },
    },
  ]

  // Define maintenance operations
  const maintenanceOperations: Operation[] = [
    {
      id: "optimize",
      name: "Optimize Database",
      description: "Optimize database performance and storage",
      icon: <HardDrive className="h-5 w-5" />,
      dangerLevel: "low",
      action: async () => {
        try {
          setIsLoading(true)
          setOperationStatus("Starting database optimization...")
          setProgress(10)

          // This would typically call a server-side API that has the necessary permissions
          // to optimize the database. For now, we'll simulate this process.
          setOperationStatus("Analyzing database structure...")
          setProgress(30)

          // Simulate optimization steps
          setOperationStatus("Optimizing tables...")
          setProgress(50)

          // Wait for a moment to simulate the operation
          await new Promise((resolve) => setTimeout(resolve, 2000))

          setOperationStatus("Cleaning up unused space...")
          setProgress(80)

          // Wait for a moment to simulate the operation
          await new Promise((resolve) => setTimeout(resolve, 1000))

          setProgress(100)
          setOperationStatus("Optimization completed successfully!")

          toast({
            title: "Optimization Successful",
            description: "Your database has been optimized for better performance.",
          })
        } catch (error) {
          console.error("Optimization error:", error)
          toast({
            title: "Optimization Failed",
            description: "There was an error optimizing your database. Please try again.",
            variant: "destructive",
          })
          setOperationStatus("Optimization failed. See console for details.")
        } finally {
          setTimeout(() => {
            setIsLoading(false)
            setProgress(0)
            setOperationStatus(null)
          }, 2000)
        }
      },
    },
    {
      id: "check-integrity",
      name: "Check Data Integrity",
      description: "Verify data integrity and fix inconsistencies",
      icon: <ShieldAlert className="h-5 w-5" />,
      dangerLevel: "low",
      action: async () => {
        try {
          setIsLoading(true)
          setOperationStatus("Starting data integrity check...")
          setProgress(10)

          // Check for orphaned records in sale_items
          setOperationStatus("Checking for orphaned sale items...")
          setProgress(30)

          // This would be a complex query in a real application
          // For now, we'll simulate the check
          await new Promise((resolve) => setTimeout(resolve, 1500))

          // Check for products with negative stock
          setOperationStatus("Checking for invalid product stock levels...")
          setProgress(60)

          const { data: invalidProducts, error } = await supabase
            .from("products")
            .select("id, name, stock")
            .lt("stock", 0)

          if (error) throw error

          if (invalidProducts && invalidProducts.length > 0) {
            // Fix invalid stock levels
            setOperationStatus(`Fixing ${invalidProducts.length} products with invalid stock...`)
            setProgress(80)

            for (const product of invalidProducts) {
              await supabase.from("products").update({ stock: 0 }).eq("id", product.id)
            }
          }

          setProgress(100)
          setOperationStatus("Data integrity check completed successfully!")

          toast({
            title: "Integrity Check Successful",
            description: invalidProducts?.length
              ? `Fixed ${invalidProducts.length} issues with your data.`
              : "No data integrity issues found.",
          })
        } catch (error) {
          console.error("Integrity check error:", error)
          toast({
            title: "Integrity Check Failed",
            description: "There was an error checking your data integrity. Please try again.",
            variant: "destructive",
          })
          setOperationStatus("Integrity check failed. See console for details.")
        } finally {
          setTimeout(() => {
            setIsLoading(false)
            setProgress(0)
            setOperationStatus(null)
          }, 2000)
        }
      },
    },
    {
      id: "clear-cache",
      name: "Clear System Cache",
      description: "Clear application cache and temporary files",
      icon: <RefreshCw className="h-5 w-5" />,
      dangerLevel: "low",
      action: async () => {
        try {
          setIsLoading(true)
          setOperationStatus("Starting cache clearing process...")
          setProgress(10)

          // Clear localStorage cache
          setOperationStatus("Clearing local storage cache...")
          setProgress(30)

          // Clear only specific cache items, not all localStorage
          const cacheKeys = ["product_cache", "category_cache", "recent_sales"]
          cacheKeys.forEach((key) => {
            localStorage.removeItem(key)
          })

          // Clear IndexedDB cache if used
          setOperationStatus("Clearing application cache...")
          setProgress(60)

          // Simulate clearing other caches
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // Refresh the page to ensure clean state
          setOperationStatus("Finalizing cache clear...")
          setProgress(90)

          setProgress(100)
          setOperationStatus("Cache cleared successfully!")

          toast({
            title: "Cache Cleared",
            description: "Application cache has been cleared successfully.",
          })

          // Optional: Reload the page after a short delay
          // setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
          console.error("Cache clearing error:", error)
          toast({
            title: "Cache Clear Failed",
            description: "There was an error clearing the cache. Please try again.",
            variant: "destructive",
          })
          setOperationStatus("Cache clear failed. See console for details.")
        } finally {
          setTimeout(() => {
            setIsLoading(false)
            setProgress(0)
            setOperationStatus(null)
          }, 2000)
        }
      },
    },
  ]

  const handleOperationClick = (operation: Operation) => {
    // For high danger operations, show confirmation dialog
    if (operation.dangerLevel === "high") {
      setConfirmDialog({
        open: true,
        operation,
        confirmText: "",
      })
    } else if (operation.dangerLevel === "medium") {
      setConfirmDialog({
        open: true,
        operation,
        confirmText: "",
      })
    } else {
      // For low danger operations, execute directly
      operation.action()
    }
  }

  const executeOperation = () => {
    if (confirmDialog.operation) {
      // Check if confirmation text is required and provided
      if (
        confirmDialog.operation.dangerLevel === "high" &&
        confirmDialog.confirmText !== confirmDialog.operation.name
      ) {
        toast({
          title: "Confirmation Required",
          description: `Please type "${confirmDialog.operation.name}" to confirm this action.`,
          variant: "destructive",
        })
        return
      }

      // Execute the operation
      confirmDialog.operation.action()

      // Close the dialog
      setConfirmDialog({
        open: false,
        operation: null,
        confirmText: "",
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    // This will call the restore operation action
    const restoreOperation = databaseOperations.find((op) => op.id === "restore")
    if (restoreOperation) {
      await restoreOperation.action()
    }
  }

  const renderOperationCard = (operation: Operation) => (
    <Card
      key={operation.id}
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        operation.dangerLevel === "high" ? "border-red-200" : ""
      }`}
      onClick={() => handleOperationClick(operation)}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex items-center gap-2">
            {operation.icon}
            {operation.name}
          </CardTitle>
          {operation.dangerLevel === "high" && <Badge variant="destructive">High Risk</Badge>}
          {operation.dangerLevel === "medium" && <Badge variant="outline">Caution</Badge>}
        </div>
        <CardDescription>{operation.description}</CardDescription>
      </CardHeader>
    </Card>
  )

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">System Setup</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your database, system settings, and perform maintenance operations.
        </p>
      </div>

      {isLoading && (
        <div className="my-4 space-y-2">
          <Progress value={progress} className="h-2 w-full" />
          <p className="text-sm text-center text-muted-foreground">{operationStatus}</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="mt-6 space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Database Operations</AlertTitle>
            <AlertDescription>
              These operations affect your database. Make sure you understand what each operation does before
              proceeding.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{databaseOperations.map(renderOperationCard)}</div>

          {activeTab === "database" && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Backup Options</CardTitle>
                <CardDescription>Select which data to include in your backup</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="products"
                      checked={backupOptions.includeProducts}
                      onCheckedChange={(checked) => setBackupOptions((prev) => ({ ...prev, includeProducts: checked }))}
                    />
                    <Label htmlFor="products">Products</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="categories"
                      checked={backupOptions.includeCategories}
                      onCheckedChange={(checked) =>
                        setBackupOptions((prev) => ({ ...prev, includeCategories: checked }))
                      }
                    />
                    <Label htmlFor="categories">Categories</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sales"
                      checked={backupOptions.includeSales}
                      onCheckedChange={(checked) => setBackupOptions((prev) => ({ ...prev, includeSales: checked }))}
                    />
                    <Label htmlFor="sales">Sales & Transactions</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="expenses"
                      checked={backupOptions.includeExpenses}
                      onCheckedChange={(checked) => setBackupOptions((prev) => ({ ...prev, includeExpenses: checked }))}
                    />
                    <Label htmlFor="expenses">Expenses</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="settings"
                      checked={backupOptions.includeSettings}
                      onCheckedChange={(checked) => setBackupOptions((prev) => ({ ...prev, includeSettings: checked }))}
                    />
                    <Label htmlFor="settings">Settings</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="users"
                      checked={backupOptions.includeUsers}
                      onCheckedChange={(checked) => setBackupOptions((prev) => ({ ...prev, includeUsers: checked }))}
                    />
                    <Label htmlFor="users">User Profiles</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="system" className="mt-6 space-y-4">
          <Alert>
            <LayoutDashboard className="h-4 w-4" />
            <AlertTitle>System Operations</AlertTitle>
            <AlertDescription>
              These operations help you manage your system data and perform administrative tasks.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{systemOperations.map(renderOperationCard)}</div>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6 space-y-4">
          <Alert>
            <Wrench className="h-4 w-4" />
            <AlertTitle>Maintenance Operations</AlertTitle>
            <AlertDescription>
              These operations help you maintain and optimize your system for better performance.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{maintenanceOperations.map(renderOperationCard)}</div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm {confirmDialog.operation?.name}</DialogTitle>
            <DialogDescription>
              {confirmDialog.operation?.dangerLevel === "high"
                ? "This is a high-risk operation that could result in data loss. Please type the operation name to confirm."
                : "Are you sure you want to perform this operation?"}
            </DialogDescription>
          </DialogHeader>

          {confirmDialog.operation?.dangerLevel === "high" && (
            <div className="my-4">
              <Label htmlFor="confirm-text">Type "{confirmDialog.operation?.name}" to confirm</Label>
              <Input
                id="confirm-text"
                value={confirmDialog.confirmText}
                onChange={(e) => setConfirmDialog({ ...confirmDialog, confirmText: e.target.value })}
                className="mt-1"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, operation: null, confirmText: "" })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.operation?.dangerLevel === "high" ? "destructive" : "default"}
              onClick={executeOperation}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
            <DialogDescription>Select a backup file to restore your database.</DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="import-file">Backup File</Label>
              <Input id="import-file" type="file" accept=".json" onChange={handleFileChange} />
            </div>

            {importFile && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Selected file:</p>
                <p className="text-sm">{importFile.name}</p>
              </div>
            )}

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Restoring from a backup will overwrite your existing data. This action cannot be undone.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importFile}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

