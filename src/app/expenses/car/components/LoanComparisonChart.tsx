"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  calculateLoansForComparison,
  type LoanInputs,
  type LoanResults,
} from "../utils/loanCalculations";

interface LoanComparisonChartProps {
  currentInputs: LoanInputs;
  currentResults: LoanResults;
}

export function LoanComparisonChart({
  currentInputs,
  currentResults,
}: LoanComparisonChartProps) {
  const comparisonData = calculateLoansForComparison(currentInputs);

  const data: ChartDataPoint[] = comparisonData.map((item) => ({
    term: `${item.term} months`,
    monthlyPayment: item.monthlyPayment,
    totalInterest: item.totalInterest,
    isCurrentTerm: item.term === currentInputs.loanTerm,
  }));

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
    monthlyPayment: number;
    totalInterest: number;
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
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Monthly: {formatCurrency(data.monthlyPayment)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Interest: {formatCurrency(data.totalInterest)}
          </p>
        </div>
      );
    }
    return null;
  };


  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Loan Term Comparison
      </h3>
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
              tick={{ fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {value}
                </span>
              )}
            />
            <Bar
              yAxisId="left"
              dataKey="totalInterest"
              fill="#60a5fa"
              name="Total Interest"
            />
            <Bar
              yAxisId="right"
              dataKey="monthlyPayment"
              fill="#34d399"
              name="Monthly Payment"
            />
          </BarChart>
        </ResponsiveContainer>
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
