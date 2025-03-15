import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get("id")

  if (!productId) {
    return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
  }

  try {
    const supabase = createClient()

    // Query the database directly to see what's stored
    const { data, error } = await supabase.from("products").select("*").eq("id", productId).single()

    if (error) {
      console.error("Error fetching product:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Return the raw data from the database
    return NextResponse.json({
      message: "Product data retrieved directly from database",
      product: data,
      expiry_date: data.expiry_date,
      expiry_date_type: typeof data.expiry_date,
    })
  } catch (error) {
    console.error("Exception in check-product route:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

