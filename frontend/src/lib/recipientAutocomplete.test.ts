import { describe, expect, it } from 'vitest'
import {
  commitRecipientValue,
  flattenContactSuggestions,
  isCompleteEmailFragment,
  parseExistingEmails,
  splitRecipientsAndFragment,
} from './recipientAutocomplete'

describe('recipientAutocomplete', () => {
  it('splits confirmed recipients from the active fragment', () => {
    expect(splitRecipientsAndFragment('a@x.com, bob')).toEqual({
      confirmed: 'a@x.com,',
      fragment: 'bob',
    })
    expect(splitRecipientsAndFragment('solo@x.com')).toEqual({
      confirmed: '',
      fragment: 'solo@x.com',
    })
  })

  it('commits a recipient with trailing comma', () => {
    expect(commitRecipientValue('a@x.com, ', 'b@y.com')).toBe('a@x.com, b@y.com, ')
    expect(commitRecipientValue('', 'b@y.com')).toBe('b@y.com, ')
  })

  it('skips already-entered emails in suggestions', () => {
    const already = parseExistingEmails('Ada <ada@x.com>, ')
    const items = flattenContactSuggestions(
      [{ name: 'Ada', emails: ['ada@x.com', 'ada+2@x.com'] }, { name: 'Bob', emails: ['bob@y.com'] }],
      already,
    )
    expect(items).toEqual([{ name: 'Ada', email: 'ada+2@x.com' }, { name: 'Bob', email: 'bob@y.com' }])
  })

  it('detects complete email fragments', () => {
    expect(isCompleteEmailFragment('user@example.com')).toBe(true)
    expect(isCompleteEmailFragment('not-an-email')).toBe(false)
  })
})
