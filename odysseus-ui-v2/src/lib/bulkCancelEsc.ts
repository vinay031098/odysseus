/** True when a bulk-cancel control is rendered and clickable. */
export function isBulkCancelVisible(btn: HTMLElement): boolean {
  if (btn instanceof HTMLButtonElement && btn.disabled) return false
  if (btn.closest('.hidden,[hidden]')) return false
  const cs = getComputedStyle(btn)
  if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false
  return btn.offsetWidth > 0 || btn.offsetHeight > 0 || btn.getClientRects().length > 0
}

/**
 * Capture-phase Esc handler: click the first visible `*-bulk-cancel` button so
 * bulk-select mode exits before modal/dialog close handlers run.
 */
export function initEscBulkCancel(): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    const cancels = document.querySelectorAll<HTMLElement>('[id$="-bulk-cancel"]')
    for (const btn of cancels) {
      if (isBulkCancelVisible(btn)) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        btn.click()
        return
      }
    }
  }

  document.addEventListener('keydown', onKeyDown, true)
  return () => document.removeEventListener('keydown', onKeyDown, true)
}
