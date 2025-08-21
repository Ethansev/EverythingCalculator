"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, type LabelProps } from 'recharts'
import type { LoanResults } from '../utils/loanCalculations'

interface LoanBreakdownChartProps {
  results: LoanResults
}

export function LoanBreakdownChart({ results }: LoanBreakdownChartProps) {
  const data: ChartDataPoint[] = [
    {
      name: 'Principal',
      value: results.loanAmount,
      color: '#fb923c' // orange-400
    },
    {
      name: 'Interest',
      value: results.totalInterest,
      color: '#60a5fa' // blue-400
    },
    {
      name: 'Down Payment',
      value: results.upfrontPayment,
      color: '#34d399' // green-400
    }
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  interface ChartDataPoint {
    name: string;
    value: number;
    color: string;
  }

  interface TooltipPayload {
    name: string;
    value: number;
    color: string;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {((data.value / results.totalCost) * 100).toFixed(1)}% of total
          </p>
        </div>
      )
    }
    return null
  }

  const renderCustomLabel = (props: LabelProps) => {
    const { value } = props
    if (typeof value === 'number') {
      const percent = ((value / results.totalCost) * 100).toFixed(1)
      return `${percent}%`
    }
    return ''
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Loan Cost Breakdown
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry) => (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {value}: {formatCurrency(typeof entry.value === 'number' ? entry.value : 0)}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total Vehicle Cost: <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(results.totalCost)}</span>
        </p>
      </div>
    </div>
  )
}