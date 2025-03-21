"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { deleteSupplier } from "@/app/actions/suppliers"
import { AlertTriangle } from "lucide-react"

interface Supplier {
  id: string
  name: string
}

interface DeleteSupplierDialogProps {
  supplier: Supplier
  open: boolean
  onOpenChange: (open: boolean) => void
  onSupplierDeleted: () => void
}

export function DeleteSupplierDialog({ supplier, open, onOpenChange, onSupplierDeleted }: DeleteSupplierDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const result = await deleteSupplier(supplier.id)

      if (result.success) {
        toast({
          title: "Supplier Deleted",
          description: `${supplier.name} has been removed`,
        })
        onOpenChange(false)
        onSupplierDeleted()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete supplier",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting supplier:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Supplier
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-medium">{supplier.name}</span>?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. This will permanently delete the supplier and remove it from our servers.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Supplier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

