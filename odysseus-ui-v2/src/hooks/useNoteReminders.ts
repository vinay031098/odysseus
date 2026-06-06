import { useEffect, useRef, useState } from 'react'
import { fireNoteReminder } from '@/api/notes'
import { updateNote } from '@/api/notes'
import type { Note } from '@/api/workspace-types'
import {
  countFiredReminders,
  hasTimeComponent,
  loadReminderDismissedAt,
  saveReminderDismissedAt,
} from '@/lib/workspace/noteReminders'
import { advanceRecurring } from '@/lib/workspace/noteRecurring'
import {
  ensureNotificationPermission,
  showBrowserNotification,
} from '@/lib/workspace/notifications'
import { notesQueryKey } from '@/hooks/useNotes'
import { useQueryClient } from '@tanstack/react-query'

const FIRED_KEY = 'odysseus-notes-reminder-fired'
const POLL_MS = 30_000

function loadFiredIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || '[]') as string[])
  } catch {
    return new Set()
  }
}

function saveFiredIds(ids: Set<string>): void {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify([...ids].slice(-200)))
  } catch {
    /* ignore */
  }
}

export function useNotesReminderBadge(notes: Note[]) {
  const [dismissedAt, setDismissedAt] = useState(loadReminderDismissedAt)
  const fired = countFiredReminders(notes, dismissedAt)

  const dismiss = () => {
    const at = Date.now()
    saveReminderDismissedAt(at)
    setDismissedAt(at)
  }

  return { firedCount: fired, dismissBadge: dismiss }
}

export function useNoteReminderPoll(notes: Note[]) {
  const firedRef = useRef(loadFiredIds())
  const permissionAsked = useRef(false)
  const qc = useQueryClient()

  useEffect(() => {
    if (!permissionAsked.current) {
      permissionAsked.current = true
      void ensureNotificationPermission()
    }
  }, [])

  useEffect(() => {
    const check = async () => {
      const now = Date.now()
      const fired = firedRef.current
      let changed = false

      for (const note of notes) {
        if (!note.due_date || note.archived || !hasTimeComponent(note.due_date)) continue
        if (fired.has(note.id)) continue
        const due = new Date(note.due_date).getTime()
        if (Number.isNaN(due) || due > now) continue

        fired.add(note.id)
        changed = true
        const body = note.content?.trim() || note.title || 'Reminder'
        const title = note.title || 'Note reminder'

        showBrowserNotification(title, body, `note-${note.id}`)

        void fireNoteReminder({
          note_id: note.id,
          title,
          body,
        }).catch(() => {})

        const repeat = note.repeat
        if (repeat && repeat !== 'none') {
          const next = advanceRecurring(note.due_date, repeat)
          if (next) {
            try {
              await updateNote(note.id, { due_date: next })
              fired.delete(note.id)
              void qc.invalidateQueries({ queryKey: notesQueryKey })
            } catch {
              /* keep fired id if advance fails */
            }
          }
        }
      }

      if (changed) saveFiredIds(fired)
    }

    void check()
    const id = window.setInterval(() => void check(), POLL_MS)
    return () => window.clearInterval(id)
  }, [notes, qc])
}

export { notesQueryKey }
