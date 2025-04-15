// Define common types used throughout the application
export interface Product {
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
  
  export interface Category {
    id: string
    name: string
  }
  