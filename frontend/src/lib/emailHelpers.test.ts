import { describe, expect, it } from 'vitest'
import {
  buildEmailQueryParams,
  cleanAiReplyText,
  defaultFolder,
  formatAddress,
  formatEmailDate,
  isScheduledFolder,
  replyReferences,
  replySubject,
  SCHEDULED_FOLDER,
} from './emailHelpers'

describe('buildEmailQueryParams', () => {
  it('builds query string and skips empty values', () => {
    expect(
      buildEmailQueryParams({ folder: 'INBOX', account_id: 'abc', offset: 0, q: undefined }),
    ).toBe('?folder=INBOX&account_id=abc&offset=0')
  })

  it('returns empty string when no params', () => {
    expect(buildEmailQueryParams({})).toBe('')
  })
})

describe('formatAddress', () => {
  it('combines name and address', () => {
    expect(formatAddress('Jane Doe', 'jane@example.com')).toBe('Jane Doe <jane@example.com>')
  })

  it('returns address alone when name matches', () => {
    expect(formatAddress('jane@example.com', 'jane@example.com')).toBe('jane@example.com')
  })
})

describe('replySubject', () => {
  it('adds Re: prefix', () => {
    expect(replySubject('Hello')).toBe('Re: Hello')
  })

  it('does not duplicate Re:', () => {
    expect(replySubject('Re: Hello')).toBe('Re: Hello')
  })
})

describe('replyReferences', () => {
  it('appends message id', () => {
    expect(replyReferences('<a@b>', '<c@d>')).toBe('<c@d> <a@b>')
  })
})

describe('formatEmailDate', () => {
  it('formats from epoch', () => {
    const epoch = new Date('2020-06-15T12:00:00Z').getTime() / 1000
    expect(formatEmailDate(epoch)).toMatch(/Jun/)
  })
})

describe('defaultFolder', () => {
  it('prefers INBOX', () => {
    expect(defaultFolder(['Sent', 'INBOX', 'Trash'])).toBe('INBOX')
  })
})

describe('scheduled folder', () => {
  it('recognizes virtual scheduled folder', () => {
    expect(SCHEDULED_FOLDER).toBe('__scheduled__')
    expect(isScheduledFolder('__scheduled__')).toBe(true)
    expect(isScheduledFolder('INBOX')).toBe(false)
  })
})

describe('cleanAiReplyText', () => {
  it('extracts text between markers', () => {
    const raw = 'thinking\n<<<REPLY>>>\nHello there\n<<<END>>>'
    expect(cleanAiReplyText(raw)).toBe('Hello there')
  })

  it('strips stray markers', () => {
    expect(cleanAiReplyText('<<<SUMMARY>>> bullets <<<END>>>')).toBe('bullets')
  })
})
