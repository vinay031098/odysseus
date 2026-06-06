import { describe, expect, it } from 'vitest'
import { renderEmailBodyHtml, renderTurnsAsBubbles } from './emailBodyRender'

describe('renderEmailBodyHtml', () => {
  it('sanitizes and folds HTML blockquotes', () => {
    const html = renderEmailBodyHtml({
      body: '',
      body_html: '<p>Hi</p><blockquote><p>Old</p></blockquote>',
      from_address: 'a@b.com',
      from_name: 'A',
      date: '',
    })
    expect(html).toContain('email-quote-fold')
    expect(html).not.toMatch(/<script/i)
  })

  it('renders thread turns from server cache as nested folds when bubbles disabled', () => {
    const html = renderEmailBodyHtml(
      {
        body: 'plain fallback',
        thread_turns: [
          { level: 0, body_html: '<p>Current</p>' },
          { level: 1, body_html: '<p>Quoted</p>', meta: 'Jane · Mon' },
        ],
        from_address: 'a@b.com',
        from_name: 'A',
        date: '',
      },
      { bubblesDisabled: true },
    )
    expect(html).toContain('Current')
    expect(html).toContain('email-thread-turn')
    expect(html).toContain('Jane')
    expect(html).not.toContain('email-bubbles')
  })

  it('renders chat bubbles when thread_turns present and bubbles enabled', () => {
    const html = renderEmailBodyHtml(
      {
        body: 'plain fallback',
        thread_turns: [
          { level: 0, body_html: '<p>Current</p>' },
          { level: 1, body_html: '<p>Quoted</p>', meta: 'Jane · Mon' },
        ],
        from_address: 'other@example.com',
        from_name: 'Other',
        date: '2026-04-18T09:00:00Z',
      },
      { bubblesDisabled: false, mineAddresses: ['me@example.com'] },
    )
    expect(html).toContain('email-bubbles')
    expect(html).toContain('email-bubble-theirs')
    expect(html).toContain('Current')
  })

  it('uses boundaries for plain-text fold', () => {
    const body = 'Hello\n\n' + 'Q'.repeat(300)
    const html = renderEmailBodyHtml({
      body,
      boundaries: { sig_start: 7, quote_start: -1 },
      from_address: 'a@b.com',
      from_name: 'A',
      date: '',
    })
    expect(html).toContain('Hello')
    expect(html).toContain('email-sig-fold')
  })

  it('falls back to plaintext quote parsing without thread_turns', () => {
    const body = 'Reply here\n\n> quoted line'
    const html = renderEmailBodyHtml({
      body,
      from_address: 'a@b.com',
      from_name: 'A',
      date: '',
    })
    expect(html).toContain('Reply here')
    expect(html).toContain('quoted line')
    expect(html).toContain('email-thread-turn')
  })
})

describe('renderTurnsAsBubbles', () => {
  it('aligns the active account to the right', () => {
    const html = renderTurnsAsBubbles(
      [
        { level: 0, body_html: '<p>Hi</p>' },
        { level: 1, body_html: '<p>Earlier</p>', meta: 'Bob <bob@x.com>' },
      ],
      {
        body: '',
        from_address: 'me@x.com',
        from_name: 'Me',
        date: '2026-01-01T12:00:00Z',
      },
      ['me@x.com'],
    )
    expect(html).toContain('email-bubble-mine')
    expect(html).toContain('email-bubble-theirs')
  })
})
