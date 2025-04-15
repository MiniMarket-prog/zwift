import { createClient } from "@/lib/supabase-client"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const searchQuery = url.searchParams.get("search") || ""
    const categoryId = url.searchParams.get("category") || ""

    const supabase = createClient()
    let query = supabase.from("products").select("*")

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`)
    }

    if (categoryId && categoryId !== "all") {
      query = query.eq("category_id", categoryId)
    }

    const { data, error } = await query.order("name")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createClient()

    const { data, error } = await supabase.from("products").insert(body).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
