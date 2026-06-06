import type { Session } from '@/api/types'

export type SessionSortMode = 'active' | 'newest' | 'group'

const INCOGNITO_NAMES = new Set(['Nobody', 'Incognito'])

export function isIncognitoSession(session: Session, incognitoIds: Set<string>): boolean {
  return incognitoIds.has(session.id) || INCOGNITO_NAMES.has((session.name ?? '').trim())
}

export function visibleSessions(sessions: Session[], incognitoIds: Set<string>): Session[] {
  return sessions.filter(
    (s) => !s.archived && !isIncognitoSession(s, incognitoIds) && (s.folder ?? '') !== 'Assistant',
  )
}

export function sortSessions(sessions: Session[], mode: SessionSortMode): Session[] {
  const starred = sessions.filter((s) => s.is_important)
  const rest = sessions.filter((s) => !s.is_important)
  const ordered = [...starred, ...rest]

  if (mode === 'newest') {
    return [...ordered].sort((a, b) =>
      (b.created_at ?? '').localeCompare(a.created_at ?? ''),
    )
  }
  if (mode === 'active') {
    return [...ordered].sort((a, b) => {
      const av = a.last_message_at ?? a.updated_at ?? a.created_at ?? ''
      const bv = b.last_message_at ?? b.updated_at ?? b.created_at ?? ''
      return bv.localeCompare(av)
    })
  }
  return ordered
}

export function groupSessionsByFolder(sessions: Session[]): {
  folders: Record<string, Session[]>
  unfiled: Session[]
} {
  const folders: Record<string, Session[]> = {}
  const unfiled: Session[] = []
  for (const s of sessions) {
    if (s.folder) {
      if (!folders[s.folder]) folders[s.folder] = []
      folders[s.folder].push(s)
    } else {
      unfiled.push(s)
    }
  }
  return { folders, unfiled }
}

export function collectFolderNames(sessions: Session[]): string[] {
  const names = new Set<string>()
  for (const s of sessions) {
    if (s.folder) names.add(s.folder)
  }
  return Array.from(names).sort()
}

export function messageDbId(msg: { metadata?: Record<string, unknown> }): string | null {
  const id = msg.metadata?._db_id
  return typeof id === 'string' ? id : null
}
