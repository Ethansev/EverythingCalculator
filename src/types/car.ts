export interface LoanInputs {
  autoPrice: number
  loanTerm: number // in months
  interestRate: number // annual percentage rate
  downPayment: number
  tradeInValue: number
  amountOwedOnTradeIn: number
  salesTax: number // percentage
  fees: number
  includeTaxesInLoan: boolean
}

export interface LoanResults {
  monthlyPayment: number
  loanAmount: number
  totalPayments: number
  totalInterest: number
  totalCost: number
  upfrontPayment: number
  salesTaxAmount: number
  schedule: PaymentScheduleItem[]
}

export interface PaymentScheduleItem {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}