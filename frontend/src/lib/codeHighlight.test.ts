import { describe, expect, it } from 'vitest'
import { highlightCode, highlightLanguageClass, isCodeLanguage } from './codeHighlight'

describe('codeHighlight', () => {
  it('wraps keywords for python via hljs', () => {
    const html = highlightCode('def hello():\n    return True', 'python')
    expect(html).toContain('hljs-keyword')
    expect(html).toContain('def')
  })

  it('detects code languages', () => {
    expect(isCodeLanguage('python')).toBe(true)
    expect(isCodeLanguage('markdown')).toBe(false)
    expect(isCodeLanguage('canvas')).toBe(false)
  })

  it('maps language css classes', () => {
    expect(highlightLanguageClass('typescript')).toBe('language-typescript')
    expect(highlightLanguageClass('text')).toBe('language-text')
  })
})
