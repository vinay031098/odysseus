/** Calendar date-range helpers for workspace views */

function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getMonthRange(reference: Date): { start: string; end: string } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)
  return {
    start: `${toLocalDateString(start)}T00:00:00.000`,
    end: `${toLocalDateString(end)}T23:59:59.999`,
  }
}

export function getWeekRange(reference: Date): { start: string; end: string } {
  const d = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(d)
  start.setDate(d.getDate() + diff)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    start: `${toLocalDateString(start)}T00:00:00.000`,
    end: `${toLocalDateString(end)}T23:59:59.999`,
  }
}

export function getYearRange(reference: Date): { start: string; end: string } {
  const y = reference.getFullYear()
  return {
    start: `${y}-01-01T00:00:00.000`,
    end: `${y}-12-31T23:59:59.999`,
  }
}

export type CalendarViewMode = 'month' | 'week' | 'year' | 'agenda'

export function getAgendaRange(reference: Date): { start: string; end: string } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
  const end = new Date(reference)
  end.setMonth(end.getMonth() + 3)
  return {
    start: `${toLocalDateString(start)}T00:00:00.000`,
    end: `${toLocalDateString(end)}T23:59:59.999`,
  }
}

export function getRangeForView(reference: Date, view: CalendarViewMode): { start: string; end: string } {
  if (view === 'week') return getWeekRange(reference)
  if (view === 'year') return getYearRange(reference)
  if (view === 'agenda') return getAgendaRange(reference)
  return getMonthRange(reference)
}

export function shiftReference(reference: Date, view: CalendarViewMode, delta: number): Date {
  if (view === 'week') {
    const d = new Date(reference)
    d.setDate(d.getDate() + delta * 7)
    return d
  }
  if (view === 'agenda') {
    const d = new Date(reference)
    d.setDate(d.getDate() + delta * 30)
    return d
  }
  if (view === 'year') {
    return new Date(reference.getFullYear() + delta, reference.getMonth(), 1)
  }
  return shiftMonth(reference, delta)
}

export function formatViewTitle(reference: Date, view: CalendarViewMode): string {
  if (view === 'agenda') return 'Upcoming'
  if (view === 'year') return String(reference.getFullYear())
  if (view === 'week') {
    const { start, end } = getWeekRange(reference)
    const s = parseEventDate(start.slice(0, 10))
    const e = parseEventDate(end.slice(0, 10))
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
    const sFmt = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const eFmt = e.toLocaleDateString(undefined, {
      month: sameMonth ? undefined : 'short',
      day: 'numeric',
      year: s.getFullYear() === e.getFullYear() ? undefined : 'numeric',
    })
    return `${sFmt} – ${eFmt}, ${s.getFullYear()}`
  }
  return formatMonthYear(reference)
}

export function getWeekDays(reference: Date): Date[] {
  const { start } = getWeekRange(reference)
  const base = parseEventDate(start.slice(0, 10))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return d
  })
}

export function toDayKey(d: Date): string {
  return toLocalDateString(d)
}

export function eventColor(ev: { color?: string | null }, fallback = '#e06c75'): string {
  const c = ev.color
  if (!c || c.startsWith('<')) return fallback
  return c
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function parseEventDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(iso)
}

export function formatEventTime(iso: string, allDay?: boolean): string {
  if (allDay || /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return 'All day'
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatEventDayKey(iso: string): string {
  const d = parseEventDate(iso)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function getMonthGridDays(reference: Date): Date[] {
  const y = reference.getFullYear()
  const m = reference.getMonth()
  const first = new Date(y, m, 1)
  const dow = (first.getDay() + 6) % 7 // Monday-start
  const gridStart = new Date(y, m, 1 - dow)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })
}

export function groupEventsByDayKey<T extends { dtstart: string }>(
  events: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  const sorted = [...events].sort(
    (a, b) => parseEventDate(a.dtstart).getTime() - parseEventDate(b.dtstart).getTime(),
  )
  for (const ev of sorted) {
    const key = toDayKey(parseEventDate(ev.dtstart.slice(0, 10) || ev.dtstart))
    const list = groups.get(key) ?? []
    list.push(ev)
    groups.set(key, list)
  }
  return groups
}

export function groupEventsByDay<T extends { dtstart: string }>(
  events: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  const sorted = [...events].sort(
    (a, b) => parseEventDate(a.dtstart).getTime() - parseEventDate(b.dtstart).getTime(),
  )
  for (const ev of sorted) {
    const key = formatEventDayKey(ev.dtstart)
    const list = groups.get(key) ?? []
    list.push(ev)
    groups.set(key, list)
  }
  return groups
}
