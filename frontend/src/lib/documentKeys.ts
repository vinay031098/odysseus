export { LAST_SESSION_KEY } from '@/lib/storageKeys'

export const PENDING_DOC_KEY = 'odysseus-v2-pending-doc'

const docOpenKey = (sessionId: string) => `odysseus-doc-open-${sessionId}`
const docMinimizedKey = (sessionId: string) => `odysseus-doc-minimized-${sessionId}`

export function markDocVisibleState(
  sessionId: string,
  state: 'open' | 'minimized' | 'closed',
): void {
  if (!sessionId) return
  if (state === 'open') {
    localStorage.setItem(docOpenKey(sessionId), '1')
    localStorage.removeItem(docMinimizedKey(sessionId))
  } else if (state === 'minimized') {
    localStorage.removeItem(docOpenKey(sessionId))
    localStorage.setItem(docMinimizedKey(sessionId), '1')
  } else {
    localStorage.removeItem(docOpenKey(sessionId))
    localStorage.removeItem(docMinimizedKey(sessionId))
  }
}

export function getDocRestoreState(sessionId: string): {
  shouldOpen: boolean
  shouldMinimize: boolean
} {
  return {
    shouldOpen: localStorage.getItem(docOpenKey(sessionId)) === '1',
    shouldMinimize: localStorage.getItem(docMinimizedKey(sessionId)) === '1',
  }
}
