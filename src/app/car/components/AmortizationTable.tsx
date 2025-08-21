"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import type { LoanResults } from "../utils/loanCalculations";

interface AmortizationTableProps {
  results: LoanResults;
  loanTerm: number;
  interestRate: number;
}

export function AmortizationTable({
  results,
  loanTerm,
  interestRate,
}: AmortizationTableProps) {
  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("yearly");
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const downloadCSV = () => {
    const headers = [
      "Payment #",
      "Payment Amount",
      "Principal",
      "Interest",
      "Balance",
    ];
    const rows = results.schedule.map((item) => [
      item.month,
      item.payment.toFixed(2),
      item.principal.toFixed(2),
      item.interest.toFixed(2),
      item.balance.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loan-amortization-schedule.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Group payments by year
  const yearlyData = [];
  for (let year = 1; year <= Math.ceil(loanTerm / 12); year++) {
    const startMonth = (year - 1) * 12 + 1;
    const endMonth = Math.min(year * 12, loanTerm);

    let yearlyPrincipal = 0;
    let yearlyInterest = 0;
    let yearlyPayments = 0;
    const monthlyPayments = [];

    for (let month = startMonth; month <= endMonth; month++) {
      const payment = results.schedule[month - 1];
      if (payment) {
        yearlyPrincipal += payment.principal;
        yearlyInterest += payment.interest;
        yearlyPayments += payment.payment;
        monthlyPayments.push(payment);
      }
    }

    yearlyData.push({
      year,
      principal: yearlyPrincipal,
      interest: yearlyInterest,
      totalPayments: yearlyPayments,
      monthlyPayments,
      startingBalance:
        results.schedule[startMonth - 1]?.balance +
          results.schedule[startMonth - 1]?.principal || results.loanAmount,
      endingBalance: results.schedule[endMonth - 1]?.balance || 0,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Amortization Schedule
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode("yearly")}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                viewMode === "yearly"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                viewMode === "monthly"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              Monthly
            </button>
          </div>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {viewMode === "yearly" ? (
          <div className="space-y-2">
            {yearlyData.map((yearData) => (
              <div
                key={yearData.year}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleYear(yearData.year)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Year {yearData.year}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        Principal: {formatCurrency(yearData.principal)}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        Interest: {formatCurrency(yearData.interest)}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        Balance: {formatCurrency(yearData.endingBalance)}
                      </span>
                    </div>
                    {expandedYears.has(yearData.year) ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </button>

                {expandedYears.has(yearData.year) && (
                  <div className="bg-white dark:bg-gray-900">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-gray-200 dark:border-gray-700">
                          <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Month
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                            Payment
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                            Principal
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                            Interest
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearData.monthlyPayments.map((payment) => (
                          <tr
                            key={payment.month}
                            className="border-t border-gray-100 dark:border-gray-800"
                          >
                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                              {payment.month}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                              {formatCurrency(payment.payment)}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                              {formatCurrency(payment.principal)}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                              {formatCurrency(payment.interest)}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                              {formatCurrency(payment.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                  Payment #
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                  Payment
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                  Principal
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                  Interest
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {results.schedule.map((payment) => (
                <tr
                  key={payment.month}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {payment.month}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(payment.payment)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(payment.principal)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(payment.interest)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(payment.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-medium">
                <td className="px-4 py-3 text-gray-900 dark:text-white">
                  Total
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                  {formatCurrency(results.totalPayments)}
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                  {formatCurrency(results.loanAmount)}
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                  {formatCurrency(results.totalInterest)}
                </td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Loan Summary:</strong> With a {interestRate}% interest rate
          over {loanTerm} months, you&apos;ll pay{" "}
          {formatCurrency(results.totalInterest)} in interest on a{" "}
          {formatCurrency(results.loanAmount)} loan.
        </p>
      </div>
    </div>
  );
}
