"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DollarSign, Receipt, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Person, ReceiptItem, Charge } from "@/types/meal";
import { calculateSplit } from "@/utils/meal/splitCalculations";

interface ExpenseSummaryProps {
  items: ReceiptItem[];
  participants: Person[];
  charges: Charge[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export function ExpenseSummary({
  items,
  participants,
  charges,
}: ExpenseSummaryProps) {
  const [copied, setCopied] = useState(false);

  const result = calculateSplit(items, charges, participants);
  const getPersonById = (id: string) => participants.find((p) => p.id === id);

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

  const generateSummaryText = () => {
    const header = "💰 Expense Split Summary\n\n";
    const totalsText =
      `Subtotal: ${formatCurrency(result.subtotal)}\n` +
      result.charges
        .map((charge) => {
          const note = chargeTargetNote(charge.chargeId);
          return `${charge.label}${note ? ` (${note})` : ""}: ${formatCurrency(charge.amount)}\n`;
        })
        .join("") +
      `Total: ${formatCurrency(result.grandTotal)}\n\n`;

    const splits = result.perPerson
      .map((calc) => {
        const person = getPersonById(calc.personId);
        const name = person?.name ?? calc.personId;
        const itemLines = calc.itemShares
          .map((share) => {
            const annotation =
              share.shareCount > 1
                ? share.isCustom
                  ? " (custom)"
                  : ` (split ${share.shareCount} ways)`
                : "";
            return `  • ${share.itemName}${annotation}: ${formatCurrency(share.amount)}`;
          })
          .join("\n");
        const chargeLines = calc.chargeShares
          .filter((charge) => charge.amount !== 0)
          .map((charge) => `  • ${charge.label}: ${formatCurrency(charge.amount)}`)
          .join("\n");

        return (
          `${name}: ${formatCurrency(calc.total)}\n` +
          (itemLines ? itemLines + "\n" : "") +
          (chargeLines ? chargeLines : "")
        );
      })
      .join("\n\n");

    return header + totalsText + splits;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateSummaryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Receipt className="w-12 h-12 mx-auto text-green-600 dark:text-green-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Split Summary
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Here&apos;s how much each person owes
        </p>
      </div>

      {/* Total Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-2">
            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
            <span className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(result.grandTotal)}
            </span>
          </div>
          <p className="text-blue-700 dark:text-blue-300">
            Total expense split among {participants.length} people
          </p>
        </div>

        {/* Breakdown */}
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
              <div className="text-sm text-blue-600 dark:text-blue-400">
                {charge.label}
                {chargeTargetNote(charge.chargeId) !== null &&
                  ` · ${chargeTargetNote(charge.chargeId)}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Splits */}
      <div className="space-y-4">
        {result.perPerson.map((calc, index) => {
          const person = getPersonById(calc.personId);
          if (!person) return null;
          return (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium mr-3"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {person.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {calc.itemShares.length} item
                      {calc.itemShares.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(calc.total)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {result.grandTotal > 0
                      ? ((calc.total / result.grandTotal) * 100).toFixed(1)
                      : "0.0"}
                    % of total
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Items: {formatCurrency(calc.subtotal)}
                  </div>
                </div>
              </div>

              {/* Items breakdown */}
              <div className="space-y-2">
                {calc.itemShares.map((share, shareIndex) => (
                  <div
                    key={`${share.itemId}-${shareIndex}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {share.itemName}
                      {share.shareCount > 1 && (
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          {share.isCustom
                            ? "(custom)"
                            : `(split ${share.shareCount} ways)`}
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
                    <div
                      key={charge.chargeId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-500 dark:text-gray-400">
                        {charge.label}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatCurrency(charge.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={copyToClipboard} className="flex items-center">
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Summary
            </>
          )}
        </Button>
      </div>

      {/* Payment suggestions */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h5 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          💡 Quick Payment Tips
        </h5>
        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <li>• Use Venmo, PayPal, or Zelle for easy digital payments</li>
          <li>• Consider who paid initially and calculate net amounts</li>
          <li>• Round to nearest dollar for convenience if everyone agrees</li>
        </ul>
      </div>
    </div>
  );
}
