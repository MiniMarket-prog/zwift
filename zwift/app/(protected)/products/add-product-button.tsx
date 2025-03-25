"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import { AddProductDialog } from "./add-product-dialog"

interface Category {
  id: string
  name: string
}

export function AddProductButton({ categories }: { categories: Category[] }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)}>
        <PlusIcon className="h-4 w-4 mr-2" />
        Add Product
      </Button>

      {isDialogOpen && <AddProductDialog categories={categories} onClose={() => setIsDialogOpen(false)} />}
    </>
  )
}

