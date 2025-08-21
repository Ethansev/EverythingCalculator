export interface Person {
  id: string
  name: string
  color: string
}

export interface ExpenseItem {
  id: string
  name: string
  price: number
  assignedTo: string[]
  category?: string
}

export interface MealTotals {
  subtotal: number
  tax: number
  tip: number
  total: number
}