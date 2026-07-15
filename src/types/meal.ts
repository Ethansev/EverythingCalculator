export interface Person {
  id: string
  name: string
  color: string
}

export interface ReceiptItem {
  id: string
  name: string
  price: number
  assignedTo: string[]
  // personId -> dollars. When present, overrides the equal split. The editor
  // guarantees keys === assignedTo and values sum to price; the engine
  // re-checks and falls back to an equal split if the invariant is broken.
  exactSplits?: Record<string, number>
}

export type ChargeKind = 'tax' | 'tip' | 'gratuity' | 'discount'

export type ChargeMode = 'percent' | 'amount'

export interface Charge {
  id: string
  kind: ChargeKind
  label: string
  mode: ChargeMode
  // percent value (of the item subtotal) or dollars; discounts entered positive
  value: number
}

// ---------------------------------------------------------------------------
// Legacy types — still referenced by components that are migrated in later
// tasks. Deleted in Task 7. Do not use in new code.
// ---------------------------------------------------------------------------

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
