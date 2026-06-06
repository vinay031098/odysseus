import { describe, expect, it } from 'vitest'
import { formatRelativeTime, isPdfDocument, shouldRenderMarkdown } from './documentHelpers'

describe('documentHelpers', () => {
  it('detects PDF source markers', () => {
    expect(isPdfDocument('<!-- pdf_source upload_id="abc" -->')).toBe(true)
    expect(isPdfDocument('<!-- pdf_form_source upload_id="xyz" -->')).toBe(true)
    expect(isPdfDocument('# Hello\n\nplain markdown')).toBe(false)
  })

  it('chooses markdown rendering for prose languages', () => {
    expect(shouldRenderMarkdown('markdown')).toBe(true)
    expect(shouldRenderMarkdown('text')).toBe(true)
    expect(shouldRenderMarkdown('email')).toBe(true)
    expect(shouldRenderMarkdown('python')).toBe(false)
    expect(shouldRenderMarkdown(null)).toBe(true)
  })

  it('formats recent timestamps', () => {
    const recent = new Date(Date.now() - 30_000).toISOString()
    expect(formatRelativeTime(recent)).toBe('just now')
    expect(formatRelativeTime(null)).toBe('')
    expect(formatRelativeTime('not-a-date')).toBe('')
  })
})
