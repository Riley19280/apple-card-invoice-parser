import { parseInvoice } from '@/parser.js'
import { getPdfText } from '@/util.js'

export async function parsePdfInvoice(filepath: string) {
  return getPdfText(filepath).then(data => parseInvoice(data))
}
