/** Legacy-aligned localStorage keys — mirrors static/js/storage.js KEYS. */

export const STORAGE_KEYS = {
  DENSITY: 'odysseus-density',
  DENSITY_V2_FALLBACK: 'odysseus-v2-density',
  CURRENT_SESSION: 'currentSessionId',
  LAST_SESSION: 'odysseus-v2-last-session',
  /** Legacy sessions.js persistence (loadSessions fallback). */
  LAST_SESSION_LEGACY: 'lastSessionId',
  RAG_ACTIVE: 'odysseus-rag-active',
  INCOGNITO: 'odysseus-incognito',
  /** sessionStorage — incognito session IDs (legacy sessions.js). */
  INCOGNITO_SESSIONS: 'ody-incognito-sessions',
} as const

export const LAST_SESSION_KEY = STORAGE_KEYS.LAST_SESSION

export function readLastSessionId(): string | null {
  return (
    localStorage.getItem(STORAGE_KEYS.LAST_SESSION) ||
    localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION) ||
    localStorage.getItem(STORAGE_KEYS.LAST_SESSION_LEGACY)
  )
}

export function writeLastSessionId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.LAST_SESSION, id)
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, id)
  localStorage.setItem(STORAGE_KEYS.LAST_SESSION_LEGACY, id)
}

export function clearLastSessionId(): void {
  localStorage.removeItem(STORAGE_KEYS.LAST_SESSION)
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION)
  localStorage.removeItem(STORAGE_KEYS.LAST_SESSION_LEGACY)
}

export function readRagActive(): boolean {
  const raw = localStorage.getItem(STORAGE_KEYS.RAG_ACTIVE)
  if (raw === 'true') return true
  if (raw === 'false') return false
  try {
    const toggles = JSON.parse(localStorage.getItem('odysseus-toggles') || '{}') as {
      rag?: boolean
    }
    if (typeof toggles.rag === 'boolean') return toggles.rag
  } catch {
    /* ignore */
  }
  return false
}

export function writeRagActive(active: boolean): void {
  localStorage.setItem(STORAGE_KEYS.RAG_ACTIVE, active ? 'true' : 'false')
  try {
    const raw = localStorage.getItem('odysseus-toggles')
    const toggles = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    toggles.rag = active
    localStorage.setItem('odysseus-toggles', JSON.stringify(toggles))
  } catch {
    /* ignore */
  }
}

export function readIncognitoPref(): boolean {
  const raw = localStorage.getItem(STORAGE_KEYS.INCOGNITO)
  if (raw === 'true') return true
  if (raw === 'false') return false
  return false
}

export function writeIncognitoPref(active: boolean): void {
  localStorage.setItem(STORAGE_KEYS.INCOGNITO, active ? 'true' : 'false')
}
