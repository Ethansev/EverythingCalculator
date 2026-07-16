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

      {/* Items */}
      <div className="text-center">
        <Package className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Review Detected Items
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Verify and edit the items and prices detected from your receipt
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
          >
            {editingItem === item.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    updateItem(item.id, { name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Item name"
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(item.id, {
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                  <Button size="sm" onClick={() => setEditingItem(null)}>
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
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </h4>
                  <div className="flex items-center mt-1">
                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingItem(item.id)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteItem(item.id)}
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
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
          >
            <div className="space-y-3">
              <input
                type="text"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
            className="w-full border-dashed border-2 h-16 hover:border-blue-500 dark:hover:border-blue-400"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Custom Item
          </Button>
        )}
      </div>

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
