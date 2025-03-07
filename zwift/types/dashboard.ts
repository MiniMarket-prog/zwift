export interface DashboardStats {
    totalRevenue: number
    productsCount: number
    customersCount: number
    salesCount: number
    lowStockCount: number
    lowStockProducts: any[] // Ideally, this should be a proper type
  }
  
  