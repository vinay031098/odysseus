import { describe, expect, it } from 'vitest'
import { foldSignature, isBloatedSig } from './emailSignatureFold'

const LONG_SIG = 'X'.repeat(250)

describe('isBloatedSig', () => {
  it('requires minimum length', () => {
    expect(isBloatedSig('Cheers, Bob')).toBe(false)
    expect(isBloatedSig(`<p>${LONG_SIG}</p>`)).toBe(true)
  })
})

describe('foldSignature', () => {
  it('folds RFC 3676 -- delimiter signatures', () => {
    const html = `<p>Thanks!</p><br>--<br><p>${LONG_SIG}</p>`
    const out = foldSignature(html)
    expect(out).toContain('email-sig-fold')
    expect(out).toContain('Signature')
  })

  it('folds gmail_signature div', () => {
    const html = `<p>Body</p><div class="gmail_signature">${LONG_SIG}</div>`
    const out = foldSignature(html)
    expect(out).toContain('email-sig-fold')
  })

  it('leaves short closings inline', () => {
    const html = '<p>Thanks!</p><br>Cheers,<br>Jane'
    expect(foldSignature(html)).toBe(html)
  })
})
