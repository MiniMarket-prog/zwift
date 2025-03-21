import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Database } from "lucide-react"
import PurchaseOrdersClient from "./PurchaseOrdersClient"

export const metadata: Metadata = {
  title: "Purchase Orders",
  description: "Manage your purchase orders",
}

export default async function PurchaseOrdersPage() {
  return (
    <div className="container mx-auto py-6">
      <PurchaseOrdersClient />
    </div>
  )
}

function DatabaseSetupRequired({ error }: { error?: any }) {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <Database className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Database Setup Required</h1>
        <p className="text-muted-foreground mb-6">
          The purchase orders tables need to be created in your database. Please run the SQL migration script to set up
          the required tables.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 w-full text-left">
            <h3 className="font-medium text-red-800 mb-1">Error Details:</h3>
            <pre className="text-xs text-red-700 whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
          </div>
        )}

        <div className="bg-muted p-4 rounded-md w-full mb-6 overflow-auto">
          <pre className="text-xs text-left">
            {`-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL,
  supplier_id UUID,
  supplier_name TEXT,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expected_delivery_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);`}
          </pre>
        </div>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/forecasting">Go to Forecasting</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

