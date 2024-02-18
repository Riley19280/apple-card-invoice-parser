export interface AppleCardInvoice {
  name: string
  customer: {
    name: string,
    email: string
  },
  balance: {
    previous_month: number,
    previous_total: number,
    total: number
  },
  payment_due_on: Date,
  statement_start_date: Date,
  statement_end_date: Date,
  interest: {
    apr: number
    amount_subject_to_interest: number
    amount_this_month: number
    amount_ytd: number,
  }
  minimum_payment: {
    total: number,
    transaction: number,
    installment: null|number,
    estimated_deferred: null|{
      total: number,
      time: string
    }
  },
  payments: Payment[],
  monthly_installments: null | {
    totals: {
      financed: number,
      payments: number,
      remaining: number
    },
    items: MonthlyInstallment[]
  },
  cash_back: CashBackSummary,
  transactions: AppleCardTransaction[]
}

export interface Payment {
  date: Date
  description: string,
  amount: number
}

export interface MonthlyInstallment {
  date: Date,
  description: string,
  cash_back_amount: number,
  cash_back_percentage: number
  amount: number
}

export interface CashBackSummary {
  from_card: number,
  from_installments: null|number,
  total: number
}

export interface AppleCardTransaction {
  date: Date,
  description: string,
  cash_back_percent: number,
  cash_back_amount: number,
  amount: number
}
