"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";
import {
  calculateLoan,
  type LoanInputs,
  type LoanResults,
} from "./utils/loanCalculations";
import { LoanBreakdownChart } from "./components/LoanBreakdownChart";
import { PaymentScheduleChart } from "./components/PaymentScheduleChart";
import { AmortizationTable } from "./components/AmortizationTable";
import { LoanComparisonChart } from "./components/LoanComparisonChart";

export default function AutoLoanCalculatorPage() {
  const [inputs, setInputs] = useState<LoanInputs>({
    autoPrice: 45000,
    loanTerm: 60,
    interestRate: 7.5,
    downPayment: 5000,
    tradeInValue: 0,
    amountOwedOnTradeIn: 0,
    salesTax: 7.25,
    fees: 1200,
    includeTaxesInLoan: true,
  });

  const [results, setResults] = useState<LoanResults | null>(null);
  const [activeTab, setActiveTab] = useState<"charts" | "schedule">("charts");

  useEffect(() => {
    const calculated = calculateLoan(inputs);
    setResults(calculated);
  }, [inputs]);

  const handleInputChange = (
    field: keyof LoanInputs,
    value: number | boolean
  ) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back to Home
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Auto Loan Calculator
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Calculate monthly payments and visualize your auto loan with
            interactive charts
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Form */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-orange-600" />
                Loan Details
              </h2>

              <div className="space-y-4">
                {/* Auto Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Auto Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={inputs.autoPrice}
                      onChange={(e) =>
                        handleInputChange(
                          "autoPrice",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Loan Term */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Loan Term
                  </label>
                  <select
                    value={inputs.loanTerm}
                    onChange={(e) =>
                      handleInputChange("loanTerm", parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={12}>12 months</option>
                    <option value={24}>24 months</option>
                    <option value={36}>36 months</option>
                    <option value={48}>48 months</option>
                    <option value={60}>60 months</option>
                    <option value={72}>72 months</option>
                    <option value={84}>84 months</option>
                  </select>
                </div>

                {/* Interest Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Interest Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={inputs.interestRate}
                      onChange={(e) =>
                        handleInputChange(
                          "interestRate",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full pr-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      %
                    </span>
                  </div>
                </div>

                {/* Down Payment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Down Payment
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={inputs.downPayment}
                      onChange={(e) =>
                        handleInputChange(
                          "downPayment",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Trade-in Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Trade-in Value
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={inputs.tradeInValue}
                      onChange={(e) =>
                        handleInputChange(
                          "tradeInValue",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Amount Owed on Trade-in */}
                {inputs.tradeInValue > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount Owed on Trade-in
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <input
                        type="number"
                        value={inputs.amountOwedOnTradeIn}
                        onChange={(e) =>
                          handleInputChange(
                            "amountOwedOnTradeIn",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Sales Tax */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sales Tax
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={inputs.salesTax}
                      onChange={(e) =>
                        handleInputChange(
                          "salesTax",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full pr-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      %
                    </span>
                  </div>
                </div>

                {/* Fees */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title, Registration & Other Fees
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={inputs.fees}
                      onChange={(e) =>
                        handleInputChange(
                          "fees",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Include Taxes in Loan */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeTaxesInLoan"
                    checked={inputs.includeTaxesInLoan}
                    onChange={(e) =>
                      handleInputChange("includeTaxesInLoan", e.target.checked)
                    }
                    className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label
                    htmlFor="includeTaxesInLoan"
                    className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Include taxes & fees in loan
                  </label>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Results and Visualizations */}
          <div className="lg:col-span-2 space-y-6">
            {results && (
              <>
                {/* Key Results */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-orange-600" />
                    Loan Summary
                  </h2>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Monthly Payment
                      </p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(results.monthlyPayment)}
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Total Loan Amount
                      </p>
                      <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(results.loanAmount)}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Total Interest
                      </p>
                      <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(results.totalInterest)}
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Total Cost
                      </p>
                      <p className="text-xl font-semibold text-purple-600 dark:text-purple-400">
                        {formatCurrency(results.totalCost)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Sales Tax
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(results.salesTaxAmount)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Upfront Payment
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(results.upfrontPayment)}
                        </p>
                      </div>
                    </div>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Total Payments
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(results.totalPayments)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          APR
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatPercent(inputs.interestRate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Tabs for Charts vs Schedule */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
                >
                  <div className="flex space-x-1 mb-6">
                    <button
                      onClick={() => setActiveTab("charts")}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        activeTab === "charts"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 inline mr-2" />
                      Visualizations
                    </button>
                    <button
                      onClick={() => setActiveTab("schedule")}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        activeTab === "schedule"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      <Calculator className="w-4 h-4 inline mr-2" />
                      Amortization Schedule
                    </button>
                  </div>

                  <div className="min-h-[600px] relative overflow-hidden">
                    <AnimatePresence mode="wait">
                      {activeTab === "charts" ? (
                        <motion.div
                          key="charts"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-8"
                        >
                          <LoanBreakdownChart results={results} />
                          <PaymentScheduleChart
                            results={results}
                            loanTerm={inputs.loanTerm}
                          />
                          <LoanComparisonChart
                            currentInputs={inputs}
                            currentResults={results}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="schedule"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <AmortizationTable
                            results={results}
                            loanTerm={inputs.loanTerm}
                            interestRate={inputs.interestRate}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
