const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform)

function isAltGrEvent(e: KeyboardEvent): boolean {
  return e.ctrlKey && e.altKey && !e.metaKey && !e.shiftKey
}

/** Match a saved combo like `ctrl+alt+n` against a keyboard event. */
export function matchesKeybind(e: KeyboardEvent, combo: string): boolean {
  if (!combo) return false
  if (isAltGrEvent(e)) return false

  const parts = combo.toLowerCase().split('+')
  const needCtrl = parts.includes('ctrl')
  const needAlt = parts.includes('alt')
  const needShift = parts.includes('shift')
  const key = parts.filter((p) => p !== 'ctrl' && p !== 'alt' && p !== 'shift')[0] ?? ''

  if (needCtrl !== (e.ctrlKey || e.metaKey)) return false
  if (needAlt !== e.altKey) return false
  if (needShift !== e.shiftKey) return false
  return e.key.toLowerCase() === key
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}

export { IS_MAC }
