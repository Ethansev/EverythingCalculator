import type { Person, ReceiptItem } from './meal'

export interface Expense {
  id: string
  title: string
  type: 'meal' | 'hotel' | 'general'
  subtotal: number
  tax: number
  tip: number
  total: number
  items: ReceiptItem[]
  participants: Person[]
  createdAt: Date
  updatedAt: Date
}

// For now, general expenses use the base Expense type
// This file can be extended with specific general expense types in the future
export type GeneralExpense = Expense
