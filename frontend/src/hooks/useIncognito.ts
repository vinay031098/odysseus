import { useCallback, useEffect, useState } from 'react'
import { deleteSession } from '@/api/sessions'
import { STORAGE_KEYS } from '@/lib/storageKeys'

const INCOGNITO_KEY = STORAGE_KEYS.INCOGNITO_SESSIONS

function readIds(): string[] {
  try {
    const raw = sessionStorage.getItem(INCOGNITO_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeIds(ids: string[]) {
  sessionStorage.setItem(INCOGNITO_KEY, JSON.stringify(ids))
}

export function useIncognito(currentSessionId: string | null) {
  const [ids, setIds] = useState<Set<string>>(() => new Set(readIds()))

  const markIncognito = useCallback((sessionId: string) => {
    setIds((prev) => {
      const next = new Set(prev)
      next.add(sessionId)
      writeIds([...next])
      return next
    })
  }, [])

  const cleanupStale = useCallback(async () => {
    const all = readIds()
    const toDelete = all.filter((id) => id !== currentSessionId)
    if (!toDelete.length) return
    const keep = currentSessionId ? [currentSessionId] : []
    writeIds(keep)
    setIds(new Set(keep))
    await Promise.all(toDelete.map((id) => deleteSession(id).catch(() => undefined)))
  }, [currentSessionId])

  useEffect(() => {
    void cleanupStale()
  }, [cleanupStale])

  return { incognitoIds: ids, markIncognito, isIncognito: ids.has(currentSessionId ?? '') }
}
