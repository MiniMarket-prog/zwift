"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { getSuppliers } from "@/app/actions/suppliers"
import { CreateSupplierButton } from "./CreateSupplierButton"
import { EditSupplierDialog } from "./EditSupplierDialog"
import { DeleteSupplierDialog } from "./DeleteSupplierDialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Users, RefreshCw, Pencil, Trash2 } from "lucide-react"

// Define types
type Supplier = {
  id: string
  name: string
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string | null
}

export default function SuppliersClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dbSetupRequired, setDbSetupRequired] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  // Fetch suppliers
  const fetchSuppliers = async () => {
    setIsLoading(true)
    try {
      const result = await getSuppliers()

      if (result.error) {
        // Check if the error is about the table not existing
        if ((result.error as any)?.code === "42P01") {
          setDbSetupRequired(true)
        } else {
          throw result.error
        }
      } else {
        setSuppliers(result.data as Supplier[])
        setFilteredSuppliers(result.data as Supplier[])
        setDbSetupRequired(false)
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error)
      toast({
        title: "Error",
        description: "Failed to load suppliers",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchSuppliers()
  }, [])

  // Apply search filter
  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const filtered = suppliers.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(term) ||
          (supplier.contact_person && supplier.contact_person.toLowerCase().includes(term)) ||
          (supplier.email && supplier.email.toLowerCase().includes(term)) ||
          (supplier.phone && supplier.phone.toLowerCase().includes(term)),
      )
      setFilteredSuppliers(filtered)
    } else {
      setFilteredSuppliers(suppliers)
    }
  }, [suppliers, searchTerm])

  // Handle edit supplier
  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsEditDialogOpen(true)
  }

  // Handle delete supplier
  const handleDeleteSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsDeleteDialogOpen(true)
  }

  // If database setup is required, show the setup instructions
  if (dbSetupRequired) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Database Setup Required</CardTitle>
            <CardDescription>The suppliers table needs to be created in your database.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Please run the following SQL script in your Supabase SQL editor to create the necessary table:</p>
              <pre className="bg-slate-100 p-4 rounded-md overflow-x-auto text-sm">
                {`-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- Add supplier_id column to purchase_orders table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END
$$;`}
              </pre>
              <Button onClick={fetchSuppliers} className="mt-4">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage your suppliers for purchase orders</p>
        </div>
        <CreateSupplierButton onSupplierCreated={fetchSuppliers} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>All Suppliers</CardTitle>
              <CardDescription>View and manage your suppliers</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-[250px]"
              />
              <Button variant="outline" size="icon" onClick={fetchSuppliers}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredSuppliers.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Contact Person</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium">{supplier.name}</td>
                      <td className="px-4 py-3 text-sm">{supplier.contact_person || "—"}</td>
                      <td className="px-4 py-3 text-sm">{supplier.email || "—"}</td>
                      <td className="px-4 py-3 text-sm">{supplier.phone || "—"}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteSupplier(supplier)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No suppliers found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm ? "Try changing your search criteria" : "Create your first supplier to get started"}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              Showing {filteredSuppliers.length} of {suppliers.length} suppliers
            </p>
          </div>
        </CardFooter>
      </Card>

      {/* Edit Supplier Dialog */}
      {selectedSupplier && (
        <EditSupplierDialog
          supplier={selectedSupplier}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSupplierUpdated={fetchSuppliers}
        />
      )}

      {/* Delete Supplier Dialog */}
      {selectedSupplier && (
        <DeleteSupplierDialog
          supplier={selectedSupplier}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onSupplierDeleted={fetchSuppliers}
        />
      )}
    </div>
  )
}

