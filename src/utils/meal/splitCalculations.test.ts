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
