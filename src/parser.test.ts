import {
  extractBalances,
  extractCashBackSummary,
  extractCustomerDetails,
  extractInstallmentInformation,
  extractInterestInformation,
  extractMinimumPaymentDetails,
  extractPayments,
  extractStatementDates,
  extractTransactions,
  parseInvoice,
} from '@/parser.js'
import { getPdfText } from '@/util.js'
import fs from 'fs'
import path from 'path'
import { invoiceData1 } from '../tests/fixtures/invoiceData1.js'
import { invoiceData2 } from '../tests/fixtures/invoiceData2.js'

test('extract customer details', () => {
  expect(extractCustomerDetails(invoiceData1[0])).toStrictEqual({
    name: 'First Last',
    email: 'email@example.com',
  })
})

test('extract balances', () => {
  expect(extractBalances(invoiceData1[0])).toStrictEqual({
    'previous_month': 2386.95,
    'previous_total': 3702.79,
    'total': 3813.61,
  })
})

test('extract statement dates', () => {
  expect(extractStatementDates(invoiceData1[0])).toStrictEqual({
    payment_due_on: new Date('2024-02-29T05:00:00.000Z'),
    statement_start_date: new Date('2024-01-01T05:00:00.000Z'),
    statement_end_date: new Date('2024-01-31T05:00:00.000Z'),
  })
})

test('extract interest information', () => {
  expect(extractInterestInformation(invoiceData1)).toStrictEqual({
    apr: .2724,
    amount_subject_to_interest: 0,
    amount_this_month: 0,
    amount_ytd: 0,
  })
})

test('extract minimum payment info', () => {
  expect(extractMinimumPaymentDetails(invoiceData1[0])).toStrictEqual({
    total: 156.58,
    transaction: 25,
    installment: 131.58,
    estimated_deferred:
      {
        total: 8265,
        time: '14 years',
      },
  })
})

test('extract payment information', () => {
  expect(extractPayments(invoiceData1)).toStrictEqual([
    {
      date: new Date('2024-01-31T05:00:00.000Z'),
      description: 'ACH Deposit Internet transfer from account ending in 1234',
      amount: -2386.95,
    },
  ])
})

test('extract monthly installments', () => {
  expect(extractInstallmentInformation(invoiceData1)).toStrictEqual({
    'totals': {
      'financed': 1579,
      'payments': 263.16,
      'remaining': 1315.84,
    },
    'items': [
      {
        date: new Date('2023-11-01T04:00:00.000Z'),
        description: 'Apple Online Store Cupertino CA TRANSACTION #31631c7bfd69 This month ’ s installment: $131.58 Final installment: Nov 30, 2024',
        amount: 1579,
        cash_back_amount: 0,
        cash_back_percentage: 0,
      },
    ],
  })
})

test('extract monthly installments with daily cash', () => {
  expect(extractInstallmentInformation(invoiceData2)).toStrictEqual({
    'totals': {
      'financed': 1579,
      'payments': 0,
      'remaining': 1579,
    },
    'items': [
      {
        date: new Date('2023-11-01T04:00:00.000Z'),
        description: 'Apple Online Store Cupertino CA TRANSACTION #31631c7bfd69 This month ’ s installment: $131.58 Final installment: Nov 30, 2024',
        amount: 1579,
        cash_back_amount: 47.37,
        cash_back_percentage: .03,
      },
    ],
  })
})


test('extract cash back summary', () => {
  expect(extractCashBackSummary(invoiceData1)).toStrictEqual({
    from_card: 25.01,
    from_installments: 0,
    total: 25.01,
  })
})

test('extract transactions', () => {
  const transactions = extractTransactions(invoiceData1)

  expect(transactions[0]).toStrictEqual({
    date: new Date('2023-12-29T05:00:00.000Z'),
    description: 'PAYPAL *STEAM GAMES 10400 NE 4th St., Suite 1 4259522985 980045212 WA USA',
    cash_back_percent: .01,
    cash_back_amount: .08,
    amount: 7.50,
  })

  expect(transactions[transactions.length - 1]).toStrictEqual({
    date: new Date('2024-01-30T05:00:00.000Z'),
    description: 'SPEEDWAY 07935 3800 LA3800 LAWNDALE DR GREENSBORO 27455 NC USA',
    cash_back_percent: .01,
    cash_back_amount: .2,
    amount: 20.49,
  })

  expect(transactions.length).toBe(46)
})

test('extract multiline transactions', () => {
  const invoiceData = [
    'Transactions',
    'Date',
    'Description',
    'Daily Cash',
    'Amount',
    '09/17/2022',
    'PAYPAL *G2ACOMLIMIT 36/F, Tower Two, Times Sq 1 Matheson Str 35314369001 Causeway',
    'POLPOL',
    '1%',
    '$0.30',
    '$29.58',
    '09/17/2022',
    'PAYPAL *G2ACOMLIMIT 36/F, Tower Two, Times Sq 1 Matheson Str 35314369001 Causeway',
    'POLPOL',
    '1%',
    '$0.30',
    '$29.58',
    '09/21/2022',
    'AMAZON.COM*1U8RC4Z11 A440 TERRY AVE N. AMZN.COM/BILL98109 WA USA',
    '1%',
    '$0.15',
    '$14.61',
    "Page 1 /1",
  ]

  const transactions = extractTransactions([invoiceData])

  expect(transactions.length).toBe(3)

  expect(transactions[0]).toStrictEqual({
    date: new Date('2022-09-17T04:00:00.000Z'),
    description: 'PAYPAL *G2ACOMLIMIT 36/F, Tower Two, Times Sq 1 Matheson Str 35314369001 Causeway POLPOL',
    cash_back_percent: .01,
    cash_back_amount: .3,
    amount: 29.58,
  })

  expect(transactions[1]).toStrictEqual({
    date: new Date('2022-09-17T04:00:00.000Z'),
    description: 'PAYPAL *G2ACOMLIMIT 36/F, Tower Two, Times Sq 1 Matheson Str 35314369001 Causeway POLPOL',
    cash_back_percent: .01,
    cash_back_amount: .3,
    amount: 29.58,
  })

  expect(transactions[2]).toStrictEqual({
    date: new Date('2022-09-21T04:00:00.000Z'),
    description: 'AMAZON.COM*1U8RC4Z11 A440 TERRY AVE N. AMZN.COM/BILL98109 WA USA',
    cash_back_percent: .01,
    cash_back_amount: .15,
    amount: 14.61,
  })

})

test('parse invoices', () => {
  const invoice1 = parseInvoice(invoiceData1)
  const invoice2 = parseInvoice(invoiceData2)
})

test.skip('get test data', async () => {

  for (const file of fs.readdirSync('./input')) {
    console.log(file)

    // const path = './input/Apple Card Statement - November 2023.pdf'
    const data = await getPdfText(`./input/${file}`)

    const parsed = parseInvoice(data)

    // console.dir(data, { 'maxArrayLength': null })
    fs.writeFileSync(`./parsed/${path.basename(file, path.extname(file))}.json`, JSON.stringify(parsed, null, 4))

  }
})
