import { describe, expect, it } from 'vitest'
import {
  countFiredReminders,
  filterNotesByReminder,
  hasTimeComponent,
  isReminderDue,
} from '@/lib/workspace/noteReminders'
import type { Note } from '@/api/workspace-types'

const baseNote = (overrides: Partial<Note> = {}): Note => ({
  id: '1',
  title: 'Test',
  note_type: 'note',
  pinned: false,
  archived: false,
  ...overrides,
})

describe('hasTimeComponent', () => {
  it('detects datetime due dates', () => {
    expect(hasTimeComponent('2026-06-06T09:00:00')).toBe(true)
    expect(hasTimeComponent('2026-06-06')).toBe(false)
  })
})

describe('isReminderDue', () => {
  it('returns true when due time has passed', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(isReminderDue(baseNote({ due_date: past }))).toBe(true)
  })
})

describe('filterNotesByReminder', () => {
  it('filters reminders and no-reminders', () => {
    const notes = [
      baseNote({ id: 'a', due_date: '2026-06-06T09:00:00' }),
      baseNote({ id: 'b' }),
    ]
    expect(filterNotesByReminder(notes, 'reminders').map((n) => n.id)).toEqual(['a'])
    expect(filterNotesByReminder(notes, 'no-reminders').map((n) => n.id)).toEqual(['b'])
  })
})

describe('countFiredReminders', () => {
  it('counts only reminders fired after dismissal', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    const notes = [baseNote({ due_date: past })]
    expect(countFiredReminders(notes, Date.now())).toBe(0)
    expect(countFiredReminders(notes, 0)).toBe(1)
  })
})
