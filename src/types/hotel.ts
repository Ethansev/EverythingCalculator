import type { Expense } from './common'

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