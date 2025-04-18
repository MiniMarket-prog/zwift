export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      expenses: {
        Row: {
          id: string
          description: string
          amount: number
          category_id: string | null
          user_id?: string
          created_at?: string
          date?: string
        }
      }
      expense_categories: {
        Row: {
          id: string
          name: string
          created_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          customer_id: string | null
          total: number
          payment_method: string
          status?: string
          created_at: string
          updated_at?: string
          tax?: number | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          price: number
          stock: number
          barcode: string
          category_id: string | null
          image?: string
          purchase_price?: number
          expiry_date?: string
          expiry_notification_days?: number
          has_pack?: boolean
          pack_quantity?: number
          pack_discount_percentage?: number
          pack_barcode?: string
          pack_name?: string
          pack_id?: string
          is_pack?: boolean
          parent_product_id?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          created_at?: string
          updated_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          product_id: string
          sale_id: string
          quantity: number
          price: number
          product_name?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          username: string | null
          avatar_url: string | null
          website: string | null
          updated_at: string | null
        }
      }
      settings: {
        Row: {
          id: string
          type: string
          currency?: string
          tax_rate?: number
          store_name?: string
          settings?: Record<string, any>
        }
      }
      purchase_orders: {
        Row: {
          id: string
          order_number: string
          supplier_name: string
          status: "pending" | "approved" | "shipped" | "received" | "cancelled"
          total_amount: number
          expected_delivery_date?: string
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
