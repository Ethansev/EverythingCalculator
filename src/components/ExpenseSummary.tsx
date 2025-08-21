"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Download,
  DollarSign,
  Receipt,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";
import type { Person, ExpenseItem, MealTotals } from "@/types/meal";
import type { SplitCalculation } from "@/types/common";

interface ExpenseSummaryProps {
  items: ExpenseItem[];
  participants: Person[];
  totals?: MealTotals;
}

export function ExpenseSummary({
  items,
  participants,
  totals,
}: ExpenseSummaryProps) {
  const [copied, setCopied] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);

  // Use provided totals or calculate defaults
  const currentTotals = totals || {
    subtotal,
    tax: subtotal * 0.0875,
    tip: subtotal * 0.18,
    total: subtotal * 1.2675,
  };

  const calculations: SplitCalculation[] = participants.map((person) => {
    const personItems = items.filter((item) =>
      item.assignedTo.includes(person.id)
    );
    const personSubtotal = personItems.reduce((sum, item) => {
      return sum + item.price / item.assignedTo.length;
    }, 0);

    // Calculate this person's share of tax and tip based on their subtotal percentage
    const sharePercentage = subtotal > 0 ? personSubtotal / subtotal : 0;
    const personTax = currentTotals.tax * sharePercentage;
    const personTip = currentTotals.tip * sharePercentage;
    const personTotal = personSubtotal + personTax + personTip;

    return {
      personId: person.id,
      subtotal: personSubtotal,
      tax: personTax,
      tip: personTip,
      total: personTotal,
      items: personItems,
    };
  });
  const getPersonById = (id: string) => participants.find((p) => p.id === id)!;

  const generateSummaryText = () => {
    const header = "💰 Expense Split Summary\n\n";
    const totalsText = `Subtotal: $${currentTotals.subtotal.toFixed(
      2
    )}\nTax: $${currentTotals.tax.toFixed(
      2
    )}\nTip: $${currentTotals.tip.toFixed(
      2
    )}\nTotal: $${currentTotals.total.toFixed(2)}\n\n`;

    const splits = calculations
      .map((calc) => {
        const person = getPersonById(calc.personId);
        const itemsList = calc.items
          .map(
            (item) =>
              `  • ${item.name}: $${(
                item.price / item.assignedTo.length
              ).toFixed(2)}`
          )
          .join("\n");

        return `${person.name}: $${calc.total.toFixed(
          2
        )}\n  Subtotal: $${calc.subtotal.toFixed(
          2
        )}\n  Tax: $${calc.tax.toFixed(2)}\n  Tip: $${calc.tip.toFixed(
          2
        )}\n${itemsList}`;
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
              {currentTotals.total.toFixed(2)}
            </span>
          </div>
          <p className="text-blue-700 dark:text-blue-300">
            Total expense split among {participants.length} people
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              ${currentTotals.subtotal.toFixed(2)}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              Subtotal
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              ${currentTotals.tax.toFixed(2)}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Tax</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              ${currentTotals.tip.toFixed(2)}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Tip</div>
          </div>
        </div>
      </div>

      {/* Individual Splits */}
      <div className="space-y-4">
        {calculations.map((calc, index) => {
          const person = getPersonById(calc.personId);
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
                      {calc.items.length} item
                      {calc.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${calc.total.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {((calc.total / currentTotals.total) * 100).toFixed(1)}% of
                    total
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Items: ${calc.subtotal.toFixed(2)} + Tax: $
                    {calc.tax.toFixed(2)} + Tip: ${calc.tip.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Items breakdown */}
              <div className="space-y-2">
                {calc.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.name}
                      {item.assignedTo.length > 1 && (
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          (split {item.assignedTo.length} ways)
                        </span>
                      )}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${(item.price / item.assignedTo.length).toFixed(2)}
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

        <Button variant="outline">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>

        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export PDF
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
