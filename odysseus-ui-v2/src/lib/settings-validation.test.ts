import { describe, expect, it } from 'vitest'
import { validatePasswordChange } from './settings-validation'

describe('validatePasswordChange', () => {
  it('rejects empty fields', () => {
    expect(validatePasswordChange('', 'newpass12', 'newpass12')).toEqual({
      valid: false,
      error: 'Fill in all fields',
    })
  })

  it('rejects short passwords', () => {
    expect(validatePasswordChange('old', 'short', 'short')).toEqual({
      valid: false,
      error: 'Password must be at least 8 characters',
    })
  })

  it('rejects mismatched confirmation', () => {
    expect(validatePasswordChange('oldpass12', 'newpass12', 'otherpass')).toEqual({
      valid: false,
      error: "Passwords don't match",
    })
  })

  it('accepts valid input', () => {
    expect(validatePasswordChange('oldpass12', 'newpass12', 'newpass12')).toEqual({ valid: true })
  })
})
