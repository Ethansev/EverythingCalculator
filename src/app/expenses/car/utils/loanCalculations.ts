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

export function calculateLoan(inputs: LoanInputs): LoanResults {
  const {
    autoPrice,
    loanTerm,
    interestRate,
    downPayment,
    tradeInValue,
    amountOwedOnTradeIn,
    salesTax,
    fees,
    includeTaxesInLoan
  } = inputs

  const netTradeIn = Math.max(0, tradeInValue - amountOwedOnTradeIn)
  
  const taxableAmount = autoPrice - netTradeIn
  const salesTaxAmount = taxableAmount * (salesTax / 100)
  
  const totalFeesAndTaxes = salesTaxAmount + fees
  
  let baseLoanAmount = autoPrice - downPayment - netTradeIn
  
  if (includeTaxesInLoan) {
    baseLoanAmount += totalFeesAndTaxes
  }
  
  const loanAmount = Math.max(0, baseLoanAmount)
  
  const monthlyRate = interestRate / 100 / 12
  
  let monthlyPayment = 0
  if (loanAmount > 0 && monthlyRate > 0) {
    monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, loanTerm)) / 
                     (Math.pow(1 + monthlyRate, loanTerm) - 1)
  } else if (loanAmount > 0) {
    monthlyPayment = loanAmount / loanTerm
  }
  
  const totalPayments = monthlyPayment * loanTerm
  const totalInterest = totalPayments - loanAmount
  
  const upfrontPayment = downPayment + (includeTaxesInLoan ? 0 : totalFeesAndTaxes)
  
  const totalCost = upfrontPayment + totalPayments
  
  const schedule: PaymentScheduleItem[] = []
  let remainingBalance = loanAmount
  
  for (let month = 1; month <= loanTerm; month++) {
    const interestPayment = remainingBalance * monthlyRate
    const principalPayment = monthlyPayment - interestPayment
    remainingBalance -= principalPayment
    
    if (month === loanTerm) {
      remainingBalance = 0
    }
    
    schedule.push({
      month,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, remainingBalance)
    })
  }
  
  return {
    monthlyPayment,
    loanAmount,
    totalPayments,
    totalInterest,
    totalCost,
    upfrontPayment,
    salesTaxAmount,
    schedule
  }
}

export function calculateLoansForComparison(
  inputs: LoanInputs,
  terms: number[] = [24, 36, 48, 60, 72]
): Array<{ term: number; monthlyPayment: number; totalInterest: number; totalCost: number }> {
  return terms.map(term => {
    const result = calculateLoan({ ...inputs, loanTerm: term })
    return {
      term,
      monthlyPayment: result.monthlyPayment,
      totalInterest: result.totalInterest,
      totalCost: result.totalCost
    }
  })
}