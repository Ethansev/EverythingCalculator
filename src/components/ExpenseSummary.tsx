"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
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
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-stone-800 text-center">
          Split Summary
        </h3>
        <p className="text-xs text-stone-500 text-center">
          Here&apos;s how much each person owes
        </p>
      </div>

      {/* Total Overview */}
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
              className="border border-stone-300 rounded-sm px-4 py-3 shadow-sm bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium mr-3"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-receipt uppercase font-bold text-stone-800">
                      {person.name}
                    </h4>
                    <p className="text-xs text-stone-500">
                      Items: {formatCurrency(calc.subtotal)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-stone-900 font-receipt">
                    {formatCurrency(calc.total)}
                  </div>
                  <div className="text-xs text-stone-500">
                    {result.grandTotal > 0
                      ? ((calc.total / result.grandTotal) * 100).toFixed(1)
                      : "0.0"}
                    % of total
                  </div>
                </div>
              </div>

              <div className="receipt-dashed my-2" />

              {/* Items breakdown */}
              <div className="space-y-2">
                {calc.itemShares.map((share, shareIndex) => (
                  <div
                    key={`${share.itemId}-${shareIndex}`}
                    className="flex items-center justify-between text-sm text-stone-700"
                  >
                    <span>
                      {share.itemName}
                      {share.shareCount > 1 && (
                        <span className="text-stone-500 ml-1">
                          {share.isCustom
                            ? "(custom)"
                            : `(split ${share.shareCount} ways)`}
                        </span>
                      )}
                    </span>
                    <span className="font-medium text-stone-900">
                      {formatCurrency(share.amount)}
                    </span>
                  </div>
                ))}
                {calc.chargeShares
                  .filter((charge) => charge.amount !== 0)
                  .map((charge) => (
                    <div
                      key={charge.chargeId}
                      className="flex items-center justify-between text-sm text-stone-700"
                    >
                      <span>
                        {charge.label}
                      </span>
                      <span className="text-stone-900">
                        {formatCurrency(charge.amount)}
                      </span>
                    </div>
                  ))}
              </div>

              <div className="flex justify-between font-bold text-stone-900 border-t-2 border-stone-800 pt-1 mt-2 text-sm">
                <span className="uppercase">Total</span>
                <span>{formatCurrency(calc.total)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center pt-6 border-t border-stone-200">
        <Button
          onClick={copyToClipboard}
          className="flex items-center bg-stone-800 hover:bg-stone-700 text-amber-50"
        >
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

      {/* Receipt small print */}
      <div className="text-center text-[11px] text-stone-400 font-receipt space-y-1 pt-2">
        <div className="tracking-[0.3em] uppercase">* * * thank you * * *</div>
        <div>settle up with Venmo, PayPal, or Zelle</div>
        <div>round to the nearest dollar if everyone agrees</div>
      </div>
    </div>
  );
}
