# Check-Split Round 2 — Targeted Charges, Receipt-Paper Redesign, Homepage Link

**Date:** 2026-07-16
**Status:** Approved pending user review
**Builds on:** `2026-07-15-check-split-design.md` (shipped)

## Overview

Three follow-ups to the shipped `/meal` check-splitting calculator:

1. **Per-person charge targeting** — any charge (tax/tip/gratuity/discount) can
   apply to a chosen subset of people (e.g. a birthday discount for one
   person). Default remains everyone.
2. **Split-step redesign + receipt-paper theme** — the approved compact layout
   (sticky people strip, tighter three-state item cards) plus a distinctive
   "receipt paper" visual theme applied cohesively to all five wizard steps,
   and four UX enhancements (live per-person totals, avatar spotlight,
   all-assigned celebration, long-press → exact editor).
3. **Homepage** — the meal calculator moves from "Coming Soon" to "Available
   Calculators" and becomes clickable.

All designs were validated with the user via mockups (browser companion).

## 1. Per-person charge targeting

### Data model (`src/types/meal.ts`)

```ts
interface Charge {
  id: string
  kind: ChargeKind
  label: string
  mode: ChargeMode
  value: number
  appliesTo?: string[]   // person ids; absent = everyone
}
```

### Engine rules (`splitCalculations.ts`)

- Per charge, the **eligible group** = `appliesTo` filtered to known person
  ids. If `appliesTo` is absent, or the filter leaves nobody, the group is
  ALL people (money never vanishes when a targeted person is removed).
- Allocation weights = eligible people's item subtotals (largest-remainder,
  as today). Non-eligible people always get 0 of that charge.
- If every eligible person's subtotal is 0 but the charge is nonzero, split
  evenly by headcount **within the group**.
- **Percent charges compute on the eligible group's combined item subtotal**
  (not the whole receipt). Untargeted percent charges are unchanged (group =
  everyone ⇒ same base as today, given the wizard requires all items
  assigned).

### UI

- **Charges editor** (`ExpenseItemsList`): each charge row gets a "who pays"
  pill after the value input — reads "Everyone" (dashed, neutral) when
  untargeted, or the person's name / "N people" (solid, accented) when
  targeted. Tapping the pill toggles an inline person-chip row (same chip
  pattern as the split step): selecting chips sets `appliesTo`; selecting
  none (or all) resets to everyone (`appliesTo` undefined).
- **Summary** (`ExpenseSummary`): header charge entries append the target —
  "Discount · Sarah", two names joined with "&", three-plus as "· N people".
  Per-person cards need no change (zero shares are already filtered out).
- **Scan prefill** never sets `appliesTo`.
- **Participant removal**: `handleParticipantsChange` (page.tsx) also strips
  removed ids from every charge's `appliesTo`; an emptied array becomes
  `undefined`.

### Tests (vitest, `splitCalculations.test.ts`)

- Amount charge targeted at one person: full amount lands on them.
- Percent charge targeted at a group: base is the group's items only.
- Discount targeted at a person with $0 items, group-subtotal zero: even
  split within the group (single person ⇒ all of it).
- `appliesTo` containing only unknown ids: falls back to everyone.
- Sum invariant holds with mixed targeted/untargeted charges.

## 2. Split step redesign + receipt-paper theme

### Layout (approved mockup, Approach A)

`DragDropSplitter` becomes one compact surface:

- **Sticky strip** (top): draggable person avatars (color circle + initial),
  an "N of M assigned" counter, and compact "Split equally" / "Clear" actions.
  The old hero header, "Drag from here" panel, and bottom progress block are
  deleted. Drag-and-drop stays as a secondary interaction: avatars in the
  strip are the drag sources; item cards remain droppables.
- **Item cards**: single-row (wrapping on mobile) — name + price left, person
  chips right. Three visual states:
  - *unassigned*: dashed amber outline on amber-tinted paper, "needs people"
    hint;
  - *assigned*: solid card, left edge in the first assignee's color;
  - *custom split*: additionally a rubber-stamp-style "CUSTOM" badge.
- Chips show live per-person share amounts (existing behavior).
- `ExactSplitEditor` unchanged functionally; restyled to the theme.

### UX enhancements (all four approved)

1. **Live per-person totals**: each strip avatar shows that person's running
   total (item shares + charge shares) beneath/beside it, computed during
   render via `calculateSplit(items, charges, participants)`. This requires
   passing `charges` into `DragDropSplitter` (new prop).
2. **Avatar spotlight**: tapping a strip avatar sets local
   `spotlightPersonId`; item cards not containing that person dim
   (opacity/desaturation), their chips highlight. Tapping the same avatar
   (or a dim area toggle) clears; tapping another switches. Spotlight is
   display-only — it never changes assignment. Dragging still works while
   spotlighted.
3. **All-assigned celebration**: when the count of unassigned items
   transitions to 0 (and items.length > 0), a brief stamp-style "ALL
   ASSIGNED ✓" animation plays over the strip (framer-motion, ~1s,
   non-blocking), and the wizard's Next button gets a pulse class while on
   the split step with `canProceed()` true. Plays on transition only, not on
   re-render or revisit (track previous count with a ref).
4. **Long-press chip → exact editor**: long-press (pointer, ~500ms) or
   double-click on an *assigned* chip of an item with 2+ assignees opens that
   item's ExactSplitEditor directly. Short tap keeps its toggle behavior.

### Receipt-paper theme (applies to all five steps of /meal only)

- **Backdrop**: the meal route's `<main>` becomes a dark warm charcoal
  (stone-950/900 range) "table top" with a subtle radial vignette — replaces
  the green gradient. Light/dark mode: the theme is inherently dark-friendly;
  it renders identically in both modes.
- **Paper surfaces**: the step content card becomes receipt paper — off-white
  `#fdfbf7`, minimal radius, perforated zigzag top/bottom edges (pure CSS),
  soft drop shadow. Inner sections use dashed separators.
- **Typography**: `Space Mono` (via `next/font/google`, loaded in the meal
  route's `layout.tsx` only) for item names, prices, totals, and receipt
  chrome; item names render uppercase in lists/receipt contexts. UI controls
  and person chips stay in the default sans for contrast.
- **Receipt conventions**: header block styled like a printed receipt
  ("EVERYTHING CALCULATOR · SPLIT RECEIPT" + date line), `TOTAL` rows bold
  mono, `* * *` dashed dividers, amounts right-aligned.
- **Wizard chrome**: step circles restyled to sit on the dark backdrop
  (paper-colored inactive, green active/completed as today); step labels
  light-colored.
- **Per-step application**:
  - *Get started*: two paper cards on the dark table.
  - *Add people*: paper card; person rows keep colored avatars (sticker
    look: white ring + shadow).
  - *Items & charges*: THE receipt — items list styled as receipt lines,
    charges as printed fee lines, totals footer as the receipt total block;
    mismatch banner becomes an amber "printed alert" strip on the paper.
  - *Split items*: dark table with the strip + paper item cards (mockup).
  - *Summary*: each person's card becomes a mini-receipt (their items,
    charge lines, total); overall totals as a header receipt block. Copy
    Summary behavior unchanged.
- **Motion**: existing framer-motion transitions retained; add paper
  slide-in on step change and the celebration stamp. Nothing blocking or
  longer than ~1s.
- **Scope guard**: the theme touches only `/meal` components (including
  `ParticipantManager` and `ExpenseSummary`, which are used solely by the
  meal flow) and the meal `layout.tsx`. The car calculator and homepage keep
  their existing look. No shared-component API changes beyond listed props.

## 3. Homepage

In `ExpenseTypeSelector`, move the meal entry from `comingSoonTypes` to
`availableTypes` (it becomes a normal clickable card):

- Title: "Split a Check" (was "Restaurant & Meals")
- Description: "Scan a receipt or build one from scratch, then split it
  fairly to the penny"
- Features: "AI receipt scanning", "Tap-to-split items", "Tax, tip &
  targeted discounts"
- Icon/color unchanged (UtensilsCrossed, green).

While editing this file, remove its `as const` assertions (user rule: no
type assertions) — type the arrays explicitly instead. Hotel and General
stay in Coming Soon. The footer blurb ("All expense types support image
upload…") reads as false for the car calculator; reword to "More calculators
on the way".

## Out of scope

- Bulk assignment modes (person-first tagging), matrix layout.
- Theming the car calculator or homepage beyond the card move.
- Persistence/sharing, settle-up, multi-currency (unchanged from round 1).

## Error handling

No new failure modes: charge targeting is pure data + engine; the theme is
presentational. The celebration and spotlight are display-only state.
Existing scan/API error handling is untouched.

## Testing

- Engine: the five targeting test cases above; existing 35 tests must stay
  green.
- `npm run check-all` green throughout (type-check, lint, vitest, build).
- Manual dev-server pass: full wizard flow in the new theme, spotlight,
  celebration, long-press editor, targeted discount end-to-end (editor →
  summary), homepage card navigates to /meal.
