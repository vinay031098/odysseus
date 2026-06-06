import type { Note } from '@/api/workspace-types'

export type ReminderFilter = null | 'reminders' | 'no-reminders'

export const REMINDER_DISMISSED_AT_KEY = 'odysseus-notes-reminder-dismissed-at'

export function hasTimeComponent(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  return dueDate.includes('T') && /\d{2}:\d{2}/.test(dueDate)
}

export function isReminderDue(note: Note, now = Date.now()): boolean {
  if (note.archived || !note.due_date || !hasTimeComponent(note.due_date)) return false
  const t = new Date(note.due_date).getTime()
  return !Number.isNaN(t) && t <= now
}

export function countFiredReminders(notes: Note[], dismissedAt: number): number {
  const now = Date.now()
  return notes.filter((n) => {
    if (n.archived || !n.due_date || !hasTimeComponent(n.due_date)) return false
    const t = new Date(n.due_date).getTime()
    if (Number.isNaN(t) || t > now) return false
    return t > dismissedAt
  }).length
}

export function loadReminderDismissedAt(): number {
  try {
    const v = parseInt(localStorage.getItem(REMINDER_DISMISSED_AT_KEY) || '0', 10)
    return Number.isFinite(v) && v > 0 ? v : 0
  } catch {
    return 0
  }
}

export function saveReminderDismissedAt(at: number): void {
  try {
    localStorage.setItem(REMINDER_DISMISSED_AT_KEY, String(at))
  } catch {
    /* ignore */
  }
}

export function filterNotesByReminder(
  notes: Note[],
  filter: ReminderFilter,
): Note[] {
  if (!filter) return notes
  const hasReminder = (n: Note) => Boolean(n.due_date && hasTimeComponent(n.due_date))
  if (filter === 'reminders') return notes.filter(hasReminder)
  return notes.filter((n) => !hasReminder(n))
}

export function countNotesWithReminders(notes: Note[]): number {
  return notes.filter((n) => !n.archived && n.due_date && hasTimeComponent(n.due_date)).length
}

export function toDueDateIso(date: string, time: string): string {
  return `${date}T${time}:00`
}

export function splitDueDate(dueDate: string | null | undefined): { date: string; time: string } {
  if (!dueDate) return { date: '', time: '09:00' }
  const d = new Date(dueDate)
  if (Number.isNaN(d.getTime())) return { date: '', time: '09:00' }
  const date = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { date, time }
}
