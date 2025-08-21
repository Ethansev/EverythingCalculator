"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import type { LoanResults } from "../utils/loanCalculations";

interface PaymentScheduleChartProps {
  results: LoanResults;
  loanTerm: number;
}

export function PaymentScheduleChart({
  results,
  loanTerm,
}: PaymentScheduleChartProps) {
  const yearlyData: ChartDataPoint[] = [];

  for (let year = 1; year <= Math.ceil(loanTerm / 12); year++) {
    const startMonth = (year - 1) * 12 + 1;
    const endMonth = Math.min(year * 12, loanTerm);

    let yearlyPrincipal = 0;
    let yearlyInterest = 0;

    for (let month = startMonth; month <= endMonth; month++) {
      const payment = results.schedule[month - 1];
      if (payment) {
        yearlyPrincipal += payment.principal;
        yearlyInterest += payment.interest;
      }
    }

    yearlyData.push({
      year: `Year ${year}`,
      principal: Math.round(yearlyPrincipal),
      interest: Math.round(yearlyInterest),
      total: Math.round(yearlyPrincipal + yearlyInterest),
    });
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  interface ChartDataPoint {
    year: string;
    principal: number;
    interest: number;
    total: number;
  }

  interface TooltipPayload {
    name: string;
    value: number;
    color: string;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-2">
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
            Total: {formatCurrency(payload[0].value + payload[1].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Annual Payment Breakdown
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={yearlyData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb923c" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-700"
            />
            <XAxis
              dataKey="year"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-gray-600 dark:text-gray-400"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="rect"
              formatter={(value) => (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {value}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="principal"
              stackId="1"
              stroke="#fb923c"
              fillOpacity={1}
              fill="url(#colorPrincipal)"
              name="Principal"
            />
            <Area
              type="monotone"
              dataKey="interest"
              stackId="1"
              stroke="#60a5fa"
              fillOpacity={1}
              fill="url(#colorInterest)"
              name="Interest"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Total Principal</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(results.loanAmount)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Total Interest</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(results.totalInterest)}
          </p>
        </div>
      </div>
    </div>
  );
}
