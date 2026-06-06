import { describe, expect, it } from 'vitest'
import { extractQuoteMeta, foldQuotedReplies, renderPlaintextThread } from './emailQuoteFold'

describe('extractQuoteMeta', () => {
  it('parses Gmail-style attribution', () => {
    const meta = extractQuoteMeta(
      'On Mon, Apr 18, 2026 at 9:31 AM, Jane Doe wrote:',
    )
    expect(meta).toContain('Jane Doe')
    expect(meta).toContain('2026')
  })

  it('parses Outlook-style From/Sent headers', () => {
    const meta = extractQuoteMeta(
      'From: Bob Smith <bob@example.com> Sent: Monday, April 18, 2026 9:31 AM To: Jane',
    )
    expect(meta).toContain('Bob')
  })
})

describe('foldQuotedReplies', () => {
  it('wraps top-level blockquotes in details', () => {
    const html = '<p>Reply</p><blockquote><p>Quoted</p></blockquote>'
    const out = foldQuotedReplies(html)
    expect(out).toContain('email-quote-fold')
    expect(out).toContain('Earlier thread')
    expect(out).toContain('<blockquote>')
  })
})

describe('renderPlaintextThread', () => {
  it('returns null when there are no quotes', () => {
    expect(renderPlaintextThread('Hello\n\nThanks!')).toBeNull()
  })

  it('folds >-quoted replies into thread turns', () => {
    const text = 'My reply\n\nOn Mon, Apr 18, 2026, Jane wrote:\n> Old line one\n> Old line two'
    const out = renderPlaintextThread(text)
    expect(out).toContain('My reply')
    expect(out).toContain('email-thread-turn')
    expect(out).toContain('Old line one')
  })

  it('handles nested quote levels', () => {
    const text = 'Top\n> level 1\n>> level 2'
    const out = renderPlaintextThread(text)
    expect(out).toContain('Top')
    expect(out).toContain('level 1')
    expect(out).toContain('level 2')
  })
})
