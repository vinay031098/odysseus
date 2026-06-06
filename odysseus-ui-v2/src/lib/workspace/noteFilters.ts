import type { Note, NoteChecklistItem } from '@/api/workspace-types'
import { hasTimeComponent } from '@/lib/workspace/noteReminders'

export type NoteFilter =
  | null
  | 'default'
  | 'reminders'
  | 'no-reminders'
  | 'goals'
  | 'today'

export function noteTags(note: Note): string[] {
  const tags: string[] = []
  if (note.label) tags.push(...note.label.trim().split(/\s+/).filter(Boolean))
  if (note.due_date && hasTimeComponent(note.due_date)) tags.push('reminder')
  return [...new Set(tags.map((t) => t.replace(/^#+/, '').trim()).filter(Boolean))]
}

export function visibleNoteTags(note: Note): string[] {
  return noteTags(note).filter((t) => t !== 'reminder')
}

export function nextGoalStep(note: Note): { idx: number; item: NoteChecklistItem } | null {
  if (!Array.isArray(note.items)) return null
  for (let i = 0; i < note.items.length; i++) {
    if (!note.items[i].done) return { idx: i, item: note.items[i] }
  }
  return null
}

export function goalProgress(note: Note): string {
  if (!Array.isArray(note.items) || note.items.length === 0) return ''
  const done = note.items.filter((it) => it.done).length
  return `${done}/${note.items.length}`
}

export function collectLabels(notes: Note[]): string[] {
  const labels = new Set<string>()
  for (const n of notes) {
    for (const t of visibleNoteTags(n)) labels.add(t)
  }
  return [...labels].sort()
}

export function countDefaultNotes(notes: Note[]): number {
  return notes.filter((n) => !n.archived && visibleNoteTags(n).length === 0).length
}

export function countGoals(notes: Note[]): number {
  return notes.filter((n) => n.note_type === 'goal' && !n.archived).length
}

export function countTodayGoals(notes: Note[]): number {
  return notes.filter(
    (n) => n.note_type === 'goal' && !n.archived && nextGoalStep(n) !== null,
  ).length
}

export function filterNotes(
  notes: Note[],
  filter: NoteFilter,
  label: string | null,
): Note[] {
  let filtered = notes
  if (label) {
    filtered = filtered.filter((n) => visibleNoteTags(n).includes(label))
  }
  if (!filter) return filtered

  if (filter === 'reminders') {
    return filtered.filter((n) => n.due_date && hasTimeComponent(n.due_date))
  }
  if (filter === 'no-reminders') {
    return filtered.filter((n) => !(n.due_date && hasTimeComponent(n.due_date)))
  }
  if (filter === 'default') {
    return filtered.filter((n) => visibleNoteTags(n).length === 0)
  }
  if (filter === 'goals') {
    return filtered.filter((n) => n.note_type === 'goal' && !n.archived)
  }
  if (filter === 'today') {
    return filtered.filter(
      (n) => n.note_type === 'goal' && !n.archived && nextGoalStep(n) !== null,
    )
  }
  return filtered
}
