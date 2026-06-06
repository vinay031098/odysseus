/** localStorage key — mirrors legacy `odysseus.email.bubblesDisabled`. */
export const EMAIL_BUBBLES_DISABLED_KEY = 'odysseus.email.bubblesDisabled'

export function readEmailBubblesDisabled(): boolean {
  try {
    return localStorage.getItem(EMAIL_BUBBLES_DISABLED_KEY) === '1'
  } catch {
    return false
  }
}

export function writeEmailBubblesDisabled(disabled: boolean): void {
  try {
    localStorage.setItem(EMAIL_BUBBLES_DISABLED_KEY, disabled ? '1' : '0')
  } catch {
    // ignore quota / private mode
  }
}
