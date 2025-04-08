// Define the types for the revenue page
export interface Product {
    id: string
    name: string
    price: number
    purchase_price?: number
    category_id?: string
  }
  
  export interface SaleItem {
    id: string
    sale_id: string
    product_id: string
    quantity: number
    price: number
    discount?: number
    created_at?: string
    product?: Product
  }
  
  export interface Sale {
    id: string
    created_at: string
    total: number
    tax: number
    payment_method: string
    user_id?: string | null
    updated_at?: string | null
    items?: SaleItem[]
  }
  
  export interface Category {
    id: string
    name: string
  }
  
  export type PeriodOption =
    | "today"
    | "yesterday"
    | "last7days"
    | "last30days"
    | "thisMonth"
    | "lastMonth"
    | "thisYear"
    | "lastYear"
    | "custom"
  
  export interface DateRange {
    from: Date
    to: Date
  }
  
  export interface RevenueSummary {
    total: number
    totalToday?: number
    totalThisWeek?: number
    totalThisMonth?: number
    totalThisYear?: number
    comparisonWithPrevious?: number
    byPaymentMethod?: Record<string, number>
    byCategory?: Record<string, number>
    byProduct?: Record<string, { name: string; revenue: number; quantity: number }>
    byHourOfDay?: number[]
    byDayOfWeek?: number[]
    dailyRevenue?: Record<string, number>
    weeklyRevenue?: Record<string, number>
    monthlyRevenue?: Record<string, number>
    averageOrderValue?: number
    totalOrders?: number
    totalProfit?: number
    profitMargin?: number
    dailyData: { date: string; revenue: number; formattedDate?: string }[]
    weeklyData: { week: string; revenue: number; formattedWeek?: string }[]
    monthlyData: { month: string; revenue: number; formattedMonth?: string }[]
  }
  