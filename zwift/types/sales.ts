export interface SaleItem {
    id: string
    product_id: string
    quantity: number
    price: number
    sale_id: string
    created_at: string
  }
  
  export interface Sale {
    id: string
    created_at: string
    total: number
    sale_items: SaleItem[]
  }
  