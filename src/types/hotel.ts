import type { Person, ReceiptItem } from './meal'

interface Expense {
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
