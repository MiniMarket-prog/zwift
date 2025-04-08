import { createClient } from "./supabase-client3"
import { format } from "date-fns"

export interface OperatingExpenseCategory {
  id: string
  name: string
  description?: string
}

export interface OperatingExpense {
  id: string
  amount: number
  description: string
  category_id: string
  payment_date: string
  created_at: string
  updated_at?: string
  category?: OperatingExpenseCategory
}

export interface OperatingExpensesData {
  totalExpenses: number
  expensesByCategory: Record<string, number>
  expensesByDay: Record<string, number>
  expenses: OperatingExpense[]
}

export async function fetchOperatingExpenses(from: Date, to: Date): Promise<OperatingExpensesData> {
  const supabase = createClient()

  // Format dates for Supabase query
  const fromDate = from.toISOString().split("T")[0]
  const toDate = to.toISOString().split("T")[0] + " 23:59:59"

  try {
    // Fetch operating expenses for the period
    const { data: expensesData, error: expensesError } = await supabase
      .from("operating_expenses")
      .select(`
        id,
        amount,
        description,
        category_id,
        payment_date,
        created_at,
        updated_at
      `)
      .gte("payment_date", fromDate)
      .lte("payment_date", toDate)
      .order("payment_date", { ascending: false })

    if (expensesError) {
      console.error("Error fetching operating expenses:", expensesError)
      throw expensesError
    }

    // Fetch expense categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("operating_expense_categories")
      .select("id, name, description")

    if (categoriesError) {
      console.error("Error fetching operating expense categories:", categoriesError)
      throw categoriesError
    }

    // Create a map of category IDs to names
    const categoryMap = new Map<string, OperatingExpenseCategory>()
    categoriesData?.forEach((category: OperatingExpenseCategory) => {
      categoryMap.set(category.id, category)
    })

    // Initialize operating expenses data
    const operatingExpensesData: OperatingExpensesData = {
      totalExpenses: 0,
      expensesByCategory: {},
      expensesByDay: {},
      expenses: [],
    }

    // Process expenses
    const processedExpenses: OperatingExpense[] = (expensesData || []).map((expense: any) => {
      // Add to total expenses
      operatingExpensesData.totalExpenses += expense.amount

      // Get the day string for this expense
      const expenseDate = new Date(expense.payment_date)
      const dayStr = format(expenseDate, "yyyy-MM-dd")

      // Add to expenses by day
      if (!operatingExpensesData.expensesByDay[dayStr]) {
        operatingExpensesData.expensesByDay[dayStr] = 0
      }
      operatingExpensesData.expensesByDay[dayStr] += expense.amount

      // Add to expenses by category
      const categoryId = expense.category_id || "uncategorized"
      const category = categoryMap.get(categoryId)
      const categoryName = category ? category.name : "Uncategorized"

      if (!operatingExpensesData.expensesByCategory[categoryName]) {
        operatingExpensesData.expensesByCategory[categoryName] = 0
      }
      operatingExpensesData.expensesByCategory[categoryName] += expense.amount

      // Return the processed expense
      return {
        id: expense.id,
        amount: expense.amount,
        description: expense.description,
        category_id: expense.category_id,
        payment_date: expense.payment_date,
        created_at: expense.created_at,
        updated_at: expense.updated_at,
        category: category,
      }
    })

    // Store processed expenses
    operatingExpensesData.expenses = processedExpenses

    return operatingExpensesData
  } catch (error) {
    console.error("Error in fetchOperatingExpenses:", error)
    throw error
  }
}

export async function addOperatingExpense(
  expense: Omit<OperatingExpense, "id" | "created_at" | "updated_at">,
): Promise<OperatingExpense> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("operating_expenses").insert([expense]).select().single()

    if (error) throw error
    return data as OperatingExpense
  } catch (error) {
    console.error("Error adding operating expense:", error)
    throw error
  }
}

export async function getOperatingExpenseCategories(): Promise<OperatingExpenseCategory[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.from("operating_expense_categories").select("*").order("name")

    if (error) throw error
    return data as OperatingExpenseCategory[]
  } catch (error) {
    console.error("Error fetching operating expense categories:", error)
    throw error
  }
}
