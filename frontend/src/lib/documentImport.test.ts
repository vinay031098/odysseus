import { describe, expect, it } from 'vitest'
import { EXT_TO_LANG, htmlToMarkdown, parseFileImportMeta } from './documentImport'

describe('documentImport', () => {
  it('maps common extensions to language tags', () => {
    expect(EXT_TO_LANG['.py']).toBe('python')
    expect(EXT_TO_LANG['.pdf']).toBe('pdf')
    expect(EXT_TO_LANG['.md']).toBe('markdown')
  })

  it('parses file metadata for import', () => {
    const pdf = parseFileImportMeta(new File([''], 'report.pdf', { type: 'application/pdf' }))
    expect(pdf.isPdf).toBe(true)
    expect(pdf.baseTitle).toBe('report')

    const sheet = parseFileImportMeta(new File([''], 'data.xlsx'))
    expect(sheet.isSpreadsheet).toBe(true)
    expect(sheet.language).toBe('csv')
  })

  it('converts simple HTML headings to markdown', () => {
    expect(htmlToMarkdown('<h1>Title</h1><p>Body</p>')).toContain('# Title')
    expect(htmlToMarkdown('<h1>Title</h1><p>Body</p>')).toContain('Body')
  })
})
