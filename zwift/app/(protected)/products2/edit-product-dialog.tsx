"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface Product {
  id: string
  name: string
  price: number
  barcode: string
  stock: number
  min_stock: number
  image?: string
  category_id?: string
  purchase_price?: number
  expiry_date?: string
  expiry_notification_days?: number
  has_pack?: boolean
  pack_quantity?: number
  pack_discount_percentage?: number
  pack_barcode?: string
  pack_name?: string
  pack_id?: string
}

interface Category {
  id: string
  name: string
}

interface EditProductDialogProps {
  product: Product
  categories: Category[]
}

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Product name must be at least 2 characters.",
  }),
  price: z.number(),
  barcode: z.string(),
  stock: z.number(),
  min_stock: z.number(),
  category_id: z.string(),
  purchase_price: z.number(),
  expiry_date: z.date().optional(),
  expiry_notification_days: z.number().optional(),
  has_pack: z.boolean().optional(),
  pack_quantity: z.number().optional(),
  pack_discount_percentage: z.number().optional(),
  pack_barcode: z.string().optional(),
  pack_name: z.string().optional(),
  pack_id: z.string().optional(),
})

export function EditProductDialog({ product, categories }: EditProductDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product.name,
      price: product.price,
      barcode: product.barcode,
      stock: product.stock,
      min_stock: product.min_stock,
      category_id: product.category_id || "",
      purchase_price: product.purchase_price || 0,
      expiry_date: product.expiry_date ? new Date(product.expiry_date) : undefined,
      expiry_notification_days: product.expiry_notification_days || 0,
      has_pack: product.has_pack || false,
      pack_quantity: product.pack_quantity || 0,
      pack_discount_percentage: product.pack_discount_percentage || 0,
      pack_barcode: product.pack_barcode || "",
      pack_name: product.pack_name || "",
      pack_id: product.pack_id || "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const supabase = createClientComponentClient()

    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: values.name,
          price: values.price,
          barcode: values.barcode,
          stock: values.stock,
          min_stock: values.min_stock,
          category_id: values.category_id,
          purchase_price: values.purchase_price,
          expiry_date: values.expiry_date?.toISOString() || null,
          expiry_notification_days: values.expiry_notification_days,
          has_pack: values.has_pack,
          pack_quantity: values.pack_quantity,
          pack_discount_percentage: values.pack_discount_percentage,
          pack_barcode: values.pack_barcode,
          pack_name: values.pack_name,
          pack_id: values.pack_id,
        })
        .eq("id", product.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Product updated successfully.",
      })
      setOpen(false)
    } catch (error: unknown) {
      console.error("Error updating product:", error)
      toast({
        title: "Error",
        description: "Failed to update product.",
        variant: "destructive",
      })
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Edit</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Product</AlertDialogTitle>
          <AlertDialogDescription>
            Make changes to your product here. Click save when you're done.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Product name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode</FormLabel>
                  <FormControl>
                    <Input placeholder="Barcode" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="min_stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Stock</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purchase_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Price</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiry_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiry Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiry_notification_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Notification Days</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="has_pack"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Has Pack</FormLabel>
                    <FormDescription>Enable this if the product has a pack.</FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            {form.watch("has_pack") && (
              <>
                <FormField
                  control={form.control}
                  name="pack_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pack Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pack_discount_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pack Discount Percentage</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pack_barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pack Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Pack Barcode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pack_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pack Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Pack Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction type="submit">Save</AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

import { Checkbox } from "@/components/ui/checkbox"
import { FormDescription } from "@/components/ui/form"
