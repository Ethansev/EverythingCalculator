import type { Charge, ChargeKind, ReceiptItem } from '@/types/meal'
import { allocateCents } from './splitCalculations'

export interface ScannedItem {
  name: string
  price: number
  quantity: number
}

export interface ScannedReceipt {
  items: ScannedItem[]
  tax: number | null
  tip: number | null
  gratuity: number | null
  discount: number | null
  total: number | null
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Returns the amount, null when absent, or undefined when present but invalid.
function nullableAmount(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return undefined
}

export function parseScannedReceipt(value: unknown): ScannedReceipt | null {
  if (!isRecord(value)) return null
  const rawItems = value.items
  if (!Array.isArray(rawItems)) return null
  const items: ScannedItem[] = []
  for (const raw of rawItems) {
    if (!isRecord(raw)) return null
    const { name, price, quantity } = raw
    if (typeof name !== 'string' || name.trim() === '') return null
    if (typeof price !== 'number' || !Number.isFinite(price)) return null
    const validQuantity =
      typeof quantity === 'number' && Number.isInteger(quantity) && quantity >= 1
    items.push({ name: name.trim(), price, quantity: validQuantity ? quantity : 1 })
  }
  const tax = nullableAmount(value.tax)
  const tip = nullableAmount(value.tip)
  const gratuity = nullableAmount(value.gratuity)
  const discount = nullableAmount(value.discount)
  const total = nullableAmount(value.total)
  if (
    tax === undefined ||
    tip === undefined ||
    gratuity === undefined ||
    discount === undefined ||
    total === undefined
  ) {
    return null
  }
  return { items, tax, tip, gratuity, discount, total }
}

/**
 * Expand scanned lines into per-unit ReceiptItems so different people can take
 * individual units ("2x Beer $13.00" becomes two $6.50 Beers).
 */
export function scannedItemsToReceiptItems(
  items: ScannedItem[],
  makeId: () => string
): ReceiptItem[] {
  const result: ReceiptItem[] = []
  for (const item of items) {
    const unitCents = allocateCents(
      Math.round(item.price * 100),
      Array.from({ length: item.quantity }, () => 1)
    )
    for (const cents of unitCents) {
      result.push({
        id: makeId(),
        name: item.name,
        price: cents / 100,
        assignedTo: [],
      })
    }
  }
  return result
}

export function scannedChargesToCharges(
  scan: ScannedReceipt,
  makeId: () => string
): Charge[] {
  const fields: { kind: ChargeKind; label: string; value: number | null }[] = [
    { kind: 'tax', label: 'Tax', value: scan.tax },
    { kind: 'tip', label: 'Tip', value: scan.tip },
    { kind: 'gratuity', label: 'Gratuity', value: scan.gratuity },
    { kind: 'discount', label: 'Discount', value: scan.discount },
  ]
  const charges: Charge[] = []
  for (const field of fields) {
    if (typeof field.value === 'number' && field.value !== 0) {
      charges.push({
        id: makeId(),
        kind: field.kind,
        label: field.label,
        mode: 'amount',
        value: Math.abs(field.value),
      })
    }
  }
  return charges
}
