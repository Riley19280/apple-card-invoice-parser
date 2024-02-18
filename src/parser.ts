import {
  AppleCardInvoice,
  MonthlyInstallment,
} from '@/index.interface.js'
import { findSequence } from '@/util.js'
import { parse as dateParse } from 'date-fns'

export function parseInvoice(pdfData: string[][]): AppleCardInvoice {
  return {
    name: '',
    ...extractStatementDates(pdfData[0]),
    balance: extractBalances(pdfData[0]),
    cash_back: extractCashBackSummary(pdfData),
    customer: extractCustomerDetails(pdfData[0]),
    interest: extractInterestInformation(pdfData),
    minimum_payment: extractMinimumPaymentDetails(pdfData[0]),
    monthly_installments: extractInstallmentInformation(pdfData),
    payments: extractPayments(pdfData),
    transactions: extractTransactions(pdfData),
  }
}

export function extractCustomerDetails(pdfData: string[]): AppleCardInvoice['customer'] {
  const index = findSequence('Apple Card Customer', pdfData)

  if (index === false) {
    throw new Error('Unable to find customer details')
  }

  const details = pdfData[index + 1]

  const [name, email] = details.split(', ')

  return {
    name,
    email,
  }
}

export function extractBalances(pdfData: string[]): AppleCardInvoice['balance'] {

  let prevMonthlyBalIdx = findSequence('Previous Monthly Balance', pdfData)
  prevMonthlyBalIdx = prevMonthlyBalIdx === false ? findSequence('Prior Monthly Balance', pdfData) : prevMonthlyBalIdx
  if (prevMonthlyBalIdx === false) throw new Error('Unable to find Previous Monthly Balance')

  let prevTotalBalIdx = findSequence('Previous Total Balance', pdfData) ?? findSequence('Prior Total Balance', pdfData)
  prevTotalBalIdx = prevTotalBalIdx === false ? findSequence('Prior Total Balance', pdfData) : prevTotalBalIdx
  if (prevTotalBalIdx === false) throw new Error('Unable to find Previous Total Balance')

  const totalBalIdx = findSequence('Total Balance', pdfData)
  if (totalBalIdx === false) throw new Error('Unable to find Total Balance')

  return {
    'previous_month': Number(pdfData[prevMonthlyBalIdx + 1].replace(/[^0-9.-]+/g, '')),
    'previous_total': Number(pdfData[prevTotalBalIdx + 1].replace(/[^0-9.-]+/g, '')),
    'total': Number(pdfData[totalBalIdx + 1].replace(/[^0-9.-]+/g, '')),
  }
}

export function extractStatementDates(pdfData: string[]): Pick<AppleCardInvoice, 'payment_due_on' | 'statement_start_date' | 'statement_end_date'> {

  const dueOnIdx = findSequence(['Payment', 'Due By'], pdfData)

  if (dueOnIdx === false) {
    throw new Error('Unable to find Payment Due By')
  }

  const dueOn = dateParse(pdfData[dueOnIdx + 2], 'MMM dd, yyyy', new Date)

  const startEndIdx = findSequence(['Apple Card Customer', '*', 'Statement', '*', '—'], pdfData)

  if (startEndIdx === false) {
    throw new Error('Unable to find invoice start and end dates')
  }

  const startDate = dateParse(pdfData[startEndIdx + 3], 'MMM dd', new Date)
  const endDate = dateParse(pdfData[startEndIdx + 5], 'MMM dd, yyyy', new Date)

  return {
    payment_due_on: dueOn,
    statement_start_date: startDate,
    statement_end_date: endDate,
  }
}

export function extractInterestInformation(pdfData: string[][]): AppleCardInvoice['interest'] {

  for (const pdfPageData of pdfData) {
    const aprIdx = findSequence('Annual Percentage Rate (APR)', pdfPageData)
    const amtSubjIdx = findSequence('Balance subject to interest rate', pdfPageData)
    const amtMonthIdx = findSequence('Total interest for this month', pdfPageData)
    const amyYtdIdx = findSequence(/Total interest charged in \d{4}/, pdfPageData)

    if (aprIdx === false || amtSubjIdx === false || amtMonthIdx === false || amyYtdIdx === false) continue

    return {
      apr: Number(pdfPageData[aprIdx + 1].replace(/[^0-9.-]+/g, '')) / 100,
      amount_subject_to_interest: Number(pdfPageData[amtSubjIdx + 1].replace(/[^0-9.-]+/g, '')),
      amount_this_month: Number(pdfPageData[amtMonthIdx + 1].replace(/[^0-9.-]+/g, '')),
      amount_ytd: Number(pdfPageData[amyYtdIdx + 1].replace(/[^0-9.-]+/g, '')),
    }
  }

  throw new Error('Unable to find interest information')
}

export function extractMinimumPaymentDetails(pdfData: string[]): AppleCardInvoice['minimum_payment'] {

  const minDueTotalIdx = findSequence(['Minimum', 'Payment Due'], pdfData)

  if (minDueTotalIdx === false) {
    throw new Error('Unable to find Minimum Payment Due')
  }

  const transactionAmountIdx = findSequence(['Apple Card transactions', '*', 'minimum payment'], pdfData)

  const installmentAmountIdx = findSequence(['Apple Card Monthly Installments', '*', 'Minimum Payment Warning'], pdfData)

  const deferredInfoIdx = findSequence(['And will end up paying an estimated total of:', 'Only minimum payment'], pdfData)

  return {
    total: Number(pdfData[minDueTotalIdx + 2].replace(/[^0-9.-]+/g, '')),
    transaction: transactionAmountIdx !== false ? Number(pdfData[transactionAmountIdx + 1].replace(/[^0-9.-]+/g, '')) : Number(pdfData[minDueTotalIdx + 2].replace(/[^0-9.-]+/g, '')),
    installment: installmentAmountIdx === false ? null : Number(pdfData[installmentAmountIdx + 1].replace(/[^0-9.-]+/g, '')),
    estimated_deferred: deferredInfoIdx === false ? null : {
      total: Number(pdfData[deferredInfoIdx + 3].replace(/[^0-9.-]+/g, '')),
      time: pdfData[deferredInfoIdx + 2],
    },
  }
}

export function extractPayments(pdfData: string[][]): AppleCardInvoice['payments'] {
  const payments: AppleCardInvoice['payments'] = []

  for (const pdfPageData of pdfData) {

    const paymentsIdx = findSequence(['Payments', 'Date', 'Description', 'Amount'], pdfPageData)

    if (paymentsIdx === false) {
      continue
    }

    const paymentsEndIdx = findSequence('Total payments for this period', pdfPageData)

    if (paymentsEndIdx === false) {
      throw new Error('Internal: Found payments data but no end flag found.')
    }

    for (let i = paymentsIdx + 4; i < paymentsEndIdx; i += 3) {
      payments.push({
        date: dateParse(pdfPageData[i], 'MM/dd/yyyy', new Date),
        description: pdfPageData[i + 1],
        amount: Number(pdfPageData[i + 2].replace(/[^0-9.-]+/g, '')),
      })
    }

  }

  if (payments.length === 0) {
    throw new Error('Unable to find payments data')
  }

  return payments
}

export function extractInstallmentInformation(pdfData: string[][]): null | AppleCardInvoice['monthly_installments'] {
  const items: MonthlyInstallment[] = []

  for (const pdfPageData of pdfData) {
    const totalFinancedIdx = findSequence('Total financed', pdfPageData)
    const totalPaymentsIdx = findSequence('Total payments and credits', pdfPageData)
    const totalRemainingIdx = findSequence('Total remaining', pdfPageData)

    if (totalFinancedIdx === false || totalPaymentsIdx === false || totalRemainingIdx === false) {
      continue
    }

    // Handling installment items
    const installmentIdx = findSequence(['Apple Card Monthly Installments', 'Dates', 'Description', 'Daily Cash', 'Amounts'], pdfPageData)

    const installmentEndIdx = findSequence('Total financed', pdfPageData)

    if (installmentIdx === false || installmentEndIdx === false) continue

    const bins: Array<Array<string | Date>> = []

    for (let i = installmentIdx + 5; i < installmentEndIdx; i++) {
      const parsedDate = dateParse(pdfPageData[i], 'MM/dd/yyyy', new Date)
      if (!isNaN(parsedDate.getTime())) {
        bins.push([parsedDate])
      } else {
        bins[bins.length - 1].push(pdfPageData[i])
      }
    }

    for (const binData of bins) {
      const data: Partial<MonthlyInstallment> = {
        cash_back_amount: 0,
        cash_back_percentage: 0,
        description: '',
      }
      for (let binIdx = 0; binIdx < binData.length; binIdx++) {
        const binValue = binData[binIdx]
        if (typeof binValue === 'string') {
          if (binValue.startsWith('$')) {
            data.amount = Number(binValue.replace(/[^0-9.-]+/g, ''))
          } else if (binValue.endsWith('%')) {
            data.cash_back_percentage = Number(binValue.replace(/[^0-9.-]+/g, '')) / 100

            const nextBinVal = binData[binIdx + 1]
            if (typeof nextBinVal === 'string') {
              data.cash_back_amount = Number(nextBinVal.replace(/[^0-9.-]+/g, ''))
              binIdx++
            }
          } else {
            data.description += binValue + ' '
          }

        } else {
          data.date = binValue
        }
      }

      if (!data.amount || !data.date) {
        throw new Error('Incomplete information for monthly installment')
      } else {
        data.description = data.description?.trim()
        items.push(data as MonthlyInstallment)
      }
    }

    return {
      'totals': {
        'financed': Number(pdfPageData[totalFinancedIdx + 1].replace(/[^0-9.-]+/g, '')),
        'payments': Number(pdfPageData[totalPaymentsIdx + 1].replace(/[^0-9.-]+/g, '')),
        'remaining': Number(pdfPageData[totalRemainingIdx + 1].replace(/[^0-9.-]+/g, '')),
      },
      'items': items,
    }
  }

  return null
}

export function extractCashBackSummary(pdfData: string[][]): AppleCardInvoice['cash_back'] {
  for (const pdfPageData of pdfData) {
    const cardCashBackIdx = findSequence('Daily Cash from Apple Card', pdfPageData)
    const installmentCashBackIdx = findSequence('Daily Cash from Apple Card Monthly Installments', pdfPageData)
    const totalIdx = findSequence('Total Daily Cash', pdfPageData)

    if (cardCashBackIdx === false || totalIdx === false) continue

    return {
      from_card: Number(pdfPageData[cardCashBackIdx + 1].replace(/[^0-9.-]+/g, '')),
      from_installments: installmentCashBackIdx !== false ? Number(pdfPageData[installmentCashBackIdx + 1].replace(/[^0-9.-]+/g, '')) : null,
      total: Number(pdfPageData[totalIdx + 1].replace(/[^0-9.-]+/g, '')),
    }
  }

  throw new Error('Unable to get cash back summary')

}

export function extractTransactions(pdfData: string[][]): AppleCardInvoice['transactions'] {
  const transactions: AppleCardInvoice['transactions'] = []

  for (const pdfPageData of pdfData) {
    const transactionStartIdx = findSequence(['Transactions', 'Date', 'Description', 'Daily Cash', 'Amount'], pdfPageData)

    if (transactionStartIdx === false) continue

    let transactionEndIdx = findSequence('Total Daily Cash this month', pdfPageData)

    if (transactionEndIdx === false) {
      transactionEndIdx = findSequence(/Page \d+ \/\d+/, pdfPageData)
    }

    if (transactionEndIdx === false) {
      throw new Error('Unable to find end of transactions')
    }

    for (let i = transactionStartIdx + 5; i < transactionEndIdx; i += 5) {

      const isMultilineDescription = !pdfPageData[i + 2].endsWith('%')

      transactions.push({
        date: dateParse(pdfPageData[i], 'MM/dd/yyyy', new Date),
        description: pdfPageData[i + 1] + (isMultilineDescription ? (' ' + pdfPageData[i + 2]) : ''),
        cash_back_percent: Number(pdfPageData[i + 2 + (isMultilineDescription ? 1 : 0)].replace(/[^0-9.-]+/g, '')) / 100,
        cash_back_amount: Number(pdfPageData[i + 3 + (isMultilineDescription ? 1 : 0)].replace(/[^0-9.-]+/g, '')),
        amount: Number(pdfPageData[i + 4 + (isMultilineDescription ? 1 : 0)].replace(/[^0-9.-]+/g, '')),
      })

      if(isMultilineDescription) {
        i += 1
      }
    }

  }

  return transactions
}
