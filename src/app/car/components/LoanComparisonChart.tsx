"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { LoanInputs, LoanResults } from "@/types/car";
import { calculateLoansForComparison } from "@/utils/car/loanCalculations";

interface LoanComparisonChartProps {
  currentInputs: LoanInputs;
  currentResults: LoanResults;
}

export function LoanComparisonChart({
  currentInputs,
  currentResults,
}: LoanComparisonChartProps) {
  const [viewMode, setViewMode] = useState<"monthly" | "total">("monthly");
  const comparisonData = calculateLoansForComparison(currentInputs);

  const data: ChartDataPoint[] = comparisonData.map((item) => {
    const principal = item.totalCost - item.totalInterest;
    const isCurrentTerm = item.term === currentInputs.loanTerm;
    return {
      term: `${item.term} months${isCurrentTerm ? "*" : ""}`,
      termMonths: item.term,
      monthlyPayment: item.monthlyPayment,
      principal: principal,
      totalInterest: item.totalInterest,
      totalCost: item.totalCost,
      isCurrentTerm: isCurrentTerm,
    };
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  interface ChartDataPoint {
    term: string;
    termMonths: number;
    monthlyPayment: number;
    principal: number;
    totalInterest: number;
    totalCost: number;
    isCurrentTerm: boolean;
  }

  interface TooltipPayload {
    payload: ChartDataPoint;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
  }

  interface TickProps {
    x: number;
    y: number;
    payload: { value: string };
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-2">
            {label}
            {data.isCurrentTerm && (
              <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded">
                Current
              </span>
            )}
          </p>
          <div className="space-y-1">
            {viewMode === "monthly" ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Interest: {formatCurrency(data.totalInterest)}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Monthly Payment: {formatCurrency(data.monthlyPayment)}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Interest: {formatCurrency(data.totalInterest)}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Total Cost: {formatCurrency(data.totalCost)}
                </p>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Loan Term Comparison
        </h3>
        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              viewMode === "monthly"
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
          >
            Monthly Payment
          </button>
          <button
            onClick={() => setViewMode("total")}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              viewMode === "total"
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
          >
            Total Cost
          </button>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-700"
            />
            <XAxis
              dataKey="term"
              className="text-gray-600 dark:text-gray-400"
              tick={(props: TickProps) => {
                const { x, y, payload } = props;
                const isCurrentTerm = payload.value.includes("*");

                return (
                  <text
                    x={x}
                    y={y}
                    dy={16}
                    textAnchor="middle"
                    fill={isCurrentTerm ? "#f97316" : "#6b7280"}
                    fontSize={12}
                    fontWeight={isCurrentTerm ? "600" : "400"}
                  >
                    {payload.value}
                  </text>
                );
              }}
            />
            <YAxis
              className="text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
              domain={viewMode === "total" ? [0, "auto"] : [0, "auto"]}
              tickFormatter={(value) =>
                viewMode === "monthly" && value >= 1000
                  ? `$${(value / 1000).toFixed(1)}k`
                  : viewMode === "monthly"
                  ? `$${value.toFixed(0)}`
                  : `$${(value / 1000).toFixed(0)}k`
              }
            />
            <Tooltip content={<CustomTooltip />} />
            {viewMode === "monthly" ? (
              <>
                <Bar
                  dataKey="monthlyPayment"
                  fill="#34d399"
                  name="Monthly Payment"
                />
                <Bar
                  dataKey="totalInterest"
                  fill="#f59e0b"
                  name="Total Interest"
                />
              </>
            ) : (
              <>
                <Bar
                  dataKey="principal"
                  stackId="total"
                  fill="#60a5fa"
                  name="Principal"
                />
                <Bar
                  dataKey="totalInterest"
                  stackId="total"
                  fill="#f59e0b"
                  name="Interest"
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-center gap-6">
          {viewMode === "total" ? (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: "#60a5fa" }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Principal
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: "#f59e0b" }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Interest
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: "#34d399" }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Monthly Payment
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: "#f59e0b" }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Total Interest
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
        <p className="text-sm text-orange-800 dark:text-orange-300">
          <strong>Tip:</strong> Shorter loan terms have higher monthly payments
          but save significantly on interest. Your current{" "}
          {currentInputs.loanTerm}-month loan will cost{" "}
          {formatCurrency(currentResults.totalInterest)} in interest.
        </p>
      </div>
    </div>
  );
}
