# Check-Split Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-person charge targeting (birthday-discount case), restyle the entire `/meal` wizard in a receipt-paper theme with a compact redesigned split step and four UX enhancements, and make the meal calculator clickable from the homepage.

**Architecture:** Targeting is a pure engine extension (`Charge.appliesTo`) with UI in the charges editor. The theme is presentational: a dark "table top" backdrop on the meal page, receipt-paper surfaces (shared `ReceiptSurface` component + CSS utilities in `globals.css`), and Space Mono via `next/font` scoped to the meal layout. The split step is rewritten as one compact surface (sticky avatar strip + three-state cards) keeping tap-primary/drag-secondary interactions.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, framer-motion, @dnd-kit (kept), `next/font/google` (Space Mono), vitest.

**Spec:** `docs/superpowers/specs/2026-07-16-check-split-round2-design.md`

## Global Constraints

- **Never use `as` type assertions** (including `as const`). Type predicates (`(x): x is T =>`) are fine. Task 8 explicitly REMOVES the `as const` occurrences in `ExpenseTypeSelector.tsx`.
- **Commits:** user is sole author — never add Co-Authored-By or any Claude attribution. Short past-tense message ending with a period.
- **Lint rules that bite:** no React component defined inside another component's body; no `setState` synchronously inside `useEffect` for derived state — the celebration trigger is therefore EVENT-driven (fired from assignment handlers), not effect-driven.
- **Theme scope guard:** only `/meal` files change visually (`src/app/meal/**`, `src/components/ParticipantManager.tsx`, `src/components/ExpenseSummary.tsx`, plus `globals.css` utility additions). The car calculator and homepage keep their existing look (homepage changes are limited to the card move/copy in Task 8).
- **Money engine invariants hold:** eligible-group allocation uses `allocateCents` (largest-remainder); a targeted charge falls back to EVERYONE when `appliesTo` filters to empty; percent charges on a targeted group compute on the group's combined item subtotal; untargeted behavior is byte-for-byte today's behavior.
- Every task ends with `npm run check-all` passing (type-check → lint → test → build).
- Existing 37 tests must stay green; Task 1 adds 5 more.
- Person colors keep the existing `PARTICIPANT_COLORS` palette; chips/avatars stay sans-serif; receipt text uses the `font-receipt` utility.
- Receipt paper color is `#fdfbf7`; dark table backdrop is `#171412` with a warm radial vignette; amber is the attention color; green stays the active/money accent.

---

### Task 1: Engine — charge targeting (TDD)

**Files:**
- Modify: `src/types/meal.ts` (Charge interface)
- Modify: `src/utils/meal/splitCalculations.ts:118-146` (charges loop)
- Test: `src/utils/meal/splitCalculations.test.ts`

**Interfaces:**
- Consumes: existing `allocateCents`, `calculateSplit` internals.
- Produces: `Charge.appliesTo?: string[]` (absent = everyone) — consumed by Tasks 2, 4. `calculateSplit` signature unchanged.

- [ ] **Step 1: Add the field**

In `src/types/meal.ts`, add one line to the `Charge` interface after `value: number`:

```ts
  // person ids this charge applies to; absent = everyone
  appliesTo?: string[]
```

- [ ] **Step 2: Write the failing tests**

Append to the top-level `describe("calculateSplit", ...)` block in `src/utils/meal/splitCalculations.test.ts` (reuse the existing `people` fixture and `item` helper):

```ts
  it("sends a targeted amount charge entirely to the targeted person", () => {
    const items = [
      item({ id: "i1", price: 30, assignedTo: ["a"] }),
      item({ id: "i2", price: 10, assignedTo: ["b"] }),
    ];
    const charges: Charge[] = [
      { id: "d1", kind: "discount", label: "Birthday", mode: "amount", value: 6, appliesTo: ["b"] },
    ];
    const result = calculateSplit(items, charges, people);
    expect(result.perPerson[0].chargeShares[0].amount).toBe(0);
    expect(result.perPerson[1].chargeShares[0].amount).toBe(-6);
    expect(result.perPerson[2].chargeShares[0].amount).toBe(0);
    expect(result.grandTotal).toBe(34);
  });

  it("computes targeted percent charges on the group's subtotal only", () => {
    const items = [
      item({ id: "i1", price: 30, assignedTo: ["a"] }),
      item({ id: "i2", price: 10, assignedTo: ["b"] }),
    ];
    const charges: Charge[] = [
      { id: "t1", kind: "tip", label: "Tip", mode: "percent", value: 10, appliesTo: ["b"] },
    ];
    const result = calculateSplit(items, charges, people);
    expect(result.charges[0].amount).toBe(1);
    expect(result.perPerson[1].chargeShares[0].amount).toBe(1);
    expect(result.perPerson[0].chargeShares[0].amount).toBe(0);
    expect(result.grandTotal).toBe(41);
  });

  it("splits a targeted charge evenly within the group when the group ordered nothing", () => {
    const items = [item({ id: "i1", price: 20, assignedTo: ["a"] })];
    const charges: Charge[] = [
      { id: "g1", kind: "gratuity", label: "Gratuity", mode: "amount", value: 6, appliesTo: ["b", "c"] },
    ];
    const result = calculateSplit(items, charges, people);
    expect(result.perPerson[0].chargeShares[0].amount).toBe(0);
    expect(result.perPerson[1].chargeShares[0].amount).toBe(3);
    expect(result.perPerson[2].chargeShares[0].amount).toBe(3);
  });

  it("falls back to everyone when appliesTo contains only unknown ids", () => {
    const items = [
      item({ id: "i1", price: 30, assignedTo: ["a"] }),
      item({ id: "i2", price: 10, assignedTo: ["b"] }),
    ];
    const charges: Charge[] = [
      { id: "t1", kind: "tax", label: "Tax", mode: "amount", value: 4, appliesTo: ["ghost"] },
    ];
    const result = calculateSplit(items, charges, people);
    expect(result.perPerson[0].chargeShares[0].amount).toBe(3);
    expect(result.perPerson[1].chargeShares[0].amount).toBe(1);
  });

  it("keeps the sum invariant with mixed targeted and untargeted charges", () => {
    const items = [
      item({ id: "i1", price: 12.5, assignedTo: ["a"] }),
      item({ id: "i2", price: 18.95, assignedTo: ["a", "b"] }),
      item({ id: "i3", price: 16.75, assignedTo: ["b", "c"] }),
    ];
    const charges: Charge[] = [
      { id: "c1", kind: "tax", label: "Tax", mode: "amount", value: 4.02 },
      { id: "c2", kind: "tip", label: "Tip", mode: "percent", value: 18, appliesTo: ["a", "c"] },
      { id: "c3", kind: "discount", label: "Birthday", mode: "amount", value: 5.55, appliesTo: ["b"] },
    ];
    const result = calculateSplit(items, charges, people);
    const sumOfTotals = result.perPerson.reduce((s, p) => s + p.total, 0);
    expect(Math.round(sumOfTotals * 100)).toBe(Math.round(result.grandTotal * 100));
  });
```

- [ ] **Step 3: Run tests to verify the new ones fail**

Run: `npx vitest run src/utils/meal/splitCalculations.test.ts`
Expected: the 5 new tests FAIL (targeted amounts land on everyone); existing tests PASS.

- [ ] **Step 4: Implement**

In `src/utils/meal/splitCalculations.ts`, replace the charges loop (currently the block starting `const resolvedCharges: ChargeShare[] = []` through the end of the `for (const charge of charges)` loop, including the `const weights = ...` line that precedes the loop) with:

```ts
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
```

(Untargeted charges: `eligibleIds === personIds` and `percentBaseCents === subtotalCents`, so behavior is identical to today. `allocateCents` on all-zero eligible weights splits evenly within the group.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/utils/meal/splitCalculations.test.ts`
Expected: PASS (whole run: `npx vitest run` → 40 total).

- [ ] **Step 6: Full check and commit**

Run: `npm run check-all` — expected pass.

```bash
git add src/types/meal.ts src/utils/meal/splitCalculations.ts src/utils/meal/splitCalculations.test.ts
git commit -m "Added per-person charge targeting to the money engine."
```

---

### Task 2: "Who pays?" UI, participant cleanup, summary annotation

**Files:**
- Modify: `src/app/meal/components/ExpenseItemsList.tsx` (props + charge rows)
- Modify: `src/app/meal/page.tsx:87-98` (handleParticipantsChange) and `:231-239` (props)
- Modify: `src/components/ExpenseSummary.tsx` (header + copy-text annotation)

**Interfaces:**
- Consumes: `Charge.appliesTo` (Task 1); `Person` from `@/types/meal`.
- Produces: `ExpenseItemsList` props gain `participants: Person[]`. No other API changes.

- [ ] **Step 1: page.tsx — pass participants and clean up charges on removal**

Add a charge-cleanup block to `handleParticipantsChange` (after the `setItems` call, before `setParticipants(next)`):

```tsx
    setCharges((prev) =>
      prev.map((charge) => {
        if (!charge.appliesTo) return charge;
        const kept = charge.appliesTo.filter((id) => validIds.has(id));
        if (kept.length === charge.appliesTo.length) return charge;
        return { ...charge, appliesTo: kept.length > 0 ? kept : undefined };
      })
    );
```

And add `participants={participants}` to the `<ExpenseItemsList ... />` render call.

- [ ] **Step 2: ExpenseItemsList — who-pays pill + chip row**

1. Props: add `participants: Person[]` to `ExpenseItemsListProps` and the destructure; import `Person` from `@/types/meal` and `Users` from `lucide-react`.
2. Local state: `const [editingWhoFor, setEditingWhoFor] = useState<string | null>(null);`
3. Helpers (inside the component, above `return`):

```tsx
  const targetedIds = (charge: Charge): string[] =>
    (charge.appliesTo ?? []).filter((id) =>
      participants.some((p) => p.id === id)
    );

  const targetLabel = (charge: Charge): string => {
    const ids = targetedIds(charge);
    if (ids.length === 0 || ids.length === participants.length) return "Everyone";
    const names = ids.map(
      (id) => participants.find((p) => p.id === id)?.name ?? ""
    );
    if (names.length === 1) return names[0];
    if (names.length === 2) return names.join(" & ");
    return `${names.length} people`;
  };

  const toggleChargeTarget = (chargeId: string, personId: string) => {
    onChargesChange(
      charges.map((charge) => {
        if (charge.id !== chargeId) return charge;
        const current = charge.appliesTo ?? [];
        const next = current.includes(personId)
          ? current.filter((id) => id !== personId)
          : [...current, personId];
        const normalized =
          next.length === 0 || next.length === participants.length
            ? undefined
            : next;
        return { ...charge, appliesTo: normalized };
      })
    );
  };
```

4. In the `charges.map` row, wrap the existing row `<div key={charge.id} className="flex items-center gap-3">` content in an outer `<div key={charge.id}>` (move the `key`), insert the pill button between the value `<input>` and the resolved-amount `<span>`:

```tsx
            <button
              type="button"
              onClick={() =>
                setEditingWhoFor((open) => (open === charge.id ? null : charge.id))
              }
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                targetedIds(charge).length > 0
                  ? "bg-blue-50 border border-blue-500 text-blue-700 font-semibold"
                  : "bg-gray-100 border border-dashed border-gray-400 text-gray-500"
              }`}
            >
              <Users className="w-3 h-3" />
              {targetLabel(charge)}
            </button>
```

and append the chip row inside the new outer div, after the flex row:

```tsx
            {editingWhoFor === charge.id && (
              <div className="flex flex-wrap items-center gap-2 mt-2 ml-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-400">
                  Who pays:
                </span>
                {participants.map((person) => {
                  const selected = targetedIds(charge).includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => toggleChargeTarget(charge.id, person.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        selected
                          ? "text-white border-transparent"
                          : "text-gray-500 border-gray-300 bg-transparent"
                      }`}
                      style={selected ? { backgroundColor: person.color } : undefined}
                    >
                      {selected ? "✓ " : ""}
                      {person.name}
                    </button>
                  );
                })}
                <span className="text-[10px] text-gray-400">
                  none selected = everyone
                </span>
              </div>
            )}
```

- [ ] **Step 3: ExpenseSummary — annotate targeted charges**

`ExpenseSummary` already receives `charges`. Add a helper inside the component:

```tsx
  const chargeTargetNote = (chargeId: string): string | null => {
    const charge = charges.find((c) => c.id === chargeId);
    const ids = (charge?.appliesTo ?? []).filter((id) =>
      participants.some((p) => p.id === id)
    );
    if (ids.length === 0 || ids.length === participants.length) return null;
    const names = ids
      .map((id) => participants.find((p) => p.id === id)?.name)
      .filter((name): name is string => typeof name === "string");
    if (names.length === 1) return names[0];
    if (names.length === 2) return names.join(" & ");
    return `${names.length} people`;
  };
```

Header breakdown label (`<div className="text-sm text-blue-600 ...">{charge.label}</div>`) becomes:

```tsx
              <div className="text-sm text-blue-600 dark:text-blue-400">
                {charge.label}
                {chargeTargetNote(charge.chargeId) !== null &&
                  ` · ${chargeTargetNote(charge.chargeId)}`}
              </div>
```

In `generateSummaryText`, the totals line per charge becomes:

```ts
        .map((charge) => {
          const note = chargeTargetNote(charge.chargeId);
          return `${charge.label}${note ? ` (${note})` : ""}: ${formatCurrency(charge.amount)}\n`;
        })
```

- [ ] **Step 4: Verify and commit**

Run: `npm run check-all` — expected pass. Dev-server check: add 3 people, items, a discount targeted at one person → pill shows the name, that person's summary card carries the full discount, header shows "Discount · Name".

```bash
git add src/app/meal/components/ExpenseItemsList.tsx src/app/meal/page.tsx src/components/ExpenseSummary.tsx
git commit -m "Added the who-pays control for targeted charges."
```

---

### Task 3: Receipt-paper theme foundation

**Files:**
- Modify: `src/app/meal/layout.tsx` (Space Mono font)
- Modify: `src/app/globals.css` (receipt utilities, appended at end)
- Create: `src/app/meal/components/ReceiptSurface.tsx`
- Modify: `src/app/meal/page.tsx` (backdrop, chrome, step wrapper)

**Interfaces:**
- Produces: `ReceiptSurface({ children, className? })` — paper card with perforated edges + receipt header, used by page.tsx now and referenced by later styling tasks. CSS utilities `.font-receipt`, `.receipt-paper`, `.receipt-dashed`.

- [ ] **Step 1: Font in the meal layout**

In `src/app/meal/layout.tsx`, add at the top:

```tsx
import { Space_Mono } from "next/font/google";

const receiptMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-receipt",
});
```

and change the default export body to:

```tsx
export default function MealLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={receiptMono.variable}>{children}</div>;
}
```

- [ ] **Step 2: CSS utilities**

Append to `src/app/globals.css`:

```css
/* Receipt-paper theme (meal calculator) */
.font-receipt {
  font-family: var(--font-receipt), "Courier New", monospace;
}

.receipt-paper {
  position: relative;
  background: #fdfbf7;
  color: #292524;
  border-radius: 2px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
}

.receipt-paper::before,
.receipt-paper::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 8px;
  background-repeat: repeat-x;
  background-size: 16px 16px;
}

.receipt-paper::before {
  bottom: 100%;
  background-image: linear-gradient(
      135deg,
      transparent 75%,
      #fdfbf7 75%
    ),
    linear-gradient(225deg, transparent 75%, #fdfbf7 75%);
  background-position: 0 100%, 8px 100%;
}

.receipt-paper::after {
  top: 100%;
  background-image: linear-gradient(45deg, #fdfbf7 25%, transparent 25%),
    linear-gradient(-45deg, #fdfbf7 25%, transparent 25%);
  background-position: 0 0, 8px 0;
}

.receipt-dashed {
  border-top: 1.5px dashed #d6d3d1;
}
```

Verify the perforation teeth visually on the dev server; if the two gradients misalign, adjust the `background-position` x-offsets (they must differ by half the `background-size`).

- [ ] **Step 3: ReceiptSurface component**

Create `src/app/meal/components/ReceiptSurface.tsx`:

```tsx
export function ReceiptSurface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`receipt-paper font-receipt px-5 py-8 sm:px-10 my-3 ${className}`}>
      <div className="text-center text-[11px] tracking-[0.25em] text-stone-400 uppercase">
        Everything Calculator
      </div>
      <div className="text-center text-[11px] tracking-[0.25em] text-stone-400 uppercase mb-6">
        · · · split receipt · · ·
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: page.tsx chrome**

1. Import: `import { ReceiptSurface } from "./components/ReceiptSurface";`
2. `<main>` className becomes:

```tsx
    <main className="min-h-screen bg-[radial-gradient(1100px_500px_at_50%_-10%,#2a2320,#171412)] bg-[#171412]">
```

3. Back button: `<Button variant="ghost" size="sm" className="text-stone-400 hover:text-white hover:bg-white/10">`
4. Title block:

```tsx
          <h1 className="font-receipt uppercase tracking-[0.2em] text-2xl sm:text-3xl font-bold text-stone-100 mb-2">
            Split the Check
          </h1>
          <p className="text-stone-400">
            Scan a receipt or build one from scratch — split it to the penny
          </p>
```

5. Step circles: replace the inactive classes — the circle className becomes:

```tsx
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                          isActive || isCompleted
                            ? "bg-green-600 text-white"
                            : "bg-stone-800 text-stone-500"
                        } ${index <= maxStepReached ? "cursor-pointer" : "cursor-default"}`}
```

   Step label: `isActive ? "text-green-400" : "text-stone-500"`. Connector: `isCompleted ? "bg-green-600" : "bg-stone-800"`. Step heading `h2`: `text-stone-100`; step description `p`: `text-stone-400`. "Step X of Y": `text-stone-500`.
6. Previous button: `<Button variant="outline" ... className="border-stone-700 bg-transparent text-stone-300 hover:bg-white/10 hover:text-white">`. Next button: `<Button onClick={handleNext} disabled={!canProceed()} className="bg-green-600 hover:bg-green-500 text-white">`.
7. Step content wrapper — extract the five step conditionals into a variable directly above the `return` (unchanged JSX, just moved):

```tsx
  const stepContent = (
    <>
      {currentStep === "upload" && ( ...existing... )}
      {currentStep === "participants" && ( ...existing... )}
      {currentStep === "items" && ( ...existing... )}
      {currentStep === "split" && ( ...existing... )}
      {currentStep === "summary" && ( ...existing... )}
    </>
  );
```

   and the motion.div becomes:

```tsx
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            {currentStep === "split" ? (
              stepContent
            ) : (
              <ReceiptSurface>{stepContent}</ReceiptSurface>
            )}
          </motion.div>
```

Known transitional state: inner components keep their old light-card styling and the split step sits unstyled on the dark backdrop until Tasks 4–7. Note this in the commit-time report; do not fix ahead.

- [ ] **Step 5: Verify and commit**

Run: `npm run check-all` — expected pass. Dev-server: dark table backdrop, paper surface with perforations on steps 1–3 and 5, mono receipt header, restyled step circles.

```bash
git add src/app/meal/layout.tsx src/app/globals.css src/app/meal/components/ReceiptSurface.tsx src/app/meal/page.tsx
git commit -m "Added the receipt-paper theme foundation."
```

---

### Task 4: Split step rewrite — strip, live totals, three-state cards

**Files:**
- Modify: `src/app/meal/components/DragDropSplitter.tsx` (full rewrite of layout; keep `itemShares`, `ExactSplitEditor` logic)
- Modify: `src/app/meal/page.tsx` (pass `charges` to the splitter)

**Interfaces:**
- Consumes: `calculateSplit(items, charges, participants)` for live totals; `allocateCents` (already imported); `Charge` from Task 1.
- Produces: `DragDropSplitterProps` gains `charges: Charge[]`. Internal components consumed by Task 5: `ItemCard` (module scope), strip avatar buttons carrying `data-person-id`.

- [ ] **Step 1: Update props and page call**

```ts
interface DragDropSplitterProps {
  items: ReceiptItem[];
  participants: Person[];
  charges: Charge[];
  onItemsChange: (items: ReceiptItem[]) => void;
}
```

In `page.tsx`, the split render becomes `<DragDropSplitter items={items} participants={participants} charges={charges} onItemsChange={setItems} />`.

- [ ] **Step 2: Rewrite the layout**

Keep unchanged (verbatim from the current file): the `itemShares` helper, the `ExactSplitEditor` component (restyle only its container to `bg-stone-100` instead of `bg-gray-50 dark:bg-gray-800`), `toggleAssignment`, `handleDragStart`, `handleDragEnd`, `splitEqually`, `clearAllAssignments`, the `useDraggable`/`useDroppable` wiring, and `DragOverlay` (shrink the overlay circle to `w-12 h-12`).

Delete: the hero header (`Sparkles` block), the "Quick Actions" row, the "Drag from here" participants panel with `ParticipantCard`, the "Drop onto items" heading, and the bottom "Assignment Progress" block. Delete the now-unused `ParticipantCard` component and the `Sparkles`, `UserPlus`, `DollarSign` imports (keep `Users`).

Add — per-person totals during render (inside the main component, above `return`):

```tsx
  const split = calculateSplit(items, charges, participants);
  const totalByPerson = new Map(
    split.perPerson.map((p) => [p.personId, p.total])
  );
  const assignedCount = items.filter((i) => i.assignedTo.length > 0).length;
```

(add `import { allocateCents, calculateSplit } from "@/utils/meal/splitCalculations";` and `Charge` to the type import).

New JSX skeleton inside `<DndContext ...>`:

```tsx
      <div className="space-y-3">
        {/* Sticky people strip */}
        <div className="sticky top-2 z-10 bg-stone-900/90 backdrop-blur border border-stone-700 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
          <div className="flex gap-2 overflow-x-auto">
            {participants.map((person) => (
              <StripAvatar
                key={person.id}
                person={person}
                total={totalByPerson.get(person.id) ?? 0}
              />
            ))}
          </div>
          <span className="text-xs text-stone-400 whitespace-nowrap ml-1">
            {assignedCount} of {items.length} assigned
          </span>
          <div className="ml-auto flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="border-stone-700 bg-transparent text-stone-300 hover:bg-white/10 hover:text-white h-7 px-2 text-xs"
              onClick={splitEqually}
            >
              <Users className="w-3 h-3 mr-1" />
              Split equally
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-stone-700 bg-transparent text-stone-400 hover:bg-white/10 hover:text-white h-7 px-2 text-xs"
              onClick={clearAllAssignments}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Item cards */}
        <div className="space-y-2">
          {items.map((item) => (
            <ItemCard ... /* existing props */ />
          ))}
        </div>
      </div>
```

`StripAvatar` (module scope — draggable, shows the live total):

```tsx
function StripAvatar({ person, total }: { person: Person; total: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: person.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-person-id={person.id}
      style={{ touchAction: "none" }}
      className={`flex flex-col items-center cursor-grab active:cursor-grabbing select-none ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-stone-900 shadow"
        style={{ backgroundColor: person.color }}
      >
        {person.name.charAt(0).toUpperCase()}
      </div>
      <span className="text-[10px] font-receipt text-stone-300 mt-0.5">
        ${total.toFixed(2)}
      </span>
    </div>
  );
}
```

`ItemCard` restyle — replace the card wrapper className logic with the three states (structure, chips, and the customize expander stay as they are):

```tsx
  const state: "unassigned" | "custom" | "assigned" =
    assignedParticipants.length === 0
      ? "unassigned"
      : item.exactSplits
      ? "custom"
      : "assigned";
  const edgeColor =
    state === "custom" ? "#8b5cf6" : assignedParticipants[0]?.color ?? "#3b82f6";

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg px-3 py-2.5 transition-all font-receipt ${
        state === "unassigned"
          ? `border-[1.5px] border-dashed ${
              isOver ? "border-blue-400 bg-blue-50" : "border-amber-500 bg-amber-50"
            }`
          : `bg-[#fdfbf7] border border-stone-200 shadow ${
              isOver ? "ring-2 ring-blue-400" : ""
            }`
      }`}
      style={
        state === "unassigned" ? undefined : { borderLeft: `4px solid ${edgeColor}` }
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-bold uppercase text-sm text-stone-800">
          {item.name}
        </span>
        <span className="text-sm text-stone-500">${item.price.toFixed(2)}</span>
        {state === "custom" && (
          <span className="text-[10px] font-bold tracking-wider text-violet-700 border-[1.5px] border-violet-600 rounded px-1 -rotate-3">
            CUSTOM
          </span>
        )}
        {state === "unassigned" && (
          <span className="text-xs text-amber-700">needs people</span>
        )}
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {/* existing participants.map chip buttons, unchanged logic; chips are sans (add `font-sans` to the chip button className) */}
        </div>
      </div>
      {/* existing customize-amounts expander, unchanged */}
    </div>
  );
```

The "Customize amounts" link and `ExactSplitEditor` behavior are unchanged; keep them below the flex row.

- [ ] **Step 3: Verify and commit**

Run: `npm run check-all` — expected pass, lint clean (no unused imports). Dev-server: strip is sticky with live per-person dollars updating as chips toggle; three card states render; dragging an avatar onto a card still toggles; ExactSplitEditor still works.

```bash
git add src/app/meal/components/DragDropSplitter.tsx src/app/meal/page.tsx
git commit -m "Rebuilt the split step as a compact receipt-themed surface."
```

---

### Task 5: Split interactions — spotlight, celebration, long-press

**Files:**
- Modify: `src/app/meal/components/DragDropSplitter.tsx`
- Modify: `src/app/meal/page.tsx` (Next-button pulse)

**Interfaces:**
- Consumes: Task 4's `StripAvatar`, `ItemCard`.
- Produces: nothing consumed later.

- [ ] **Step 1: Spotlight**

In the main component: `const [spotlightId, setSpotlightId] = useState<string | null>(null);`

`StripAvatar` gains props `isSpotlit: boolean; onSpotlight: () => void;` — wrap the avatar circle in a `<button type="button" onClick={onSpotlight}>` (keep drag listeners on the OUTER div so drag still works; a plain click that isn't a drag fires the button). Spotlit style: when spotlit, set `style={{ boxShadow: `0 0 0 2px #171412, 0 0 0 4px ${person.color}` }}` on the avatar circle (no ring classes needed). Strip render: `isSpotlit={spotlightId === person.id}` and `onSpotlight={() => setSpotlightId((cur) => (cur === person.id ? null : person.id))}`.

`ItemCard` gains `dimmed: boolean` — on the card wrapper add `${dimmed ? "opacity-35 saturate-50" : ""}`. In the main component's `items.map` render of `ItemCard`, pass `dimmed={spotlightId !== null && !item.assignedTo.includes(spotlightId)}`.

When `spotlightId` is set, show a clear affordance in the strip after the counter:

```tsx
          {spotlightId !== null && (
            <button
              type="button"
              onClick={() => setSpotlightId(null)}
              className="text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap"
            >
              clear focus ✕
            </button>
          )}
```

Note: dnd-kit's `useDraggable` listeners capture pointer events on the outer div; verify a simple tap still triggers the inner button's click (dnd-kit only suppresses click after an actual drag past the activation distance). If taps get swallowed, add `activationConstraint: { distance: 6 }` via `useSensor(PointerSensor, { activationConstraint: { distance: 6 } })` and pass `sensors` to `DndContext` (import `PointerSensor, useSensor, useSensors` from `@dnd-kit/core`).

- [ ] **Step 2: Celebration (event-driven — NOT in an effect)**

In the main component:

```tsx
  const [celebrate, setCelebrate] = useState(false);
  const celebrateTimer = useRef<number | null>(null);

  const maybeCelebrate = (nextItems: ReceiptItem[]) => {
    const wasComplete =
      items.length > 0 && items.every((i) => i.assignedTo.length > 0);
    const isComplete =
      nextItems.length > 0 && nextItems.every((i) => i.assignedTo.length > 0);
    if (!wasComplete && isComplete) {
      setCelebrate(true);
      if (celebrateTimer.current !== null) {
        window.clearTimeout(celebrateTimer.current);
      }
      celebrateTimer.current = window.setTimeout(() => setCelebrate(false), 1400);
    }
  };
```

Call `maybeCelebrate(nextItems)` with the computed next array inside `toggleAssignment`, `handleDragEnd`'s path (it calls toggleAssignment — covered), and `splitEqually`. To do that, restructure `toggleAssignment` and `splitEqually` to build `const next = items.map(...)` first, then `maybeCelebrate(next); onItemsChange(next);`.

Render the stamp over the strip (strip container gets `relative`):

```tsx
          <AnimatePresence>
            {celebrate && (
              <motion.div
                initial={{ opacity: 0, scale: 1.6, rotate: -14 }}
                animate={{ opacity: 1, scale: 1, rotate: -8 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              >
                <span className="font-receipt font-bold text-green-400 border-4 border-green-400 rounded px-4 py-1 text-lg tracking-widest bg-stone-900/80">
                  ALL ASSIGNED ✓
                </span>
              </motion.div>
            )}
          </AnimatePresence>
```

(import `AnimatePresence` from framer-motion, `useRef` from react).

- [ ] **Step 3: Next-button pulse**

In `page.tsx`, the Next button className becomes:

```tsx
                className={`bg-green-600 hover:bg-green-500 text-white ${
                  currentStep === "split" && canProceed() ? "animate-pulse" : ""
                }`}
```

- [ ] **Step 4: Long-press / double-click chip → exact editor**

Add a module-scope hook in `DragDropSplitter.tsx`:

```tsx
function useLongPress(onLongPress: () => void, onTap: () => void, ms = 500) {
  const timer = useRef<number | null>(null);
  const firedLong = useRef(false);
  const start = () => {
    firedLong.current = false;
    timer.current = window.setTimeout(() => {
      firedLong.current = true;
      onLongPress();
    }, ms);
  };
  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    onPointerDown: start,
    onPointerUp: () => {
      cancel();
      if (!firedLong.current) onTap();
    },
    onPointerLeave: cancel,
    onDoubleClick: onLongPress,
  };
}
```

Chips can't call hooks in a loop — extract the chip into a module-scope `PersonChip` component:

```tsx
function PersonChip({
  person,
  isAssigned,
  share,
  onToggle,
  onOpenExact,
  canOpenExact,
}: {
  person: Person;
  isAssigned: boolean;
  share: number | undefined;
  onToggle: () => void;
  onOpenExact: () => void;
  canOpenExact: boolean;
}) {
  const press = useLongPress(
    () => {
      if (canOpenExact) onOpenExact();
      else onToggle();
    },
    onToggle
  );
  return (
    <button
      type="button"
      {...press}
      onClick={(event) => event.preventDefault()}
      className={`flex items-center px-2 py-1 rounded-full text-xs font-medium font-sans transition-all border select-none ${
        isAssigned
          ? "text-white border-transparent"
          : "text-stone-500 border-stone-300 bg-transparent"
      }`}
      style={isAssigned ? { backgroundColor: person.color } : undefined}
    >
      {person.name}
      {isAssigned && share !== undefined && (
        <span className="ml-1 opacity-90">${share.toFixed(2)}</span>
      )}
    </button>
  );
}
```

In `ItemCard`, replace the inline chip buttons with `PersonChip` instances: `canOpenExact={isAssigned && assignedParticipants.length >= 2}`, `onOpenExact={() => setIsEditingAmounts(true)}`, `onToggle={() => onToggle(person.id)}`. (Because the tap now fires on pointer-up, the `onClick` handler is reduced to `preventDefault` to avoid double-firing.)

- [ ] **Step 5: Verify and commit**

Run: `npm run check-all` — expected pass. Dev-server: tap avatar → other cards dim, tap again → clears; assign last item → stamp animation + pulsing Next; long-press an assigned chip on a 2+-person item → exact editor opens; quick tap still toggles.

```bash
git add src/app/meal/components/DragDropSplitter.tsx src/app/meal/page.tsx
git commit -m "Added spotlight, celebration, and long-press interactions to the split step."
```

---

### Task 6: Receipt styling — items & charges step

**Files:**
- Modify: `src/app/meal/components/ExpenseItemsList.tsx` (presentation only — no behavior changes)

**Interfaces:** none change. All handlers, state, and the who-pays control from Task 2 stay as-is.

- [ ] **Step 1: Apply the restyle map**

This component now renders ON the paper surface (`ReceiptSurface`), so dark-mode-oriented grays and card boxes become receipt print. Behavior-preserving class swaps:

| Element | New styling |
| --- | --- |
| Header block (`Package` icon + "Review Items") | Delete the icon. `<h3>` → `text-sm font-bold uppercase tracking-[0.2em] text-stone-800 text-center`; `<p>` → `text-xs text-stone-500 text-center`; wrap the block's bottom with `<div className="receipt-dashed mt-4" />` |
| Mismatch banner | `border-[1.5px] border-dashed border-amber-600 bg-amber-50 rounded p-3`; text `text-xs uppercase tracking-wide text-amber-800`; keep the `AlertTriangle` |
| Item row card (`bg-gray-50 dark:bg-gray-700 rounded-lg p-4`) | `border-b border-dashed border-stone-300 py-2.5 px-0 rounded-none bg-transparent` |
| Item display row | name `<h4>` → `uppercase text-sm font-bold text-stone-800`; price span → `text-sm font-bold text-stone-800` (move price to the right side of the same row: `flex justify-between items-center`, price before the edit/delete buttons); delete the extra price line below the name |
| Edit/delete ghost buttons | add `text-stone-400 hover:text-stone-700 h-7 w-7 p-0` |
| Inputs (item edit, add-new, charge value) | `border-stone-300 bg-white text-stone-800 rounded` (drop all `dark:` classes in this file) |
| Add Custom Item button | `border-dashed border-2 border-stone-300 text-stone-500 hover:border-green-600 hover:text-green-700 h-12` |
| Charges section wrapper (`bg-gray-50 dark:bg-gray-800 rounded-xl p-6`) | `receipt-dashed pt-4 space-y-3` (no box — it's a region of the same receipt) |
| Charges heading | `text-xs font-bold uppercase tracking-[0.2em] text-stone-600` (keep `Receipt` icon at `w-4 h-4`) |
| Tip preset buttons | `border-stone-300 text-stone-600 hover:bg-stone-100 h-7 px-2 text-xs` |
| Charge label span | `uppercase text-xs font-bold text-stone-700` |
| $/% toggle | active: `bg-green-100 text-green-800`; inactive: `bg-white text-stone-400`; border `border-stone-300` |
| Who-pays pill (Task 2) | targeted: `bg-stone-800 text-amber-50 border border-stone-800`; untargeted: `bg-transparent border border-dashed border-stone-400 text-stone-500` |
| Add-charge buttons row | `border-t-0` (the section already opens with receipt-dashed); buttons `border-stone-300 text-stone-600 hover:bg-stone-100` |
| Totals footer (`bg-white ... rounded-xl p-4`) | replace the box with a receipt total block:

```tsx
      <div className="receipt-dashed pt-3 space-y-1 text-sm">
        <div className="text-center text-stone-400 text-xs tracking-[0.5em]">✂ · · · · · · · · ·</div>
        <div className="flex justify-between text-stone-600">
          <span className="uppercase text-xs tracking-wider">
            Subtotal ({items.length} {items.length === 1 ? "item" : "items"})
          </span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        {totals.charges.map((charge) => (
          <div key={charge.chargeId} className="flex justify-between text-stone-600">
            <span className="uppercase text-xs tracking-wider">{charge.label}</span>
            <span>{formatCurrency(charge.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-stone-900 text-base pt-1 border-t-2 border-stone-800">
          <span className="uppercase tracking-wider">Total</span>
          <span>{formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>
``` |

Also remove the `motion.div` per-item entrance stagger delay `index * 0.1` → `index * 0.03` (receipt lines should print fast).

- [ ] **Step 2: Verify and commit**

Run: `npm run check-all` — expected pass. Dev-server: step 3 reads like a printed receipt (uppercase mono lines, dashed separators, total block), charges behave identically, who-pays pill styled to match.

```bash
git add src/app/meal/components/ExpenseItemsList.tsx
git commit -m "Styled the items and charges step as a printed receipt."
```

---

### Task 7: Receipt styling — upload, participants, summary mini-receipts

**Files:**
- Modify: `src/app/meal/components/ImageUpload.tsx` (presentation only)
- Modify: `src/components/ParticipantManager.tsx` (presentation only)
- Modify: `src/components/ExpenseSummary.tsx` (presentation; per-person cards become mini receipts)

**Interfaces:** none change.

- [ ] **Step 1: ImageUpload restyle map**

| Element | New styling |
| --- | --- |
| Scan dropzone card | `border-2 border-dashed rounded-lg p-8` with `border-stone-300 hover:border-stone-500` (drag-active: `border-green-600 bg-green-50`); headings `text-stone-800`, body `text-stone-500`; drop all `dark:` classes in this file |
| Start-from-scratch card | `border-2 border-dashed border-stone-300 rounded-lg p-8 hover:border-green-600` — headings/body same treatment |
| Scanning indicator pill | `bg-stone-100 border border-stone-300 text-stone-700` (keep the pulsing `Zap`) |
| Success pill | `bg-green-50 border border-green-600 text-green-800` |
| `ScanErrorNotice` banner | `border-[1.5px] border-dashed border-amber-600 bg-amber-50 text-amber-800` |
| "Take Photo" / retry / manual buttons | outline: `border-stone-300 text-stone-700 hover:bg-stone-100`; primary: `bg-green-600 hover:bg-green-500 text-white` |

- [ ] **Step 2: ParticipantManager restyle map**

| Element | New styling |
| --- | --- |
| Any `dark:` classes in this file | remove (always renders on paper) |
| Headings | `text-stone-800`; helper text `text-stone-500` |
| Participant rows/cards | `border-b border-dashed border-stone-300 py-2 bg-transparent` (no boxes) |
| Avatar circle | keep person color; add `ring-2 ring-white shadow` (sticker look) |
| Name text | `font-receipt uppercase text-sm text-stone-800` |
| Add-participant input | `border-stone-300 bg-white text-stone-800` |
| Add/remove buttons | outline `border-stone-300 text-stone-600 hover:bg-stone-100`; remove (X) `text-stone-400 hover:text-red-600` |

Apply the table to whatever structure exists in the file — this is a reskin, not a rebuild; do not change handlers, state, or layout structure beyond the class names above.

- [ ] **Step 3: ExpenseSummary — mini receipts**

1. Remove all `dark:` classes in this file (always on paper).
2. Header block: delete the `Receipt` icon block; `<h3>` → `text-sm font-bold uppercase tracking-[0.2em] text-stone-800 text-center`, `<p>` → `text-xs text-stone-500 text-center`.
3. Total-overview box (blue gradient) → receipt totals block, same pattern as Task 6's footer:

```tsx
      <div className="text-center space-y-1">
        <div className="text-4xl font-bold text-stone-900 font-receipt">
          {formatCurrency(result.grandTotal)}
        </div>
        <p className="text-xs uppercase tracking-wider text-stone-500">
          split among {participants.length} people
        </p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 pt-2 text-sm text-stone-600">
          <span>Subtotal {formatCurrency(result.subtotal)}</span>
          {result.charges.map((charge) => (
            <span key={charge.chargeId}>
              {charge.label}
              {chargeTargetNote(charge.chargeId) !== null &&
                ` · ${chargeTargetNote(charge.chargeId)}`}{" "}
              {formatCurrency(charge.amount)}
            </span>
          ))}
        </div>
        <div className="receipt-dashed mt-3" />
      </div>
```

4. Per-person card (`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border ...`) becomes a mini paper slip ON the paper — use an inset outline:

```tsx
              className="border border-stone-300 rounded-sm px-4 py-3 shadow-sm bg-white"
```

   Inside: person name → `font-receipt uppercase font-bold text-stone-800`; the big total → `text-xl font-bold text-stone-900 font-receipt`; "% of total" and "Items:" sublines → `text-xs text-stone-500`; item/charge line rows → `text-sm text-stone-700` with amounts `text-stone-900`; add `<div className="receipt-dashed my-2" />` between the header row and the line items, and a bold `border-t-2 border-stone-800` TOTAL row at the bottom of each card:

```tsx
                <div className="flex justify-between font-bold text-stone-900 border-t-2 border-stone-800 pt-1 mt-2 text-sm">
                  <span className="uppercase">Total</span>
                  <span>{formatCurrency(calc.total)}</span>
                </div>
```

5. Payment-tips yellow box → receipt small print:

```tsx
      <div className="text-center text-[11px] text-stone-400 font-receipt space-y-1 pt-2">
        <div className="tracking-[0.3em] uppercase">* * * thank you * * *</div>
        <div>settle up with Venmo, PayPal, or Zelle</div>
        <div>round to the nearest dollar if everyone agrees</div>
      </div>
```

6. Copy Summary button: `bg-stone-800 hover:bg-stone-700 text-amber-50` (a "print again" vibe); keep behavior.

- [ ] **Step 4: Verify and commit**

Run: `npm run check-all` — expected pass. Dev-server: full wizard pass in the theme — every step coherent on paper/dark table; summary shows mini receipts with a bold TOTAL rule per person.

```bash
git add src/app/meal/components/ImageUpload.tsx src/components/ParticipantManager.tsx src/components/ExpenseSummary.tsx
git commit -m "Applied the receipt theme to the upload, people, and summary steps."
```

---

### Task 8: Homepage card + final verification

**Files:**
- Modify: `src/components/ExpenseTypeSelector.tsx`

**Interfaces:** none.

- [ ] **Step 1: Move and retitle the meal card; remove `as const`**

1. Define a shared type at the top of the file (after imports) and type both arrays with it — this removes the need for every `as const`:

```tsx
import type { LucideIcon } from "lucide-react";

interface CalculatorCard {
  id: string;
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  features: string[];
}
```

   `const availableTypes: CalculatorCard[] = [...]` and `const comingSoonTypes: CalculatorCard[] = [...]`, deleting every `as const` in the file.
2. Move the meal entry from `comingSoonTypes` to `availableTypes` (after the car entry) with this content:

```tsx
    {
      id: 'meal',
      href: '/meal',
      title: 'Split a Check',
      description: 'Scan a receipt or build one from scratch, then split it fairly to the penny',
      icon: UtensilsCrossed,
      color: 'from-green-400 to-green-600',
      features: ['AI receipt scanning', 'Tap-to-split items', 'Tax, tip & targeted discounts']
    },
```

3. Footer blurb: replace the `Upload` icon + "All expense types support image upload and automatic item detection" with:

```tsx
          <Clock className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            More calculators on the way
          </span>
```

   (drop the now-unused `Upload` import).

- [ ] **Step 2: Full verification**

1. Run: `npm run check-all` — expected: type-check, lint, 40 tests, build all pass; build lists `/`, `/car`, `/general`, `/hotel`, `/meal` routes and the `/api/scan-receipt` function.
2. Dev-server pass:
   - Homepage: "Split a Check" card is in Available Calculators and navigates to `/meal`.
   - Full flow in the theme: scratch → 3 people → items + tax + a discount targeted at one person (pill shows the name) → split step (live totals, spotlight, celebration stamp, long-press exact editor) → summary (targeted discount only on that person's mini receipt; header annotated).
   - All 5 routes return 200.

- [ ] **Step 3: Commit**

```bash
git add src/components/ExpenseTypeSelector.tsx
git commit -m "Made the check splitter available from the homepage."
```
