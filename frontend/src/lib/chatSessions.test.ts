import { describe, expect, it } from 'vitest'
import {
  collectFolderNames,
  groupSessionsByFolder,
  isIncognitoSession,
  messageDbId,
  sortSessions,
  visibleSessions,
} from '@/lib/chatSessions'
import type { Session } from '@/api/types'

const base = (overrides: Partial<Session>): Session => ({
  id: '1',
  name: 'Test',
  ...overrides,
})

describe('chatSessions helpers', () => {
  it('hides archived and incognito sessions from sidebar list', () => {
    const sessions = [
      base({ id: 'a', archived: true }),
      base({ id: 'b', name: 'Nobody' }),
      base({ id: 'c' }),
    ]
    const visible = visibleSessions(sessions, new Set(['d']))
    expect(visible.map((s) => s.id)).toEqual(['c'])
  })

  it('detects incognito by id or name', () => {
    expect(isIncognitoSession(base({ id: 'x' }), new Set(['x']))).toBe(true)
    expect(isIncognitoSession(base({ id: 'x', name: 'Nobody' }), new Set())).toBe(true)
  })

  it('sorts by last active with starred first', () => {
    const sessions = [
      base({ id: '1', last_message_at: '2026-01-01', is_important: false }),
      base({ id: '2', last_message_at: '2026-06-01', is_important: true }),
      base({ id: '3', last_message_at: '2026-03-01', is_important: false }),
    ]
    const sorted = sortSessions(sessions, 'active')
    expect(sorted.map((s) => s.id)).toEqual(['2', '3', '1'])
  })

  it('groups sessions by folder', () => {
    const { folders, unfiled } = groupSessionsByFolder([
      base({ id: '1', folder: 'Work' }),
      base({ id: '2' }),
      base({ id: '3', folder: 'Work' }),
    ])
    expect(unfiled.map((s) => s.id)).toEqual(['2'])
    expect(folders.Work.map((s) => s.id)).toEqual(['1', '3'])
    expect(collectFolderNames([base({ folder: 'B' }), base({ folder: 'A' })])).toEqual([
      'A',
      'B',
    ])
  })

  it('reads message db id from metadata', () => {
    expect(messageDbId({ metadata: { _db_id: 'abc' } })).toBe('abc')
    expect(messageDbId({})).toBeNull()
  })
})
