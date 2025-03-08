export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          amount: number
          description: string
          category_id: string | null
          user_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          amount: number
          description: string
          category_id?: string | null
          user_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          amount?: number
          description?: string
          category_id?: string | null
          user_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string
          category_id: string | null
          id: string
          image: string | null
          min_stock: number
          name: string
          price: number
          purchase_price: number | null
          stock: number
          created_at?: string | null
        }
        Insert: {
          barcode: string
          category_id?: string | null
          id?: string
          image?: string | null
          min_stock?: number
          name: string
          price: number
          purchase_price?: number | null
          stock: number
          created_at?: string | null
        }
        Update: {
          barcode?: string
          category_id?: string | null
          id?: string
          image?: string | null
          min_stock?: number
          name?: string
          price?: number
          purchase_price?: number | null
          stock?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          price: number
          product_id: string
          quantity: number
          sale_id: string
        }
        Insert: {
          id?: string
          price: number
          product_id: string
          quantity: number
          sale_id: string
        }
        Update: {
          id?: string
          price?: number
          product_id?: string
          quantity?: number
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          payment_method: string
          tax: number | null
          total: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          payment_method: string
          tax?: number | null
          total: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          payment_method?: string
          tax?: number | null
          total?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          tax_rate: number
          store_name: string
          currency: string
        }
        Insert: {
          id?: string
          tax_rate: number
          store_name: string
          currency: string
        }
        Update: {
          id?: string
          tax_rate?: number
          store_name?: string
          currency?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_min_stock_for_product: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

