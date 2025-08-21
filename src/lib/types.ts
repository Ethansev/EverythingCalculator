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

export interface HotelNight {
  date: string
  participants: string[]
  cost: number
}

export interface HotelExpense extends Omit<Expense, 'items' | 'type'> {
  type: 'hotel'
  nights: HotelNight[]
  checkIn: string
  checkOut: string
}

export interface MealTotals {
  subtotal: number
  tax: number
  tip: number
  total: number
}

export interface SplitCalculation {
  personId: string
  subtotal: number
  tax: number
  tip: number
  total: number
  items: ExpenseItem[]
}