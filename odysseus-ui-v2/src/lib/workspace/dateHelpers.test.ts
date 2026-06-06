import { describe, expect, it } from 'vitest'
import {
  formatEventDayKey,
  getAgendaRange,
  getMonthGridDays,
  getMonthRange,
  getWeekRange,
  getYearRange,
  groupEventsByDay,
  groupEventsByDayKey,
  parseEventDate,
} from './dateHelpers'

describe('getMonthRange', () => {
  it('returns ISO bounds for the given month', () => {
    const ref = new Date(2026, 5, 15) // June 2026
    const { start, end } = getMonthRange(ref)
    expect(new Date(start).getMonth()).toBe(5)
    expect(new Date(start).getDate()).toBe(1)
    expect(new Date(end).getMonth()).toBe(5)
    expect(new Date(end).getDate()).toBe(30)
  })
})

describe('parseEventDate', () => {
  it('parses all-day date strings as local midnight', () => {
    const d = parseEventDate('2026-06-06')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(5)
    expect(d.getDate()).toBe(6)
  })
})

describe('getWeekRange', () => {
  it('spans seven days starting Monday', () => {
    const ref = new Date(2026, 5, 11) // Wed Jun 11 2026
    const { start, end } = getWeekRange(ref)
    expect(start.startsWith('2026-06-08')).toBe(true)
    expect(end.startsWith('2026-06-14')).toBe(true)
  })
})

describe('getYearRange', () => {
  it('covers full calendar year', () => {
    const { start, end } = getYearRange(new Date(2026, 0, 1))
    expect(start).toContain('2026-01-01')
    expect(end).toContain('2026-12-31')
  })
})

describe('getAgendaRange', () => {
  it('spans three months forward', () => {
    const ref = new Date(2026, 5, 6)
    const { start, end } = getAgendaRange(ref)
    expect(start.startsWith('2026-06-06')).toBe(true)
    expect(new Date(end).getMonth()).toBe(8) // September
  })
})

describe('getMonthGridDays', () => {
  it('returns 42 days for month grid', () => {
    expect(getMonthGridDays(new Date(2026, 5, 15))).toHaveLength(42)
  })
})

describe('groupEventsByDayKey', () => {
  it('groups by ISO day key', () => {
    const groups = groupEventsByDayKey([
      { dtstart: '2026-06-06T14:00:00' },
      { dtstart: '2026-06-07T10:00:00' },
    ])
    expect(groups.size).toBe(2)
    expect(groups.get('2026-06-06')?.length).toBe(1)
  })
})

describe('groupEventsByDay', () => {
  it('groups events by formatted day label', () => {
    const groups = groupEventsByDay([
      { dtstart: '2026-06-06T14:00:00', summary: 'a' },
      { dtstart: '2026-06-06T09:00:00', summary: 'b' },
      { dtstart: '2026-06-07T10:00:00', summary: 'c' },
    ])
    expect(groups.size).toBe(2)
    const dayKey = formatEventDayKey('2026-06-06T14:00:00')
    expect(groups.get(dayKey)?.length).toBe(2)
  })
})
