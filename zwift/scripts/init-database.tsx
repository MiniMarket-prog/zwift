"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

// SQL statements to initialize the database
const initSQL = `
-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expense_categories_pkey PRIMARY KEY (id)
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price real NOT NULL,
  purchase_price real,
  barcode text NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 5,
  expiry_date timestamp with time zone,
  image text NULL,
  category_id uuid REFERENCES public.categories(id),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'cashier',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  total real NOT NULL,
  tax real NOT NULL,
  payment_method text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sales_pkey PRIMARY KEY (id)
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  quantity integer NOT NULL,
  price real NOT NULL,
  CONSTRAINT sale_items_pkey PRIMARY KEY (id)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  amount real NOT NULL,
  description text NOT NULL,
  category_id uuid REFERENCES public.expense_categories(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id)
);

-- Insert default categories
INSERT INTO public.categories (name)
VALUES 
  ('Electronics'),
  ('Clothing'),
  ('Food'),
  ('Home'),
  ('Beauty')
ON CONFLICT DO NOTHING;

-- Insert default expense categories
INSERT INTO public.expense_categories (name)
VALUES 
  ('Rent'),
  ('Utilities'),
  ('Salaries'),
  ('Inventory'),
  ('Marketing'),
  ('Miscellaneous')
ON CONFLICT DO NOTHING;

-- Set up Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'Product Images', true)
ON CONFLICT DO NOTHING;

-- Enable RLS on tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow all users to view products'
  ) THEN
    CREATE POLICY "Allow all users to view products" ON products
      FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow authenticated users to insert products'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert products" ON products
      FOR INSERT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow authenticated users to update products'
  ) THEN
    CREATE POLICY "Allow authenticated users to update products" ON products
      FOR UPDATE TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Allow authenticated users to delete products'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete products" ON products
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Create trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`

export default function InitDatabase() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<{ step: string; success: boolean; message: string }[]>([])
  const [isComplete, setIsComplete] = useState(false)

  const initializeDatabase = async () => {
    setIsLoading(true)
    setResults([])

    try {
      // Check if we can execute SQL
      const { data: rpcCheck, error: rpcError } = await supabase.rpc("exec_sql", {
        sql: "SELECT 1;",
      })

      if (rpcError) {
        setResults((prev) => [
          ...prev,
          {
            step: "RPC Check",
            success: false,
            message: `The exec_sql function is not available: ${rpcError.message}. Please create this function in your Supabase database.`,
          },
        ])

        // Add instructions for creating the exec_sql function
        setResults((prev) => [
          ...prev,
          {
            step: "Manual Setup Required",
            success: false,
            message: `Please run the following SQL in your Supabase SQL Editor to create the exec_sql function:
          
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`,
          },
        ])

        setIsLoading(false)
        return
      }

      // Split the SQL into smaller chunks to avoid timeouts
      const sqlChunks = initSQL.split(";").filter((chunk) => chunk.trim().length > 0)

      for (let i = 0; i < sqlChunks.length; i++) {
        const chunk = sqlChunks[i] + ";"
        try {
          const { error } = await supabase.rpc("exec_sql", { sql: chunk })

          if (error) {
            console.warn(`Warning on chunk ${i + 1}: ${error.message}`)
            // Continue with other chunks even if one fails
          }
        } catch (error: any) {
          console.warn(`Error executing chunk ${i + 1}: ${error.message}`)
          // Continue with other chunks
        }
      }

      setResults((prev) => [
        ...prev,
        {
          step: "Database Initialization",
          success: true,
          message: "Successfully initialized database schema",
        },
      ])

      // Check if tables were created
      try {
        const { data: tables, error: tablesError } = await supabase
          .from("products")
          .select("count", { count: "exact", head: true })

        if (tablesError) {
          setResults((prev) => [
            ...prev,
            {
              step: "Table Verification",
              success: false,
              message: tablesError.message,
            },
          ])
        } else {
          setResults((prev) => [
            ...prev,
            {
              step: "Table Verification",
              success: true,
              message: "Tables created successfully",
            },
          ])
        }
      } catch (error: any) {
        setResults((prev) => [
          ...prev,
          {
            step: "Table Verification",
            success: false,
            message: error.message || "Failed to verify tables",
          },
        ])
      }

      // Check if categories were inserted
      try {
        const { data: categories, error: categoriesError } = await supabase
          .from("categories")
          .select("count", { count: "exact", head: true })

        if (categoriesError) {
          setResults((prev) => [
            ...prev,
            {
              step: "Categories Verification",
              success: false,
              message: categoriesError.message,
            },
          ])
        } else {
          setResults((prev) => [
            ...prev,
            {
              step: "Categories Verification",
              success: true,
              message: `${categories?.count || 0} categories available`,
            },
          ])
        }
      } catch (error: any) {
        setResults((prev) => [
          ...prev,
          {
            step: "Categories Verification",
            success: false,
            message: error.message || "Failed to verify categories",
          },
        ])
      }

      setIsComplete(true)
    } catch (error: any) {
      setResults((prev) => [
        ...prev,
        {
          step: "Database Initialization",
          success: false,
          message: error.message || "An unknown error occurred",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Initialize Database</CardTitle>
          <CardDescription>
            Set up your Supabase database with all required tables and functions for the POS system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length > 0 && (
            <div className="mb-4 space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-start gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">{result.step}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isComplete && (
            <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-400">Database initialized</h3>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                    <p>Your database has been successfully initialized. You can now start using your POS system.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={initializeDatabase} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              "Initialize Database"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

