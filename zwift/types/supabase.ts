export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: string
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: string
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          price: number
          barcode: string
          stock: number
          min_stock: number
          purchase_price?: number | null
          category_id?: string | null
          image?: string | null
          created_at?: string | null
        }
        Insert: {
          id?: string
          name: string
          price: number
          barcode: string
          stock: number
          min_stock: number
          purchase_price?: number | null
          category_id?: string | null
          image?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          price?: number
          barcode?: string
          stock?: number
          min_stock?: number
          purchase_price?: number | null
          category_id?: string | null
          image?: string | null
          created_at?: string | null
        }
      }
      // Add other tables as needed
    }
    Functions: {
      decrement_stock: {
        Args: {
          row_id: number
          amount: number
        }
        Returns: number
      }
    }
  }
}

