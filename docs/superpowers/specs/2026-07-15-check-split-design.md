# Check-Splitting Calculator — Design

**Date:** 2026-07-15
**Status:** Approved pending user review
**Route:** `/meal` (upgrade in place)

## Overview

Upgrade the existing `/meal` calculator from demo-ware into a real group
check-splitting tool. Users either scan a receipt (Claude vision extracts
items and charges as an editable prefill) or start from scratch. Items are
assigned to one or more people — split equally by default, with an optional
exact-amount override per item. Tax, tip, auto-gratuity, and discounts are
allocated proportionally to each person's item subtotal, with penny-exact
rounding so per-person totals always sum to the receipt total.

## Goals

- Real receipt scanning (the current "AI analysis" is a hardcoded mock).
- Start-from-scratch path (the current wizard requires an image upload).
- Items shared by 1..N people; equal split by default, exact dollar
  override per item when someone ate more.
- Charges: tax, tip, gratuity, discount — percent or fixed amount,
  allocated proportionally, penny-exact.
- Money math in a pure, unit-tested module.

## Out of scope

- Saving/sharing sessions (refresh loses state), settle-up/who-paid
  netting, multi-currency, PDF export.

## Data model (`src/types/meal.ts`)

```ts
interface Person { id: string; name: string; color: string }

interface ReceiptItem {
  id: string
  name: string
  price: number              // dollars, full line price
  assignedTo: string[]       // person ids sharing this item
  exactSplits?: Record<string, number>  // personId -> dollars; overrides equal split
}

type ChargeKind = 'tax' | 'tip' | 'gratuity' | 'discount'

interface Charge {
  id: string
  kind: ChargeKind
  label: string              // e.g. "Sales Tax", "Service Charge 18%"
  mode: 'percent' | 'amount' // percent = % of item subtotal (pre-tax)
  value: number              // percent value or dollars; discounts entered positive
}
```

Rules:

- `exactSplits` keys must equal `assignedTo` exactly and values must sum to
  `price`; the editor enforces this live. Changing an item's assignees
  clears the override back to an equal split.
- Discounts are entered positive and applied negative.
- Percent charges (tip, gratuity, tax-as-percent) are computed on the
  pre-tax item subtotal.
- A receipt may have any number of charges.
- `MealTotals` is replaced by the charge list + derived totals from the
  money engine.

## Money engine (`src/utils/meal/splitCalculations.ts`)

Pure module, no React. All arithmetic in integer cents; dollars converted
at the boundary.

- Equal splits use the largest-remainder method: $10.00 across 3 people
  yields 3.34/3.33/3.33; shares always sum exactly to the item price.
- Exact overrides are used verbatim (already validated to sum to price).
- Each charge amount (percent charges resolved against the item subtotal
  first) is allocated across people proportional to their item subtotal,
  again largest-remainder. Discounts allocate the same way, negated.
- Person total = item shares + charge allocations.
- Invariant: sum of per-person totals === subtotal + charges, always.

Edge cases:

- Person assigned to no items owes $0, including $0 of every charge.
- Item subtotal $0 with nonzero charges: charges split evenly by headcount.
- Items with no assignees: validation error; the wizard blocks progress to
  the summary (existing `canProceed` behavior).

## Wizard flow (5 steps, upgraded)

1. **Get started** — two cards: *Scan a receipt* (drag-drop/browse +
   real mobile camera capture via `<input capture="environment">`) or
   *Start from scratch* (skip to step 2 with empty items).
2. **Add People** — existing `ParticipantManager`, unchanged. Minimum 2.
3. **Review Items & Charges** — existing item add/edit/delete, plus a
   charges editor: one row per charge (tax/tip/gratuity/discount) with
   percent/$ toggle; 15/18/20% quick buttons for tip; scan results
   prefill. If scanned item prices don't sum to the receipt's printed
   total, show a warning banner identifying the mismatch.
4. **Split Items** — existing @dnd-kit drag-drop (drag person onto item
   toggles assignment) plus tap-to-toggle person chips on each item row
   (mobile). Rows show each assignee's current share. Items with 2+
   assignees get a "Customize amounts" expander: one dollar input per
   person with a live "remaining: $X.XX" indicator; valid only when
   amounts sum to the item price.
5. **Summary** — per-person cards itemizing item shares (marked "custom"
   when overridden), one line per charge, exact total. "Copy Summary"
   stays; dead Share/Export PDF buttons removed.

Navigation: completed steps become clickable to revisit (currently only
linear Previous/Next).

## Scan API (`src/app/api/scan-receipt/route.ts`)

First API route in the app; deploys as a Vercel function.

- `POST` JSON `{ image: <base64>, mediaType: string }`. Client downscales
  the photo to ~1600px JPEG on a canvas before upload.
- Server calls Claude Haiku 4.5 (`@anthropic-ai/sdk`, new dependency) with
  a forced tool call so the response must match:
  `{ items: [{ name, price, quantity }], tax, tip, gratuity, discount, total }`
  (charge fields and total optional/nullable).
- A hand-rolled type guard validates the response — no `as` casts, no new
  schema library.
- Items with `quantity > 1` are expanded into per-unit items before
  prefill ("2x Beer $13.00" becomes two $6.50 items) so different people
  can take individual units.
- Scanned charge fields prefill as amount-mode charges (a scanned $4.13
  tax becomes a `tax` charge with `mode: 'amount', value: 4.13`); zero or
  absent fields create no charge row.
- `ANTHROPIC_API_KEY` in server env (Vercel dashboard + `.env.local`).

## Error handling

- Missing/oversized/non-image upload → 400 with inline UI message.
- Claude error, ~30s timeout, or unparseable receipt → 502; UI shows
  "Couldn't read this receipt" with *retry* and *continue manually*
  escape hatches.
- `ANTHROPIC_API_KEY` unset → 503; scan card renders but explains
  scanning isn't configured; scratch mode unaffected.
- Scanned data is prefill, never truth — it all lands in the editable
  items/charges step, backed by the mismatch banner.

## Testing

- Add vitest (devDependency) with unit tests for:
  - `splitCalculations.ts`: equal splits with remainders, exact overrides,
    discounts, zero-subtotal charges, sum invariant across randomized-ish
    cases.
  - Scan-response type guard: malformed and partial responses.
- `check-all` becomes type-check → lint → test → build.
- Scan route manually tested with a real receipt photo; UI verified on
  the dev server.

## Files touched

- `src/types/meal.ts` — new model (Person unchanged, ReceiptItem, Charge).
- `src/utils/meal/splitCalculations.ts` — new money engine + tests.
- `src/app/api/scan-receipt/route.ts` — new scan endpoint.
- `src/app/meal/page.tsx` — step fork, clickable steps, remove
  `as MealFlowStep` assertions.
- `src/app/meal/components/ImageUpload.tsx` — real scan call, camera
  capture, error states.
- `src/app/meal/components/ExpenseItemsList.tsx` — charges editor,
  mismatch banner.
- `src/app/meal/components/DragDropSplitter.tsx` — tap-to-toggle chips,
  share display, exact-amount expander.
- `src/components/ExpenseSummary.tsx` — consume money engine, per-charge
  lines, remove dead buttons.
- `src/types/common.ts` — `SplitCalculation` gains per-charge lines
  (replacing its fixed tax/tip fields) to match the summary cards.
- `package.json` — add `@anthropic-ai/sdk`, `vitest`, `test` script,
  extend `check-all`.
