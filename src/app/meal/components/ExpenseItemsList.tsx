"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Edit3, Trash2, Receipt, AlertTriangle, X, Users } from "lucide-react";
import type { Charge, ChargeKind, Person, ReceiptItem } from "@/types/meal";
import { calculateSplit } from "@/utils/meal/splitCalculations";

interface ExpenseItemsListProps {
  items: ReceiptItem[];
  onItemsChange: (items: ReceiptItem[]) => void;
  charges: Charge[];
  onChargesChange: (charges: Charge[]) => void;
  scannedTotal: number | null;
  participants: Person[];
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
  participants,
}: ExpenseItemsListProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: "", price: "" });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingWhoFor, setEditingWhoFor] = useState<string | null>(null);

  const updateItem = (id: string, updates: Partial<ReceiptItem>) => {
    onItemsChange(
      items.map((item) => {
        if (item.id !== id) return item;
        const merged = { ...item, ...updates };
        if (updates.price !== undefined) merged.exactSplits = undefined;
        return merged;
      })
    );
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

  // Totals-only invocation of the money engine: no people, so perPerson is
  // empty but subtotal / resolved charges / grandTotal are exact.
  const totals = calculateSplit(items, charges, []);
  const mismatch =
    scannedTotal !== null && Math.abs(totals.grandTotal - scannedTotal) > 0.01;

  return (
    <div className="space-y-6">
      {mismatch && (
        <div className="flex items-start border-[1.5px] border-dashed border-amber-600 bg-amber-50 rounded p-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mr-2 mt-0.5 shrink-0" />
          <p className="text-xs uppercase tracking-wide text-amber-800">
            The items and charges below add up to{" "}
            <strong>{formatCurrency(totals.grandTotal)}</strong>, but the receipt
            total reads <strong>{formatCurrency(scannedTotal)}</strong>. Check the
            detected prices and charges before splitting.
          </p>
        </div>
      )}

      {/* Items */}
      <div className="text-center">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-800 text-center">
          Review Items
        </h3>
        <p className="text-xs text-stone-500 text-center">
          Add, edit, or remove items and charges before splitting
        </p>
        <div className="receipt-dashed mt-4" />
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="border-b border-dashed border-stone-300 py-2.5 px-0 rounded-none bg-transparent"
          >
            {editingItem === item.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    updateItem(item.id, { name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-800 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Item name"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(item.id, {
                        price: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="flex-1 px-3 py-2 border border-stone-300 bg-white text-stone-800 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <Button size="sm" onClick={() => setEditingItem(null)} type="button">
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingItem(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <h4 className="uppercase text-sm font-bold text-stone-800 flex-1">
                  {item.name}
                </h4>
                <span className="text-sm font-bold text-stone-800 mr-2">
                  {formatCurrency(item.price)}
                </span>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingItem(item.id)}
                    className="text-stone-400 hover:text-stone-700 h-7 w-7 p-0"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteItem(item.id)}
                    className="text-stone-400 hover:text-stone-700 h-7 w-7 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {/* Add New Item */}
        {isAddingNew ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <div className="space-y-3">
              <input
                type="text"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-stone-300 bg-white text-stone-800 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Item name"
                autoFocus
              />
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, price: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-stone-300 bg-white text-stone-800 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <Button
                  size="sm"
                  onClick={addNewItem}
                  disabled={!newItem.name.trim() || !newItem.price}
                >
                  Add
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewItem({ name: "", price: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsAddingNew(true)}
            className="w-full border-dashed border-2 border-stone-300 text-stone-500 hover:border-green-600 hover:text-green-700 h-12"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Custom Item
          </Button>
        )}
      </div>

      {/* Charges */}
      <div className="receipt-dashed pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-stone-600 flex items-center">
            <Receipt className="w-4 h-4 mr-2" />
            Tax, Tip & Other Charges
          </h4>
          <div className="flex items-center gap-1">
            <span className="text-sm text-stone-500 mr-1">Tip:</span>
            {TIP_PRESETS.map((percent) => (
              <Button key={percent} variant="outline" size="sm" onClick={() => setTipPercent(percent)} className="border-stone-300 text-stone-600 hover:bg-stone-100 h-7 px-2 text-xs">
                {percent}%
              </Button>
            ))}
          </div>
        </div>

        {charges.length === 0 && (
          <p className="text-sm text-stone-500">
            No charges yet — add tax, tip, gratuity, or a discount below.
          </p>
        )}

        {charges.map((charge) => (
          <div key={charge.id}>
            <div className="flex items-center gap-3">
              <span className="w-24 uppercase text-xs font-bold text-stone-700">
                {charge.label}
              </span>
              <div className="flex rounded-lg overflow-hidden border border-stone-300">
                <button
                  type="button"
                  onClick={() => updateCharge(charge.id, { mode: "amount" })}
                  className={`px-2 py-1 text-sm ${
                    charge.mode === "amount"
                      ? "bg-green-100 text-green-800"
                      : "bg-white text-stone-400"
                  }`}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => updateCharge(charge.id, { mode: "percent" })}
                  className={`px-2 py-1 text-sm ${
                    charge.mode === "percent"
                      ? "bg-green-100 text-green-800"
                      : "bg-white text-stone-400"
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
                className="w-28 px-3 py-1 border border-stone-300 bg-white text-stone-800 rounded text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setEditingWhoFor((open) => (open === charge.id ? null : charge.id))
                }
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                  targetedIds(charge).length > 0
                    ? "bg-stone-800 text-amber-50 border border-stone-800"
                    : "bg-transparent border border-dashed border-stone-400 text-stone-500"
                }`}
              >
                <Users className="w-3 h-3" />
                {targetLabel(charge)}
              </button>
              <span className="text-sm text-stone-500 flex-1">
                {formatCurrency(
                  totals.charges.find((c) => c.chargeId === charge.id)?.amount ?? 0
                )}
              </span>
              <Button variant="ghost" size="sm" onClick={() => removeCharge(charge.id)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {editingWhoFor === charge.id && (
              <div className="flex flex-wrap items-center gap-2 mt-2 ml-2">
                <span className="text-[10px] uppercase tracking-wider text-stone-400">
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
                          : "text-stone-500 border-stone-300 bg-transparent"
                      }`}
                      style={selected ? { backgroundColor: person.color } : undefined}
                    >
                      {selected ? "✓ " : ""}
                      {person.name}
                    </button>
                  );
                })}
                <span className="text-[10px] text-stone-400">
                  none selected = everyone
                </span>
              </div>
            )}
          </div>
        ))}

        <div className="flex flex-wrap gap-2 pt-2 border-t-0">
          {CHARGE_DEFS.map(({ kind, label }) => (
            <Button key={kind} variant="outline" size="sm" onClick={() => addCharge(kind, label)} className="border-stone-300 text-stone-600 hover:bg-stone-100">
              <Plus className="w-4 h-4 mr-1" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Totals footer */}
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
    </div>
  );
}
