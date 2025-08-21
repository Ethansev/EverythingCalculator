import type { Person, ExpenseItem } from './meal'

export interface Expense {
  id: string
  title: string
  type: 'meal' | 'hotel' | 'general'
  subtotal: number
  tax: number
  tip: number
  total: number
  items: ExpenseItem[]
  participants: Person[]
  createdAt: Date
  updatedAt: Date
}

export interface SplitCalculation {
  personId: string
  subtotal: number
  tax: number
  tip: number
  total: number
  items: ExpenseItem[]
}