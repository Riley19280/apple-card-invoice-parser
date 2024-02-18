import { getDocument } from 'pdfjs-dist'

export async function getPdfText(path: string) {
  let doc = await getDocument(path).promise

  const pages: string[][] = []

  for (let pageNum = 0; pageNum < doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum + 1)
    const content = await page.getTextContent()
    const pageContent: string[] = content.items
                               .map(function (item) {
                                 // @ts-ignore
                                 return item.str ?? undefined
                               })
                               .filter(x => x !== undefined && x.trim() !== '')
    pages.push(pageContent)
  }

  return pages
}

export function findSequence(find: string | RegExp | Array<string | RegExp>, array: string[]): number | false {
  if (!Array.isArray(find))
    find = [find]

  if (find.length === array.length && array.length === 0)
    return 0

  let seqIndex = 0

  for (let i = 0; i < array.length; i++) {
    if (typeof find[seqIndex] === 'object') {
      if ((find[seqIndex] as RegExp).test(array[i])) {
        seqIndex++
        if (seqIndex === find.length) {
          return i - (find.length - 1)
        }
      }
    } else if (array[i] === find[seqIndex] || find[seqIndex] === '*') {
      seqIndex++
      if (seqIndex === find.length) {
        return i - (find.length - 1)
      }
    } else {
      seqIndex = 0
    }
  }

  return false
}
