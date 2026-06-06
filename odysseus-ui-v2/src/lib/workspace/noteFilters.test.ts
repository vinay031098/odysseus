import { describe, expect, it } from 'vitest'
import { advanceRecurring, formatRepeatLabel } from '@/lib/workspace/noteRecurring'
import { filterNotes, nextGoalStep } from '@/lib/workspace/noteFilters'
import type { Note } from '@/api/workspace-types'

const baseNote = (overrides: Partial<Note> = {}): Note => ({
  id: '1',
  title: 'Test',
  note_type: 'note',
  pinned: false,
  archived: false,
  ...overrides,
})

describe('advanceRecurring', () => {
  it('advances daily repeat to the future', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString().slice(0, 16)
    const next = advanceRecurring(`${past}:00`, 'daily')
    expect(next).toBeTruthy()
    expect(new Date(next!).getTime()).toBeGreaterThan(Date.now())
  })
})

describe('formatRepeatLabel', () => {
  it('formats daily repeat', () => {
    expect(formatRepeatLabel('daily')).toBe('Daily')
  })
})

describe('filterNotes goals/today', () => {
  it('filters goals and today view', () => {
    const notes = [
      baseNote({
        id: 'g1',
        note_type: 'goal',
        items: [{ text: 'step', done: false }],
      }),
      baseNote({ id: 'n1' }),
    ]
    expect(filterNotes(notes, 'goals', null).map((n) => n.id)).toEqual(['g1'])
    expect(filterNotes(notes, 'today', null).map((n) => n.id)).toEqual(['g1'])
    expect(nextGoalStep(notes[0])?.idx).toBe(0)
  })
})
