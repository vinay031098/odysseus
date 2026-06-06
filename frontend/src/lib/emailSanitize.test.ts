import { describe, expect, it } from 'vitest'
import { escapeHtml, escapeLinkify, htmlToPlainText, sanitizeEmailHtml } from './emailSanitize'

describe('sanitizeEmailHtml', () => {
  it('strips script tags and on* handlers', () => {
    const dirty = '<p>Hi</p><script>alert(1)</script><img src=x onerror=alert(1)>'
    const clean = sanitizeEmailHtml(dirty)
    expect(clean).not.toMatch(/script/i)
    expect(clean).not.toMatch(/onerror/i)
    expect(clean).toContain('Hi')
  })

  it('blocks javascript: URLs on links', () => {
    const dirty = '<a href="javascript:alert(1)">click</a>'
    const clean = sanitizeEmailHtml(dirty)
    expect(clean).not.toContain('javascript:')
  })
})

describe('escapeLinkify', () => {
  it('linkifies URLs and escapes HTML', () => {
    const out = escapeLinkify('Visit https://example.com & <b>bold</b>')
    expect(out).toContain('href=')
    expect(out).toContain('example.com')
    expect(out).not.toContain('<b>')
  })
})

describe('htmlToPlainText', () => {
  it('extracts text from HTML', () => {
    expect(htmlToPlainText('<p>Hello<br>world</p>')).toBe('Helloworld')
  })
})

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })
})
