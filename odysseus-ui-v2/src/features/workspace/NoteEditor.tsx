import { useEffect, useState } from 'react'
import type { Note } from '@/api/workspace-types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatRepeatLabel, REPEAT_OPTIONS } from '@/lib/workspace/noteRecurring'
import { splitDueDate, toDueDateIso } from '@/lib/workspace/noteReminders'

type NoteEditorProps = {
  note: Note | null
  onSave: (
    id: string,
    title: string,
    content: string,
    dueDate: string | null,
    repeat: string,
  ) => void
  isSaving?: boolean
}

export function NoteEditor({ note, onSave, isSaving }: NoteEditorProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('09:00')
  const [hasReminder, setHasReminder] = useState(false)
  const [repeat, setRepeat] = useState('none')

  useEffect(() => {
    setTitle(note?.title ?? '')
    setContent(note?.content ?? '')
    const split = splitDueDate(note?.due_date)
    setDueDate(split.date)
    setDueTime(split.time)
    setHasReminder(Boolean(note?.due_date))
    setRepeat(note?.repeat ?? 'none')
  }, [note?.id, note?.title, note?.content, note?.due_date, note?.repeat])

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
        Select a note or create a new one.
      </div>
    )
  }

  const currentDue = hasReminder && dueDate ? toDueDateIso(dueDate, dueTime) : null
  const currentRepeat = hasReminder ? repeat : 'none'
  const dueChanged =
    (note.due_date ?? null) !== currentDue &&
    !(note.due_date == null && currentDue == null)
  const repeatChanged = (note.repeat ?? 'none') !== currentRepeat

  const handleBlur = () => {
    if (
      title === (note.title ?? '') &&
      content === (note.content ?? '') &&
      !dueChanged &&
      !repeatChanged
    ) {
      return
    }
    onSave(note.id, title, content, currentDue, currentRepeat)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="note-title">Title</Label>
        <Input
          id="note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleBlur}
          placeholder="Note title"
          disabled={isSaving}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex items-center gap-2 text-sm sm:col-span-3">
          <input
            type="checkbox"
            checked={hasReminder}
            onChange={(e) => {
              setHasReminder(e.target.checked)
              if (!e.target.checked) {
                onSave(note.id, title, content, null, 'none')
              }
            }}
          />
          Reminder
        </label>
        {hasReminder ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="note-due-date">Due date</Label>
              <Input
                id="note-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={handleBlur}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-due-time">Due time</Label>
              <Input
                id="note-due-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                onBlur={handleBlur}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="note-repeat">Repeat</Label>
              <select
                id="note-repeat"
                value={repeat}
                onChange={(e) => {
                  setRepeat(e.target.value)
                  onSave(
                    note.id,
                    title,
                    content,
                    currentDue,
                    e.target.value,
                  )
                }}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                disabled={isSaving}
              >
                {REPEAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {repeat !== 'none' && dueDate ? (
                <p className="text-xs text-muted">
                  {formatRepeatLabel(repeat, new Date(toDueDateIso(dueDate, dueTime)))}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <Label htmlFor="note-content">Content</Label>
        <textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          placeholder="Write your note…"
          disabled={isSaving}
          className="min-h-[240px] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        />
      </div>
      {note.updated_at ? (
        <p className="text-xs text-muted">
          Updated {new Date(note.updated_at).toLocaleString()}
        </p>
      ) : null}
    </div>
  )
}
