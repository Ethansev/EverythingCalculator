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
