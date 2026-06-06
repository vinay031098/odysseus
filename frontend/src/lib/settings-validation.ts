export const MIN_PASSWORD_LENGTH = 8

export interface PasswordValidationResult {
  valid: boolean
  error?: string
}

export function validatePasswordChange(
  current: string,
  next: string,
  confirm: string,
): PasswordValidationResult {
  if (!current.trim() || !next.trim()) {
    return { valid: false, error: 'Fill in all fields' }
  }
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }
  }
  if (next !== confirm) {
    return { valid: false, error: "Passwords don't match" }
  }
  return { valid: true }
}
