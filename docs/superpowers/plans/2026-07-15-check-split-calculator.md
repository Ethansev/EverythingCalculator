# Check-Splitting Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/meal` into a real group check-splitting calculator: scan a receipt with Claude vision (or start from scratch), assign items to people with equal-or-exact splits, and allocate tax/tip/gratuity/discount proportionally with penny-exact math.

**Architecture:** A pure money engine (`splitCalculations.ts`, integer cents, largest-remainder rounding) and pure scan-parsing utilities (`receiptScan.ts`) carry all logic and are unit-tested with vitest. A thin Next.js API route (`/api/scan-receipt`) calls Claude Haiku 4.5 with structured outputs. The existing 5-step wizard UI is upgraded in place, component by component, staying compilable after every task.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 6, Tailwind 4, @dnd-kit, `@anthropic-ai/sdk` (new), vitest (new).

**Spec:** `docs/superpowers/specs/2026-07-15-check-split-design.md`

## Global Constraints

- **Never use `as` type assertions** (user rule, from `~/.claude/CLAUDE.md`). Avoid `as const` too. Type predicates (`(x): x is T =>`) are fine and used deliberately.
- **Commits:** user is sole author — never add a Co-Authored-By line or any Claude attribution. Message style matches repo history: short past-tense sentence ending with a period (e.g. "Added the money engine.").
- **Package manager:** npm. All installs modify `package.json` + `package-lock.json`.
- **Model:** `claude-haiku-4-5` via `@anthropic-ai/sdk`. API key comes from `ANTHROPIC_API_KEY` server env var only — never expose it client-side, never commit it.
- **Every task must end green:** `npm run check-all` passes (after Task 1 that means type-check → lint → test → build).
- **Lint rules that bite here (Next 16 / eslint-config-next 16):** never define a React component inside another component's body (hoist to module scope); never compute derived state via `setState` inside `useEffect` (compute during render).
- Money values are dollars (floats) at component/type boundaries and integer cents inside the engine.
- IDs for new entities use `crypto.randomUUID()` in app code; pure utils take a `makeId: () => string` parameter so tests stay deterministic.

---

### Task 1: Data model, vitest setup, and the money engine

**Files:**
- Modify: `src/types/meal.ts`
- Create: `vitest.config.ts`
- Create: `src/utils/meal/splitCalculations.ts`
- Test: `src/utils/meal/splitCalculations.test.ts`
- Modify: `package.json` (scripts + devDependency)

**Interfaces:**
- Consumes: nothing (foundation task).
- Produces (later tasks import these exact names):
  - From `@/types/meal`: `Person` (unchanged), `ReceiptItem`, `ChargeKind`, `ChargeMode`, `Charge`. `ExpenseItem` and `MealTotals` are kept temporarily (deleted in Task 7).
  - From `@/utils/meal/splitCalculations`: `allocateCents(totalCents: number, weights: number[]): number[]`, `calculateSplit(items: ReceiptItem[], charges: Charge[], people: Person[]): SplitResult`, and types `ItemShare`, `ChargeShare`, `PersonBreakdown`, `SplitResult`.

- [ ] **Step 1: Install vitest and wire scripts**

```bash
npm install --save-dev vitest
```

In `package.json`, change the scripts block to:

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "type-check": "tsc --noEmit",
  "test": "vitest run",
  "check-all": "npm run type-check && npm run lint && npm run test && npm run build"
},
```

Create `vitest.config.ts` at the repo root:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 2: Update the types**

Replace the entire contents of `src/types/meal.ts` with:

```ts
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
```

- [ ] **Step 3: Write the failing tests**

Create `src/utils/meal/splitCalculations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { allocateCents, calculateSplit } from "./splitCalculations";
import type { Person, ReceiptItem, Charge } from "@/types/meal";

const people: Person[] = [
  { id: "a", name: "Alice", color: "#111111" },
  { id: "b", name: "Bob", color: "#222222" },
  { id: "c", name: "Cara", color: "#333333" },
];

function item(overrides: Partial<ReceiptItem> & { id: string }): ReceiptItem {
  return { name: "Item", price: 0, assignedTo: [], ...overrides };
}

describe("allocateCents", () => {
  it("splits evenly when divisible", () => {
    expect(allocateCents(900, [1, 1, 1])).toEqual([300, 300, 300]);
  });

  it("distributes remainder pennies by largest remainder, earliest index first on ties", () => {
    expect(allocateCents(1000, [1, 1, 1])).toEqual([334, 333, 333]);
  });

  it("allocates proportionally to weights", () => {
    expect(allocateCents(1000, [3, 1])).toEqual([750, 250]);
  });

  it("falls back to equal weights when all weights are zero", () => {
    expect(allocateCents(1000, [0, 0, 0])).toEqual([334, 333, 333]);
  });

  it("handles negative totals (discounts)", () => {
    expect(allocateCents(-1000, [1, 1, 1])).toEqual([-334, -333, -333]);
  });

  it("returns [] for no recipients", () => {
    expect(allocateCents(1000, [])).toEqual([]);
  });

  it("always sums exactly to the total", () => {
    const weightSets = [
      [1, 1, 1],
      [7, 3, 13],
      [0, 0, 0],
      [1],
      [2, 5],
      [1, 1, 1, 1, 1, 1, 1],
    ];
    const totals = [1, 99, 100, 101, 12345, 100000, -777];
    for (const weights of weightSets) {
      for (const total of totals) {
        const parts = allocateCents(total, weights);
        expect(parts.reduce((s, p) => s + p, 0)).toBe(total);
      }
    }
  });
});

describe("calculateSplit", () => {
  it("splits a shared item equally with penny-exact shares", () => {
    const items = [item({ id: "i1", price: 10, assignedTo: ["a", "b", "c"] })];
    const result = calculateSplit(items, [], people);
    const amounts = result.perPerson.map((p) => p.subtotal);
    expect(amounts).toEqual([3.34, 3.33, 3.33]);
    expect(result.subtotal).toBe(10);
    expect(result.grandTotal).toBe(10);
  });

  it("uses exact splits when valid", () => {
    const items = [
      item({
        id: "i1",
        price: 10,
        assignedTo: ["a", "b"],
        exactSplits: { a: 7.5, b: 2.5 },
      }),
    ];
    const result = calculateSplit(items, [], people);
    expect(result.perPerson[0].subtotal).toBe(7.5);
    expect(result.perPerson[1].subtotal).toBe(2.5);
    expect(result.perPerson[0].itemShares[0].isCustom).toBe(true);
  });

  it("falls back to equal split when exact splits do not sum to the price", () => {
    const items = [
      item({
        id: "i1",
        price: 10,
        assignedTo: ["a", "b"],
        exactSplits: { a: 9, b: 2 },
      }),
    ];
    const result = calculateSplit(items, [], people);
    expect(result.perPerson[0].subtotal).toBe(5);
    expect(result.perPerson[1].subtotal).toBe(5);
    expect(result.perPerson[0].itemShares[0].isCustom).toBe(false);
  });

  it("falls back to equal split when exact split keys do not match assignees", () => {
    const items = [
      item({
        id: "i1",
        price: 10,
        assignedTo: ["a", "b"],
        exactSplits: { a: 10 },
      }),
    ];
    const result = calculateSplit(items, [], people);
    expect(result.perPerson[0].subtotal).toBe(5);
    expect(result.perPerson[1].subtotal).toBe(5);
  });

  it("allocates charges proportionally to item subtotals", () => {
    const items = [
      item({ id: "i1", price: 30, assignedTo: ["a"] }),
      item({ id: "i2", price: 10, assignedTo: ["b"] }),
    ];
    const charges: Charge[] = [
      { id: "t1", kind: "tax", label: "Tax", mode: "amount", value: 4 },
    ];
    const result = calculateSplit(items, charges, people);
    expect(result.perPerson[0].chargeShares[0].amount).toBe(3);
    expect(result.perPerson[1].chargeShares[0].amount).toBe(1);
    expect(result.perPerson[2].chargeShares[0].amount).toBe(0);
    expect(result.grandTotal).toBe(44);
  });

  it("computes percent charges on the item subtotal", () => {
    const items = [item({ id: "i1", price: 50, assignedTo: ["a", "b"] })];
    const charges: Charge[] = [
      { id: "tip", kind: "tip", label: "Tip", mode: "percent", value: 20 },
    ];
    const result = calculateSplit(items, charges, people);
    expect(result.charges[0].amount).toBe(10);
    expect(result.grandTotal).toBe(60);
  });

  it("applies discounts negatively", () => {
    const items = [item({ id: "i1", price: 20, assignedTo: ["a"] })];
    const charges: Charge[] = [
      { id: "d1", kind: "discount", label: "Discount", mode: "amount", value: 5 },
    ];
    const result = calculateSplit(items, charges, people);
    expect(result.charges[0].amount).toBe(-5);
    expect(result.grandTotal).toBe(15);
    expect(result.perPerson[0].total).toBe(15);
  });

  it("gives a person with no items $0 of everything", () => {
    const items = [item({ id: "i1", price: 20, assignedTo: ["a"] })];
    const charges: Charge[] = [
      { id: "t1", kind: "tip", label: "Tip", mode: "percent", value: 20 },
    ];
    const result = calculateSplit(items, charges, people);
    const bob = result.perPerson[1];
    expect(bob.subtotal).toBe(0);
    expect(bob.total).toBe(0);
    expect(bob.chargeShares[0].amount).toBe(0);
  });

  it("splits charges evenly by headcount when the subtotal is zero", () => {
    const charges: Charge[] = [
      { id: "t1", kind: "gratuity", label: "Gratuity", mode: "amount", value: 9 },
    ];
    const result = calculateSplit([], charges, people);
    expect(result.perPerson.map((p) => p.total)).toEqual([3, 3, 3]);
    expect(result.grandTotal).toBe(9);
  });

  it("per-person totals always sum to the grand total (invariant sweep)", () => {
    const items: ReceiptItem[] = [
      item({ id: "i1", price: 12.5, assignedTo: ["a"] }),
      item({ id: "i2", price: 18.95, assignedTo: ["a", "b"] }),
      item({ id: "i3", price: 16.75, assignedTo: ["b", "c"] }),
      item({ id: "i4", price: 6.5, assignedTo: ["a", "b", "c"] }),
      item({
        id: "i5",
        price: 8.0,
        assignedTo: ["a", "c"],
        exactSplits: { a: 5.25, c: 2.75 },
      }),
      item({ id: "i6", price: 7.25, assignedTo: ["c"] }),
    ];
    const charges: Charge[] = [
      { id: "c1", kind: "tax", label: "Tax", mode: "amount", value: 6.13 },
      { id: "c2", kind: "tip", label: "Tip", mode: "percent", value: 18 },
      { id: "c3", kind: "gratuity", label: "Service", mode: "amount", value: 4.99 },
      { id: "c4", kind: "discount", label: "Coupon", mode: "amount", value: 3.33 },
    ];
    const result = calculateSplit(items, charges, people);
    const sumOfTotals = result.perPerson.reduce((s, p) => s + p.total, 0);
    expect(Math.round(sumOfTotals * 100)).toBe(Math.round(result.grandTotal * 100));
    const sumOfSubtotals = result.perPerson.reduce((s, p) => s + p.subtotal, 0);
    expect(Math.round(sumOfSubtotals * 100)).toBe(Math.round(result.subtotal * 100));
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run src/utils/meal/splitCalculations.test.ts`
Expected: FAIL — cannot resolve `./splitCalculations`.

- [ ] **Step 5: Implement the engine**

Create `src/utils/meal/splitCalculations.ts`:

```ts
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
  const weights = personIds.map((id) => subtotalCentsByPerson.get(id) ?? 0)
  for (const charge of charges) {
    const magnitudeCents =
      charge.mode === 'percent'
        ? Math.round((subtotalCents * charge.value) / 100)
        : toCents(charge.value)
    const signedCents = charge.kind === 'discount' ? -magnitudeCents : magnitudeCents
    chargesCents += signedCents
    resolvedCharges.push({
      chargeId: charge.id,
      kind: charge.kind,
      label: charge.label,
      amount: toDollars(signedCents),
    })
    const allocation = allocateCents(signedCents, weights)
    personIds.forEach((personId, index) => {
      chargeSharesByPerson.get(personId)?.push({
        chargeId: charge.id,
        kind: charge.kind,
        label: charge.label,
        amount: toDollars(allocation[index]),
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/utils/meal/splitCalculations.test.ts`
Expected: PASS (all tests).

- [ ] **Step 7: Full check and commit**

Run: `npm run check-all` — expected: all four stages pass (the legacy aliases keep existing components compiling).

```bash
git add package.json package-lock.json vitest.config.ts src/types/meal.ts src/utils/meal/splitCalculations.ts src/utils/meal/splitCalculations.test.ts
git commit -m "Added the check-split money engine with vitest."
```

---

### Task 2: Scan-response parsing utilities

**Files:**
- Create: `src/utils/meal/receiptScan.ts`
- Test: `src/utils/meal/receiptScan.test.ts`

**Interfaces:**
- Consumes: `ReceiptItem`, `Charge`, `ChargeKind` from `@/types/meal`; `allocateCents` from `./splitCalculations`.
- Produces (imported by the API route in Task 3 and by ImageUpload/page in Task 4):
  - `interface ScannedItem { name: string; price: number; quantity: number }`
  - `interface ScannedReceipt { items: ScannedItem[]; tax: number | null; tip: number | null; gratuity: number | null; discount: number | null; total: number | null }`
  - `isRecord(value: unknown): value is Record<string, unknown>`
  - `parseScannedReceipt(value: unknown): ScannedReceipt | null`
  - `scannedItemsToReceiptItems(items: ScannedItem[], makeId: () => string): ReceiptItem[]`
  - `scannedChargesToCharges(scan: ScannedReceipt, makeId: () => string): Charge[]`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/meal/receiptScan.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  parseScannedReceipt,
  scannedItemsToReceiptItems,
  scannedChargesToCharges,
} from "./receiptScan";

function makeIdFactory(): () => string {
  let n = 0;
  return () => `id-${++n}`;
}

describe("parseScannedReceipt", () => {
  const valid = {
    items: [{ name: "Beer", price: 13, quantity: 2 }],
    tax: 4.13,
    tip: null,
    gratuity: 18.5,
    discount: null,
    total: 120.63,
  };

  it("accepts a valid payload", () => {
    expect(parseScannedReceipt(valid)).toEqual(valid);
  });

  it("defaults invalid or missing quantity to 1 and trims names", () => {
    const scan = parseScannedReceipt({
      ...valid,
      items: [{ name: "  Salad  ", price: 9.5, quantity: 0 }],
    });
    expect(scan?.items[0]).toEqual({ name: "Salad", price: 9.5, quantity: 1 });
  });

  it("treats missing charge fields as null", () => {
    const scan = parseScannedReceipt({ items: [] });
    expect(scan).toEqual({
      items: [],
      tax: null,
      tip: null,
      gratuity: null,
      discount: null,
      total: null,
    });
  });

  const invalidPayloads: [string, unknown][] = [
    ["not an object", "hello"],
    ["null", null],
    ["items not an array", { items: {} }],
    ["item without name", { items: [{ price: 5, quantity: 1 }] }],
    ["item with empty name", { items: [{ name: "  ", price: 5, quantity: 1 }] }],
    ["item with string price", { items: [{ name: "x", price: "5", quantity: 1 }] }],
    ["non-numeric tax", { items: [], tax: "4.13" }],
    ["NaN total", { items: [], total: NaN }],
  ];
  it.each(invalidPayloads)("rejects %s", (_label, payload) => {
    expect(parseScannedReceipt(payload)).toBeNull();
  });
});

describe("scannedItemsToReceiptItems", () => {
  it("passes single-quantity items through", () => {
    const items = scannedItemsToReceiptItems(
      [{ name: "Salad", price: 12.5, quantity: 1 }],
      makeIdFactory()
    );
    expect(items).toEqual([
      { id: "id-1", name: "Salad", price: 12.5, assignedTo: [] },
    ]);
  });

  it("expands quantity > 1 into per-unit items with penny-exact prices", () => {
    const items = scannedItemsToReceiptItems(
      [{ name: "Beer", price: 13, quantity: 2 }],
      makeIdFactory()
    );
    expect(items.map((i) => i.price)).toEqual([6.5, 6.5]);
    expect(items.map((i) => i.name)).toEqual(["Beer", "Beer"]);
  });

  it("keeps odd cents penny-exact across units", () => {
    const items = scannedItemsToReceiptItems(
      [{ name: "Dumplings", price: 10, quantity: 3 }],
      makeIdFactory()
    );
    const totalCents = items.reduce((s, i) => s + Math.round(i.price * 100), 0);
    expect(totalCents).toBe(1000);
  });
});

describe("scannedChargesToCharges", () => {
  it("creates amount-mode charges for nonzero fields only", () => {
    const charges = scannedChargesToCharges(
      {
        items: [],
        tax: 4.13,
        tip: null,
        gratuity: 0,
        discount: 3,
        total: null,
      },
      makeIdFactory()
    );
    expect(charges).toEqual([
      { id: "id-1", kind: "tax", label: "Tax", mode: "amount", value: 4.13 },
      { id: "id-2", kind: "discount", label: "Discount", mode: "amount", value: 3 },
    ]);
  });

  it("stores negative scanned discounts as positive values", () => {
    const charges = scannedChargesToCharges(
      { items: [], tax: null, tip: null, gratuity: null, discount: -3, total: null },
      makeIdFactory()
    );
    expect(charges[0].value).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/meal/receiptScan.test.ts`
Expected: FAIL — cannot resolve `./receiptScan`.

- [ ] **Step 3: Implement**

Create `src/utils/meal/receiptScan.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/meal/receiptScan.test.ts`
Expected: PASS.

- [ ] **Step 5: Full check and commit**

Run: `npm run check-all` — expected: pass.

```bash
git add src/utils/meal/receiptScan.ts src/utils/meal/receiptScan.test.ts
git commit -m "Added scan-response parsing utilities."
```

---

### Task 3: Scan API route

**Files:**
- Create: `src/app/api/scan-receipt/route.ts`
- Create: `.env.example`
- Modify: `.gitignore` (allow `.env.example`)
- Modify: `package.json` (dependency `@anthropic-ai/sdk`)

**Interfaces:**
- Consumes: `parseScannedReceipt`, `isRecord` from `@/utils/meal/receiptScan`.
- Produces: `POST /api/scan-receipt` accepting JSON `{ image: string (bare base64, no data: prefix), mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }`. Responses: `200` with a `ScannedReceipt` JSON body; `400/502/503` with `{ error: string }`.

- [ ] **Step 1: Install the SDK**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Env plumbing**

Create `.env.example`:

```
# Server-side key for the receipt-scan API route (/api/scan-receipt).
# Get one at https://platform.claude.com. On Vercel, set this in the
# project's Environment Variables. Locally, copy this file to .env.local.
ANTHROPIC_API_KEY=
```

In `.gitignore`, change the env section from:

```
# env files (can opt-in for committing if needed)
.env*
```

to:

```
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

- [ ] **Step 3: Implement the route**

Create `src/app/api/scan-receipt/route.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { isRecord, parseScannedReceipt } from '@/utils/meal/receiptScan'

// Vercel function limit; scan calls are capped at 30s below.
export const maxDuration = 60

// ~8MB of base64 ≈ 6MB image — far above the client's ~1600px downscale.
const MAX_BASE64_LENGTH = 8_000_000

type AllowedMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

function toAllowedMediaType(value: unknown): AllowedMediaType | null {
  if (
    value === 'image/jpeg' ||
    value === 'image/png' ||
    value === 'image/webp' ||
    value === 'image/gif'
  ) {
    return value
  }
  return null
}

const RECEIPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'tax', 'tip', 'gratuity', 'discount', 'total'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'price', 'quantity'],
        properties: {
          name: { type: 'string', description: 'Item name as printed on the receipt' },
          price: {
            type: 'number',
            description: 'Total price of this line in dollars (for all units)',
          },
          quantity: {
            type: 'integer',
            description: 'Quantity printed on this line; 1 when not printed',
          },
        },
      },
    },
    tax: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Tax in dollars, or null when not printed',
    },
    tip: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Tip in dollars, or null when not printed',
    },
    gratuity: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Automatic gratuity or service charge in dollars, or null',
    },
    discount: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Discount as a positive dollar amount, or null',
    },
    total: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Printed grand total in dollars, or null when unreadable',
    },
  },
}

const PROMPT = [
  'Extract the line items and charges from this restaurant receipt photo.',
  'Report each line item with its printed quantity and the total price for the line.',
  'Do not include tax, tip, gratuity, service charges, or discounts as items —',
  'report those in their dedicated fields, in dollars, using null for anything',
  'not printed on the receipt. Report discounts as positive numbers.',
].join(' ')

const SCAN_FAILED = {
  error: "Couldn't read this receipt. Try another photo or enter items manually.",
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Receipt scanning is not configured on this server.' },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const { image } = body
  const mediaType = toAllowedMediaType(body.mediaType)
  if (typeof image !== 'string' || image.length === 0 || !mediaType) {
    return NextResponse.json(
      { error: 'Expected a base64 image and a supported mediaType.' },
      { status: 400 }
    )
  }
  if (image.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: 'Image is too large.' }, { status: 400 })
  }

  const client = new Anthropic()
  try {
    const response = await client.messages.create(
      {
        model: 'claude-haiku-4-5',
        max_tokens: 16000,
        output_config: { format: { type: 'json_schema', schema: RECEIPT_SCHEMA } },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: image },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      },
      { timeout: 30_000 }
    )

    if (response.stop_reason === 'refusal') {
      return NextResponse.json(SCAN_FAILED, { status: 502 })
    }
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )
    if (!textBlock) {
      return NextResponse.json(SCAN_FAILED, { status: 502 })
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(textBlock.text)
    } catch {
      return NextResponse.json(SCAN_FAILED, { status: 502 })
    }
    const scan = parseScannedReceipt(parsed)
    if (!scan) {
      return NextResponse.json(SCAN_FAILED, { status: 502 })
    }
    return NextResponse.json(scan)
  } catch (error) {
    console.error('scan-receipt failed:', error)
    return NextResponse.json(SCAN_FAILED, { status: 502 })
  }
}
```

Notes for the implementer:
- `new Anthropic()` reads `ANTHROPIC_API_KEY` from the environment; the key never reaches the client bundle because this file only runs server-side.
- The per-request `{ timeout: 30_000 }` is milliseconds (TypeScript SDK convention).
- If `output_config` is not present in the installed SDK's types for `messages.create`, do NOT cast — check the SDK's exported params type for the current field name (`output_config.format` is the canonical API parameter) and update the call accordingly.

- [ ] **Step 4: Verify against a running server**

Run: `npm run type-check && npm run lint` — expected: pass.

Start the dev server, then verify the error paths (no key configured → 503; with key + garbage input → 400):

```bash
npm run dev &
sleep 3
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/scan-receipt \
  -H 'content-type: application/json' -d '{"image":"x","mediaType":"text/plain"}'
```

Expected: `400`. Then without `image`:

```bash
curl -s -X POST http://localhost:3000/api/scan-receipt \
  -H 'content-type: application/json' -d '{}'
```

Expected: `{"error":"Expected a base64 image and a supported mediaType."}` (or the 503 body if no `ANTHROPIC_API_KEY` is set — both prove the route is wired). If `.env.local` contains a key, optionally test a real scan:

```bash
IMG=$(base64 -i /path/to/receipt.jpg | tr -d '\n')
curl -s -X POST http://localhost:3000/api/scan-receipt \
  -H 'content-type: application/json' \
  -d "{\"image\":\"$IMG\",\"mediaType\":\"image/jpeg\"}"
```

Kill the dev server afterwards (`pkill -f "next dev"`).

- [ ] **Step 5: Full check and commit**

Run: `npm run check-all` — expected: pass.

```bash
git add src/app/api/scan-receipt/route.ts .env.example .gitignore package.json package-lock.json
git commit -m "Added the receipt scan API route."
```

---

### Task 4: Wizard fork, real scanning UI, and clickable steps

**Files:**
- Modify: `src/app/meal/page.tsx`
- Modify: `src/app/meal/components/ImageUpload.tsx` (full rewrite)

**Interfaces:**
- Consumes: `ScannedReceipt`, `parseScannedReceipt`, `isRecord`, `scannedItemsToReceiptItems`, `scannedChargesToCharges` from `@/utils/meal/receiptScan`; `ReceiptItem`, `Charge` from `@/types/meal`.
- Produces: `page.tsx` owns new state consumed by later tasks: `items: ReceiptItem[]`, `charges: Charge[]`, `scannedTotal: number | null`. `ImageUpload` has this exact props contract:

```ts
interface ImageUploadProps {
  uploadedImage: string | null
  onImageUpload: (image: string | null) => void
  onScanComplete: (scan: ScannedReceipt) => void
  onStartFromScratch: () => void
}
```

- In this task `ExpenseItemsList`, `DragDropSplitter`, and `ExpenseSummary` keep their existing props (`totals` state stays alive until Task 5). `ReceiptItem` and the legacy `ExpenseItem` are mutually structurally assignable, so passing `ReceiptItem[]` where `ExpenseItem[]` is expected compiles.

- [ ] **Step 1: Rewrite `ImageUpload.tsx`**

Replace the entire file with:

```tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, Zap, CheckCircle, AlertTriangle, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { isRecord, parseScannedReceipt } from "@/utils/meal/receiptScan";
import type { ScannedReceipt } from "@/utils/meal/receiptScan";

interface ImageUploadProps {
  uploadedImage: string | null;
  onImageUpload: (image: string | null) => void;
  onScanComplete: (scan: ScannedReceipt) => void;
  onStartFromScratch: () => void;
}

type ScanState =
  | { status: "idle" }
  | { status: "scanning" }
  | { status: "done"; itemCount: number }
  | { status: "error"; message: string };

const MAX_DIMENSION = 1600;

async function downscaleImage(file: File): Promise<{ dataUrl: string; base64: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(",") + 1) };
}

async function requestScan(base64: string): Promise<ScannedReceipt> {
  const response = await fetch("/api/scan-receipt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : "Couldn't read this receipt.";
    throw new Error(message);
  }
  const scan = parseScannedReceipt(payload);
  if (!scan) throw new Error("Couldn't read this receipt.");
  return scan;
}

export function ImageUpload({
  uploadedImage,
  onImageUpload,
  onScanComplete,
  onStartFromScratch,
}: ImageUploadProps) {
  const [scanState, setScanState] = useState<ScanState>({ status: "idle" });
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const scanFile = useCallback(
    async (file: File) => {
      setScanState({ status: "scanning" });
      try {
        const { dataUrl, base64 } = await downscaleImage(file);
        onImageUpload(dataUrl);
        const scan = await requestScan(base64);
        onScanComplete(scan);
        setScanState({ status: "done", itemCount: scan.items.length });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Couldn't read this receipt.";
        setScanState({ status: "error", message });
      }
    },
    [onImageUpload, onScanComplete]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) void scanFile(file);
    },
    [scanFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"] },
    maxFiles: 1,
  });

  const clearImage = () => {
    onImageUpload(null);
    setScanState({ status: "idle" });
  };

  if (uploadedImage) {
    return (
      <div className="space-y-6">
        <div className="relative">
          <Image
            src={uploadedImage}
            alt="Uploaded receipt"
            className="w-full max-w-md mx-auto rounded-lg shadow-lg"
            width={400}
            height={300}
            style={{ objectFit: "contain" }}
            unoptimized
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={clearImage}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <AnimatePresence>
          {scanState.status === "scanning" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <Zap className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400 animate-pulse" />
                <span className="text-blue-800 dark:text-blue-200 font-medium">
                  Reading your receipt...
                </span>
              </div>
            </motion.div>
          )}

          {scanState.status === "done" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                <span className="text-green-800 dark:text-green-200 font-medium">
                  Found {scanState.itemCount} item
                  {scanState.itemCount === 1 ? "" : "s"} — you can review and edit
                  everything in the next steps
                </span>
              </div>
            </motion.div>
          )}

          {scanState.status === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4"
            >
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
                <span className="text-red-800 dark:text-red-200 font-medium">
                  {scanState.message}
                </span>
              </div>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={clearImage}>
                  Try another photo
                </Button>
                <Button onClick={onStartFromScratch}>
                  <PencilLine className="w-4 h-4 mr-2" />
                  Enter items manually
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Scan card */}
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all h-full ${
            isDragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          }`}
        >
          <input {...getInputProps()} />
          <motion.div animate={{ y: isDragActive ? -10 : 0 }} transition={{ duration: 0.2 }}>
            <Upload
              className={`w-12 h-12 mx-auto mb-4 ${
                isDragActive ? "text-blue-500" : "text-gray-400"
              }`}
            />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {isDragActive ? "Drop your receipt here" : "Scan a receipt"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Drag and drop a photo, or click to browse. Items, tax, and gratuity
              are detected automatically — everything stays editable.
            </p>
            <Button
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                cameraInputRef.current?.click();
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </motion.div>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void scanFile(file);
            event.target.value = "";
          }}
        />
      </div>

      {/* Start-from-scratch card */}
      <button
        type="button"
        onClick={onStartFromScratch}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center cursor-pointer transition-all hover:border-green-400 dark:hover:border-green-500"
      >
        <PencilLine className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Start from scratch
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          No receipt? Add people and type in items and charges yourself.
        </p>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Update `page.tsx`**

Apply these changes to `src/app/meal/page.tsx` (line numbers refer to the current file):

1. Replace the imports of types and the state block (lines 13–22):

```tsx
import type { Person, ReceiptItem, Charge, MealTotals } from "@/types/meal";
import {
  scannedItemsToReceiptItems,
  scannedChargesToCharges,
} from "@/utils/meal/receiptScan";
import type { ScannedReceipt } from "@/utils/meal/receiptScan";
import type { LucideIcon } from "lucide-react";

type MealFlowStep = "upload" | "participants" | "items" | "split" | "summary";

export default function MealExpensePage() {
  const [currentStep, setCurrentStep] = useState<MealFlowStep>("upload");
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [participants, setParticipants] = useState<Person[]>([]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [scannedTotal, setScannedTotal] = useState<number | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [startedFromScratch, setStartedFromScratch] = useState(false);
  // Legacy tax/tip totals — removed in Task 5 with the ExpenseItemsList rework.
  const [totals, setTotals] = useState<MealTotals | undefined>(undefined);
```

2. Type the steps array so the `as MealFlowStep` assertions can be deleted. Replace the `const steps = [` declaration with:

```tsx
  const steps: {
    id: MealFlowStep;
    title: string;
    icon: LucideIcon;
    description: string;
  }[] = [
    {
      id: "upload",
      title: "Get Started",
      icon: Camera,
      description: "Scan a receipt or start from scratch",
    },
```

(keep the other four step entries as they are).

3. Replace `handleNext` / `handlePrevious` and add navigation helpers (the `as MealFlowStep` casts go away because `steps[i].id` is already `MealFlowStep`):

```tsx
  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  const goToStep = (index: number) => {
    if (index < 0 || index >= steps.length) return;
    setCurrentStep(steps[index].id);
    setMaxStepReached((prev) => Math.max(prev, index));
  };

  const handleNext = () => goToStep(currentStepIndex + 1);
  const handlePrevious = () => goToStep(currentStepIndex - 1);

  const handleScanComplete = (scan: ScannedReceipt) => {
    setItems(scannedItemsToReceiptItems(scan.items, () => crypto.randomUUID()));
    setCharges(scannedChargesToCharges(scan, () => crypto.randomUUID()));
    setScannedTotal(scan.total);
  };

  const handleStartFromScratch = () => {
    setStartedFromScratch(true);
    setUploadedImage(null);
    goToStep(1);
  };
```

4. Update `canProceed` for the fork (`upload` case only):

```tsx
      case "upload":
        return uploadedImage !== null || startedFromScratch;
```

5. Make completed steps clickable. In the progress-steps map, wrap the step circle so it navigates when reachable — replace the `<motion.div className={...w-12 h-12...}>` block with:

```tsx
                      <motion.button
                        type="button"
                        onClick={() => {
                          if (index <= maxStepReached) goToStep(index);
                        }}
                        disabled={index > maxStepReached}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                          isActive || isCompleted
                            ? "bg-green-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                        } ${index <= maxStepReached ? "cursor-pointer" : "cursor-default"}`}
                        whileHover={{ scale: index <= maxStepReached ? 1.05 : 1 }}
                        whileTap={{ scale: index <= maxStepReached ? 0.95 : 1 }}
                      >
                        <StepIcon className="w-6 h-6" />
                      </motion.button>
```

6. Update the `ImageUpload` render call:

```tsx
            {currentStep === "upload" && (
              <ImageUpload
                uploadedImage={uploadedImage}
                onImageUpload={setUploadedImage}
                onScanComplete={handleScanComplete}
                onStartFromScratch={handleStartFromScratch}
              />
            )}
```

7. Remove the trailing dead `<Button>Complete</Button>` on the last step (replace the ternary's else-branch with `<div />` so the layout keeps its three columns).

- [ ] **Step 3: Verify**

Run: `npm run check-all` — expected: pass (note `ExpenseItemsList`, `DragDropSplitter`, `ExpenseSummary` still receive the shapes they expect; `ReceiptItem[]` is structurally compatible with `ExpenseItem[]`).

Boot the dev server and click through: `/meal` shows the two-card step 1; "Start from scratch" jumps to Add People; uploading any image hits the real API (503/error state without a key, with working "Enter items manually" escape hatch). Completed step icons navigate on click.

- [ ] **Step 4: Commit**

```bash
git add src/app/meal/page.tsx src/app/meal/components/ImageUpload.tsx
git commit -m "Added scan-or-scratch flow with real receipt scanning."
```

---

### Task 5: Items & charges editor with mismatch banner

**Files:**
- Modify: `src/app/meal/components/ExpenseItemsList.tsx` (full rewrite)
- Modify: `src/app/meal/page.tsx` (props + drop `totals` state)

**Interfaces:**
- Consumes: `Charge`, `ChargeKind`, `ReceiptItem` from `@/types/meal`; `calculateSplit` from `@/utils/meal/splitCalculations` (called with `people: []` for totals-only).
- Produces: `ExpenseItemsList` props contract:

```ts
interface ExpenseItemsListProps {
  items: ReceiptItem[]
  onItemsChange: (items: ReceiptItem[]) => void
  charges: Charge[]
  onChargesChange: (charges: Charge[]) => void
  scannedTotal: number | null
}
```

- [ ] **Step 1: Rewrite `ExpenseItemsList.tsx`**

Keep the existing item add/edit/delete UI structure and styling, with these changes: type it against `ReceiptItem`, use `crypto.randomUUID()` for new item ids, delete the `totals`-based tax/tip section, and add the charges editor + totals footer + mismatch banner. The complete new component logic:

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Edit3, Trash2, Package, Receipt, AlertTriangle, X } from "lucide-react";
import type { Charge, ChargeKind, ReceiptItem } from "@/types/meal";
import { calculateSplit } from "@/utils/meal/splitCalculations";

interface ExpenseItemsListProps {
  items: ReceiptItem[];
  onItemsChange: (items: ReceiptItem[]) => void;
  charges: Charge[];
  onChargesChange: (charges: Charge[]) => void;
  scannedTotal: number | null;
}

const CHARGE_DEFS: { kind: ChargeKind; label: string }[] = [
  { kind: "tax", label: "Tax" },
  { kind: "tip", label: "Tip" },
  { kind: "gratuity", label: "Gratuity" },
  { kind: "discount", label: "Discount" },
];

const TIP_PRESETS = [15, 18, 20];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export function ExpenseItemsList({
  items,
  onItemsChange,
  charges,
  onChargesChange,
  scannedTotal,
}: ExpenseItemsListProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: "", price: "" });
  const [isAddingNew, setIsAddingNew] = useState(false);

  const updateItem = (id: string, updates: Partial<ReceiptItem>) => {
    onItemsChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    setEditingItem(null);
  };

  const deleteItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const addNewItem = () => {
    const price = parseFloat(newItem.price);
    if (newItem.name.trim() && Number.isFinite(price) && price >= 0) {
      onItemsChange([
        ...items,
        { id: crypto.randomUUID(), name: newItem.name.trim(), price, assignedTo: [] },
      ]);
      setNewItem({ name: "", price: "" });
      setIsAddingNew(false);
    }
  };

  const addCharge = (kind: ChargeKind, label: string) => {
    onChargesChange([
      ...charges,
      { id: crypto.randomUUID(), kind, label, mode: kind === "tip" ? "percent" : "amount", value: 0 },
    ]);
  };

  const updateCharge = (id: string, updates: Partial<Charge>) => {
    onChargesChange(charges.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeCharge = (id: string) => {
    onChargesChange(charges.filter((c) => c.id !== id));
  };

  const setTipPercent = (percent: number) => {
    const tip = charges.find((c) => c.kind === "tip");
    if (tip) {
      updateCharge(tip.id, { mode: "percent", value: percent });
    } else {
      onChargesChange([
        ...charges,
        { id: crypto.randomUUID(), kind: "tip", label: "Tip", mode: "percent", value: percent },
      ]);
    }
  };

  // Totals-only invocation of the money engine: no people, so perPerson is
  // empty but subtotal / resolved charges / grandTotal are exact.
  const totals = calculateSplit(items, charges, []);
  const mismatch =
    scannedTotal !== null && Math.abs(totals.grandTotal - scannedTotal) > 0.01;

  return (
    <div className="space-y-6">
      {mismatch && (
        <div className="flex items-start bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            The items and charges below add up to{" "}
            <strong>{formatCurrency(totals.grandTotal)}</strong>, but the receipt
            total reads <strong>{formatCurrency(scannedTotal)}</strong>. Check the
            detected prices and charges before splitting.
          </p>
        </div>
      )}

      {/* Items — keep the existing list/add/edit/delete UI from the current
          file, unchanged except: ReceiptItem type, crypto.randomUUID() ids,
          addNewItem/updateItem/deleteItem above. */}

      {/* Charges */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 dark:text-white flex items-center">
            <Receipt className="w-5 h-5 mr-2" />
            Tax, Tip & Other Charges
          </h4>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">Tip:</span>
            {TIP_PRESETS.map((percent) => (
              <Button key={percent} variant="outline" size="sm" onClick={() => setTipPercent(percent)}>
                {percent}%
              </Button>
            ))}
          </div>
        </div>

        {charges.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No charges yet — add tax, tip, gratuity, or a discount below.
          </p>
        )}

        {charges.map((charge) => (
          <div key={charge.id} className="flex items-center gap-3">
            <span className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">
              {charge.label}
            </span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
              <button
                type="button"
                onClick={() => updateCharge(charge.id, { mode: "amount" })}
                className={`px-2 py-1 text-sm ${
                  charge.mode === "amount"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-white dark:bg-gray-700 text-gray-500"
                }`}
              >
                $
              </button>
              <button
                type="button"
                onClick={() => updateCharge(charge.id, { mode: "percent" })}
                className={`px-2 py-1 text-sm ${
                  charge.mode === "percent"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-white dark:bg-gray-700 text-gray-500"
                }`}
              >
                %
              </button>
            </div>
            <input
              type="number"
              min="0"
              step={charge.mode === "percent" ? "0.5" : "0.01"}
              value={charge.value}
              onChange={(event) =>
                updateCharge(charge.id, { value: parseFloat(event.target.value) || 0 })
              }
              className="w-28 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400 flex-1">
              {formatCurrency(
                totals.charges.find((c) => c.chargeId === charge.id)?.amount ?? 0
              )}
            </span>
            <Button variant="ghost" size="sm" onClick={() => removeCharge(charge.id)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {CHARGE_DEFS.map(({ kind, label }) => (
            <Button key={kind} variant="outline" size="sm" onClick={() => addCharge(kind, label)}>
              <Plus className="w-4 h-4 mr-1" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Totals footer */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-1">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Subtotal ({items.length} items)</span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        {totals.charges.map((charge) => (
          <div key={charge.chargeId} className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{charge.label}</span>
            <span>{formatCurrency(charge.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">
          <span>Total</span>
          <span>{formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
```

The "Items" comment placeholder above is the one part carried over: transplant the current file's items-list JSX (the `items.map` card list with inline editing, and the "Add New Item" form, currently lines ~90–250) into that slot, adjusting only the handler names/types shown above. Do not carry over the old `currentTotals`/`updateTotals` code or the `Package`/`DollarSign` sections tied to it; drop now-unused imports.

- [ ] **Step 2: Update `page.tsx`**

- Delete the `totals` state line and the `MealTotals` import (added as legacy in Task 4).
- Update the items-step render:

```tsx
            {currentStep === "items" && (
              <ExpenseItemsList
                items={items}
                onItemsChange={setItems}
                charges={charges}
                onChargesChange={setCharges}
                scannedTotal={scannedTotal}
              />
            )}
```

- `ExpenseSummary` still accepts `totals?: MealTotals` (optional) until Task 7 — remove the `totals={totals}` prop from its render call now.

- [ ] **Step 3: Verify and commit**

Run: `npm run check-all` — expected: pass. Dev-server check: scratch flow → add items → add charges (tip presets, $/% toggle, delete) → totals footer updates live; scanning with a mismatched edit shows the amber banner.

```bash
git add src/app/meal/components/ExpenseItemsList.tsx src/app/meal/page.tsx
git commit -m "Added the charges editor and receipt mismatch banner."
```

---

### Task 6: Split step — tap-to-toggle, per-person shares, exact amounts

**Files:**
- Modify: `src/app/meal/components/DragDropSplitter.tsx`

**Interfaces:**
- Consumes: `ReceiptItem`, `Person` from `@/types/meal`; `allocateCents` from `@/utils/meal/splitCalculations`.
- Produces: props change to `items: ReceiptItem[]` (rest unchanged):

```ts
interface DragDropSplitterProps {
  items: ReceiptItem[]
  participants: Person[]
  onItemsChange: (items: ReceiptItem[]) => void
}
```

- [ ] **Step 1: Update types and toggle logic**

In `DragDropSplitter.tsx`, change the `ExpenseItem` import/usages to `ReceiptItem`, and extract a single toggle function used by both drag-drop and tap. **Any assignee change clears `exactSplits`** (spec rule):

```tsx
  const toggleAssignment = (itemId: string, personId: string) => {
    onItemsChange(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const isAssigned = item.assignedTo.includes(personId);
        return {
          ...item,
          assignedTo: isAssigned
            ? item.assignedTo.filter((id) => id !== personId)
            : [...item.assignedTo, personId],
          exactSplits: undefined,
        };
      })
    );
  };
```

`handleDragEnd` becomes:

```tsx
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedPerson(null);
    if (over && typeof active.id === "string" && typeof over.id === "string") {
      toggleAssignment(over.id, active.id);
    }
  };
```

`splitEqually` and `clearAllAssignments` also set `exactSplits: undefined` on every item.

- [ ] **Step 2: Compute and display per-person shares on each item card**

Add a module-scope helper (below the imports, above the component):

```tsx
function itemShares(item: ReceiptItem): Map<string, number> {
  const shares = new Map<string, number>();
  if (item.assignedTo.length === 0) return shares;
  const exact = item.exactSplits;
  const priceCents = Math.round(item.price * 100);
  const exactValid =
    exact !== undefined &&
    Object.keys(exact).length === item.assignedTo.length &&
    item.assignedTo.every((id) => typeof exact[id] === "number") &&
    item.assignedTo.reduce((sum, id) => sum + Math.round(exact[id] * 100), 0) ===
      priceCents;
  if (exactValid) {
    for (const id of item.assignedTo) shares.set(id, exact[id]);
  } else {
    const cents = allocateCents(priceCents, item.assignedTo.map(() => 1));
    item.assignedTo.forEach((id, index) => shares.set(id, cents[index] / 100));
  }
  return shares;
}
```

Pass extra props into `ItemCard` (it is already a module-scope component — keep it that way):

```tsx
function ItemCard({
  item,
  participants,
  assignedParticipants,
  onToggle,
  onSetExactSplits,
}: {
  item: ReceiptItem;
  participants: Person[];
  assignedParticipants: Person[];
  onToggle: (personId: string) => void;
  onSetExactSplits: (splits: Record<string, number> | undefined) => void;
}) {
```

Inside `ItemCard`:

1. Replace the assigned-participants chips with **tap-to-toggle chips for every participant** (assigned = solid person color, unassigned = gray outline; clicking calls `onToggle(person.id)`), each showing the person's share from `itemShares(item)` when assigned:

```tsx
      <div className="flex flex-wrap gap-2">
        {participants.map((person) => {
          const isAssigned = item.assignedTo.includes(person.id);
          const share = shares.get(person.id);
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onToggle(person.id)}
              className={`flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all border ${
                isAssigned
                  ? "text-white border-transparent"
                  : "text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 bg-transparent"
              }`}
              style={isAssigned ? { backgroundColor: person.color } : undefined}
            >
              {person.name}
              {isAssigned && share !== undefined && (
                <span className="ml-1 opacity-90">${share.toFixed(2)}</span>
              )}
            </button>
          );
        })}
      </div>
```

with `const shares = itemShares(item);` at the top of `ItemCard`.

2. Add the **"Customize amounts" expander** for items with 2+ assignees. Add a module-scope `ExactSplitEditor` component:

```tsx
function ExactSplitEditor({
  item,
  assignedParticipants,
  onSetExactSplits,
  onClose,
}: {
  item: ReceiptItem;
  assignedParticipants: Person[];
  onSetExactSplits: (splits: Record<string, number> | undefined) => void;
  onClose: () => void;
}) {
  const shares = itemShares(item);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const person of assignedParticipants) {
      initial[person.id] = (shares.get(person.id) ?? 0).toFixed(2);
    }
    return initial;
  });

  const parsedCents = assignedParticipants.map((person) => {
    const value = parseFloat(drafts[person.id]);
    return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
  });
  const allValid = parsedCents.every((c) => c !== null);
  const sumCents = parsedCents.reduce<number>((sum, c) => sum + (c ?? 0), 0);
  const priceCents = Math.round(item.price * 100);
  const remainingCents = priceCents - sumCents;
  const canApply = allValid && remainingCents === 0;

  const apply = () => {
    const splits: Record<string, number> = {};
    assignedParticipants.forEach((person, index) => {
      const cents = parsedCents[index];
      if (cents !== null) splits[person.id] = cents / 100;
    });
    onSetExactSplits(splits);
    onClose();
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
      {assignedParticipants.map((person) => (
        <div key={person.id} className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shrink-0"
            style={{ backgroundColor: person.color }}
          >
            {person.name.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
            {person.name}
          </span>
          <span className="text-gray-500">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={drafts[person.id]}
            onChange={(event) =>
              setDrafts({ ...drafts, [person.id]: event.target.value })
            }
            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
          />
        </div>
      ))}
      <div
        className={`text-sm text-right ${
          remainingCents === 0
            ? "text-green-600 dark:text-green-400"
            : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {remainingCents === 0
          ? "Adds up ✓"
          : `Remaining: $${(remainingCents / 100).toFixed(2)}`}
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSetExactSplits(undefined);
            onClose();
          }}
        >
          Reset to equal
        </Button>
        <Button size="sm" onClick={apply} disabled={!canApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}
```

In `ItemCard`, below the chips, render the expander toggle when `assignedParticipants.length >= 2`:

```tsx
      {assignedParticipants.length >= 2 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsEditingAmounts((open) => !open)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {item.exactSplits ? "Edit custom amounts" : "Customize amounts"}
            {item.exactSplits && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                custom
              </span>
            )}
          </button>
          {isEditingAmounts && (
            <ExactSplitEditor
              item={item}
              assignedParticipants={assignedParticipants}
              onSetExactSplits={onSetExactSplits}
              onClose={() => setIsEditingAmounts(false)}
            />
          )}
        </div>
      )}
```

with `const [isEditingAmounts, setIsEditingAmounts] = useState(false);` in `ItemCard` (add the `useState` import usage; `useState` is already imported in this file).

3. Update the render call in the main component:

```tsx
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              participants={participants}
              assignedParticipants={participants.filter((p) =>
                item.assignedTo.includes(p.id)
              )}
              onToggle={(personId) => toggleAssignment(item.id, personId)}
              onSetExactSplits={(splits) =>
                onItemsChange(
                  items.map((i) =>
                    i.id === item.id ? { ...i, exactSplits: splits } : i
                  )
                )
              }
            />
          ))}
```

(this also removes the old `getPersonById(id)!` non-null pattern). Remove the card's old "Split N ways / $X each" header block entirely — the per-person chip amounts are now the authoritative display and stay correct for custom splits.

- [ ] **Step 2b: Guard against stale `Sparkles`/unused imports**

Remove any now-unused imports (`UserPlus` etc. if their sections were touched) so lint stays clean.

- [ ] **Step 3: Verify and commit**

Run: `npm run check-all` — expected: pass. Dev-server check: tap chips toggle assignment and show per-person dollars; drag-drop still works; 3-way $10.00 shows 3.34/3.33/3.33; "Customize amounts" enforces the remaining indicator, Apply sets custom amounts (chips update), toggling an assignee clears the custom badge.

```bash
git add src/app/meal/components/DragDropSplitter.tsx
git commit -m "Added tap-to-toggle assignment and exact-amount splits."
```

---

### Task 7: Summary from the money engine + legacy type removal

**Files:**
- Modify: `src/components/ExpenseSummary.tsx` (rewrite the calculation/rendering internals)
- Modify: `src/app/meal/page.tsx` (pass `charges`)
- Modify: `src/types/meal.ts` (delete legacy types)
- Delete: `src/types/common.ts`

**Interfaces:**
- Consumes: `calculateSplit`, `PersonBreakdown` from `@/utils/meal/splitCalculations`.
- Produces: `ExpenseSummary` props contract:

```ts
interface ExpenseSummaryProps {
  items: ReceiptItem[]
  participants: Person[]
  charges: Charge[]
}
```

- [ ] **Step 1: Rewrite `ExpenseSummary.tsx` internals**

Changes to the existing file:

1. Imports/props:

```tsx
import type { Person, ReceiptItem, Charge } from "@/types/meal";
import { calculateSplit } from "@/utils/meal/splitCalculations";

interface ExpenseSummaryProps {
  items: ReceiptItem[];
  participants: Person[];
  charges: Charge[];
}
```

2. Hoist `formatCurrency` to module scope (rule from the July 15 lint fixes: no functions recreated per-render feeding module concerns — and the summary-text builder below uses it):

```tsx
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
```

(Note: drop the `minimumFractionDigits: 0` options — per-person amounts need cents.)

3. Replace the whole hand-rolled calculation block (`const subtotal = ...` through `const calculations = ...`) with:

```tsx
  const result = calculateSplit(items, charges, participants);
  const getPersonById = (id: string) => participants.find((p) => p.id === id);
```

4. Header totals: replace the fixed Subtotal/Tax/Tip 3-column grid with subtotal + one entry per `result.charges` + keep the big total as `result.grandTotal`. Use a flexible layout:

```tsx
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-center">
          <div>
            <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              {formatCurrency(result.subtotal)}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Subtotal</div>
          </div>
          {result.charges.map((charge) => (
            <div key={charge.chargeId}>
              <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {formatCurrency(charge.amount)}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">{charge.label}</div>
            </div>
          ))}
        </div>
```

5. Per-person cards: map over `result.perPerson` (skip people with `itemShares.length === 0 && total === 0`? No — show everyone; a $0 card is informative). For each person render item shares and charge lines:

```tsx
        {result.perPerson.map((calc, index) => {
          const person = getPersonById(calc.personId);
          if (!person) return null;
          return (
            /* keep the existing card wrapper/motion/avatar markup, then: */
            <div className="space-y-2">
              {calc.itemShares.map((share, shareIndex) => (
                <div key={`${share.itemId}-${shareIndex}`} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    {share.itemName}
                    {share.shareCount > 1 && (
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        {share.isCustom ? "(custom)" : `(split ${share.shareCount} ways)`}
                      </span>
                    )}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(share.amount)}
                  </span>
                </div>
              ))}
              {calc.chargeShares
                .filter((charge) => charge.amount !== 0)
                .map((charge) => (
                  <div key={charge.chargeId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{charge.label}</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatCurrency(charge.amount)}
                    </span>
                  </div>
                ))}
            </div>
          );
        })}
```

The card's headline amount is `calc.total`; the sub-line "Items: $X + Tax: $Y + Tip: $Z" becomes `Items: {formatCurrency(calc.subtotal)}` plus the charge lines already itemized above (delete the old fixed string).

6. `generateSummaryText`: rebuild from `result` — header, subtotal, one line per `result.charges`, total, then per person: name + total, item lines, nonzero charge lines. Same copy-to-clipboard behavior.

7. Delete the `Share` and `Export PDF` buttons and their imports (`Share2`, `Download`); keep "Copy Summary". Delete the `SplitCalculation` import and the `totals` fallback math (the `subtotal * 0.0875` block) entirely.

- [ ] **Step 2: Update `page.tsx` summary render**

```tsx
            {currentStep === "summary" && (
              <ExpenseSummary
                items={items}
                participants={participants}
                charges={charges}
              />
            )}
```

- [ ] **Step 3: Delete legacy types**

- In `src/types/meal.ts`, delete the legacy section (`ExpenseItem`, `MealTotals`) and its banner comment.
- Delete `src/types/common.ts` (its `Expense` interface has no importers; `SplitCalculation` was only used by the old `ExpenseSummary`).
- Run `grep -rn "ExpenseItem\|MealTotals\|types/common\|SplitCalculation" src/` — expected: no matches. If any remain, migrate them to `ReceiptItem`/engine types (they should all have been handled in Tasks 4–6).

- [ ] **Step 4: Verify and commit**

Run: `npm run check-all` — expected: pass. Dev-server check: full scratch flow end to end — 2 people, 3 items (one shared with custom amounts), tax $ + tip % + discount; summary shows per-charge lines, custom badge, and per-person totals that sum to the grand total to the penny; Copy Summary produces the itemized text.

```bash
git add -A
git commit -m "Rebuilt the summary on the money engine and removed legacy types."
```

---

### Task 8: End-to-end verification

**Files:** none created; fixes only if verification fails.

- [ ] **Step 1: Full pipeline**

Run: `npm run check-all`
Expected: type-check, lint, test (both suites), build all pass; build output still lists `/meal` as a route and `/api/scan-receipt` as a function (ƒ).

- [ ] **Step 2: Dev-server smoke test**

```bash
npm run dev &
sleep 3
for p in / /car /general /hotel /meal; do
  echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$p)"
done
curl -s -o /dev/null -w '/api/scan-receipt -> %{http_code}\n' -X POST \
  http://localhost:3000/api/scan-receipt -H 'content-type: application/json' -d '{}'
pkill -f "next dev"
```

Expected: all pages `200`; the API returns `400` (or `503` without a key).

- [ ] **Step 3: Real-scan verification (requires `ANTHROPIC_API_KEY` in `.env.local`)**

With the dev server running, upload a real receipt photo on `/meal` in a browser and verify: items/tax prefill, the mismatch banner stays absent for a clean scan, and a full split works end to end. If no key is available, verify the 503 path renders the "scanning isn't configured" error with the manual-entry escape hatch, and flag the real-scan check as pending for the user.

- [ ] **Step 4: Commit any verification fixes**

If fixes were needed, commit them with a message describing what was fixed. Otherwise nothing to commit.
