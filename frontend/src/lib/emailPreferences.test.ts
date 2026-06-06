import { describe, expect, it, beforeEach } from 'vitest'
import {
  EMAIL_BUBBLES_DISABLED_KEY,
  readEmailBubblesDisabled,
  writeEmailBubblesDisabled,
} from './emailPreferences'

describe('emailPreferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults bubbles to enabled', () => {
    expect(readEmailBubblesDisabled()).toBe(false)
  })

  it('persists bubble disable preference', () => {
    writeEmailBubblesDisabled(true)
    expect(localStorage.getItem(EMAIL_BUBBLES_DISABLED_KEY)).toBe('1')
    expect(readEmailBubblesDisabled()).toBe(true)
    writeEmailBubblesDisabled(false)
    expect(readEmailBubblesDisabled()).toBe(false)
  })
})
