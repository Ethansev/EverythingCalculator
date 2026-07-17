import type { Person, ReceiptItem, Charge, ChargeKind } from '@/types/meal'

export interface ItemShare {
  itemId: string
  itemName: string
  amount: number
  isCustom: boolean
  shareCount: number
}

export interface ChargeShare {
  chargeId: string
  kind: ChargeKind
  label: string
  amount: number
}

export interface PersonBreakdown {
  personId: string
  itemShares: ItemShare[]
  subtotal: number
  chargeShares: ChargeShare[]
  total: number
}

export interface SplitResult {
  perPerson: PersonBreakdown[]
  subtotal: number
  charges: ChargeShare[]
  grandTotal: number
}

const toCents = (dollars: number): number => Math.round(dollars * 100)
const toDollars = (cents: number): number => cents / 100

/**
 * Split totalCents across recipients proportionally to weights using the
 * largest-remainder method. The returned parts always sum exactly to
 * totalCents. All-zero weights fall back to an equal split. Negative totals
 * (discounts) are allocated on the absolute value and negated.
 */
export function allocateCents(totalCents: number, weights: number[]): number[] {
  if (weights.length === 0) return []
  const sign = totalCents < 0 ? -1 : 1
  const total = Math.abs(totalCents)
  const weightSum = weights.reduce((sum, w) => sum + w, 0)
  const effectiveWeights = weightSum > 0 ? weights : weights.map(() => 1)
  const effectiveSum = weightSum > 0 ? weightSum : weights.length
  const raw = effectiveWeights.map((w) => (total * w) / effectiveSum)
  const parts = raw.map(Math.floor)
  const remainder = total - parts.reduce((sum, p) => sum + p, 0)
  const byRemainder = raw
    .map((r, index) => ({ frac: r - Math.floor(r), index }))
    .sort((x, y) => y.frac - x.frac || x.index - y.index)
  for (let k = 0; k < remainder; k++) {
    parts[byRemainder[k].index] += 1
  }
  return parts.map((p) => p * sign)
}

function exactSplitCents(
  item: ReceiptItem,
  assignees: string[],
  priceCents: number
): number[] | null {
  const exact = item.exactSplits
  if (!exact) return null
  if (Object.keys(exact).length !== assignees.length) return null
  const cents: number[] = []
  for (const personId of assignees) {
    const value = exact[personId]
    if (typeof value !== 'number' || !Number.isFinite(value)) return null
    cents.push(toCents(value))
  }
  if (cents.reduce((sum, c) => sum + c, 0) !== priceCents) return null
  return cents
}

export function calculateSplit(
  items: ReceiptItem[],
  charges: Charge[],
  people: Person[]
): SplitResult {
  const personIds = people.map((p) => p.id)
  const known = new Set(personIds)
  const itemSharesByPerson = new Map<string, ItemShare[]>()
  const subtotalCentsByPerson = new Map<string, number>()
  const chargeSharesByPerson = new Map<string, ChargeShare[]>()
  for (const id of personIds) {
    itemSharesByPerson.set(id, [])
    subtotalCentsByPerson.set(id, 0)
    chargeSharesByPerson.set(id, [])
  }

  let subtotalCents = 0
  for (const item of items) {
    const priceCents = toCents(item.price)
    subtotalCents += priceCents
    const assignees = item.assignedTo.filter((id) => known.has(id))
    if (assignees.length === 0) continue
    const exact = exactSplitCents(item, assignees, priceCents)
    const shares = exact ?? allocateCents(priceCents, assignees.map(() => 1))
    assignees.forEach((personId, index) => {
      subtotalCentsByPerson.set(
        personId,
        (subtotalCentsByPerson.get(personId) ?? 0) + shares[index]
      )
      itemSharesByPerson.get(personId)?.push({
        itemId: item.id,
        itemName: item.name,
        amount: toDollars(shares[index]),
        isCustom: exact !== null,
        shareCount: assignees.length,
      })
    })
  }

  const resolvedCharges: ChargeShare[] = []
  let chargesCents = 0
  for (const charge of charges) {
    const targetIds = (charge.appliesTo ?? []).filter((id) => known.has(id))
    const isTargeted = targetIds.length > 0
    // Fall back to everyone when untargeted or every target was removed —
    // a charge must never vanish from the totals.
    const eligibleIds = isTargeted ? targetIds : personIds
    const groupSubtotalCents = eligibleIds.reduce(
      (sum, id) => sum + (subtotalCentsByPerson.get(id) ?? 0),
      0
    )
    const percentBaseCents = isTargeted ? groupSubtotalCents : subtotalCents
    const magnitudeCents =
      charge.mode === 'percent'
        ? Math.round((percentBaseCents * charge.value) / 100)
        : toCents(charge.value)
    const signedCents = charge.kind === 'discount' ? -magnitudeCents : magnitudeCents
    chargesCents += signedCents
    resolvedCharges.push({
      chargeId: charge.id,
      kind: charge.kind,
      label: charge.label,
      amount: toDollars(signedCents),
    })
    const eligibleWeights = eligibleIds.map(
      (id) => subtotalCentsByPerson.get(id) ?? 0
    )
    const allocation = allocateCents(signedCents, eligibleWeights)
    const centsByPerson = new Map(eligibleIds.map((id, index) => [id, allocation[index]]))
    personIds.forEach((personId) => {
      chargeSharesByPerson.get(personId)?.push({
        chargeId: charge.id,
        kind: charge.kind,
        label: charge.label,
        amount: toDollars(centsByPerson.get(personId) ?? 0),
      })
    })
  }

  const perPerson: PersonBreakdown[] = personIds.map((personId) => {
    const personSubtotalCents = subtotalCentsByPerson.get(personId) ?? 0
    const chargeShares = chargeSharesByPerson.get(personId) ?? []
    const chargeCents = chargeShares.reduce((sum, c) => sum + toCents(c.amount), 0)
    return {
      personId,
      itemShares: itemSharesByPerson.get(personId) ?? [],
      subtotal: toDollars(personSubtotalCents),
      chargeShares,
      total: toDollars(personSubtotalCents + chargeCents),
    }
  })

  return {
    perPerson,
    subtotal: toDollars(subtotalCents),
    charges: resolvedCharges,
    grandTotal: toDollars(subtotalCents + chargesCents),
  }
}
