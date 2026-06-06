import { useEffect, useMemo, useState } from 'react'
import { NoteEditor } from '@/features/workspace/NoteEditor'
import { NoteList, type NoteFilter } from '@/features/workspace/NoteList'
import { filterNotes } from '@/lib/workspace/noteFilters'
import { useNoteMutations, useNotes } from '@/hooks/useNotes'
import { useNoteReminderPoll } from '@/hooks/useNoteReminders'
import {
  filterNotesByReminder,
  saveReminderDismissedAt,
  type ReminderFilter,
} from '@/lib/workspace/noteReminders'

export function NotesPage() {
  const { data: notes = [], isLoading, isError } = useNotes()
  const { create, update, remove, togglePin } = useNoteMutations()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [noteFilter, setNoteFilter] = useState<NoteFilter>(null)
  const [labelFilter, setLabelFilter] = useState<string | null>(null)
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>(null)

  useNoteReminderPoll(notes)

  useEffect(() => {
    saveReminderDismissedAt(Date.now())
  }, [])

  const filteredNotes = useMemo(() => {
    let list = filterNotes(notes, noteFilter, labelFilter)
    list = filterNotesByReminder(list, reminderFilter)
    return list
  }, [notes, noteFilter, labelFilter, reminderFilter])

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  )

  const handleCreate = async () => {
    const note = await create.mutateAsync({ title: 'Untitled', content: '' })
    setSelectedId(note.id)
  }

  const handleSave = (
    id: string,
    title: string,
    content: string,
    dueDate: string | null,
    repeat: string,
  ) => {
    update.mutate({
      id,
      payload: { title, content, due_date: dueDate, repeat },
    })
  }

  const handleToggleGoalStep = (noteId: string, itemIdx: number) => {
    const note = notes.find((n) => n.id === noteId)
    if (!note?.items) return
    const items = note.items.map((item, i) =>
      i === itemIdx ? { ...item, done: !item.done } : item,
    )
    update.mutate({ id: noteId, payload: { items } })
  }

  if (isLoading) {
    return <PageState message="Loading notes…" />
  }
  if (isError) {
    return <PageState message="Could not load notes." error />
  }

  return (
    <div className="flex h-full min-h-[480px]">
      <div className="w-full max-w-xs shrink-0 border-r border-border">
        <NoteList
          notes={filteredNotes}
          allNotes={notes}
          selectedId={selectedId}
          noteFilter={noteFilter}
          labelFilter={labelFilter}
          reminderFilter={reminderFilter}
          onNoteFilterChange={setNoteFilter}
          onLabelFilterChange={setLabelFilter}
          onReminderFilterChange={setReminderFilter}
          onSelect={setSelectedId}
          onCreate={() => void handleCreate()}
          onDelete={(id) => {
            remove.mutate(id)
            if (selectedId === id) setSelectedId(null)
          }}
          onTogglePin={(id) => togglePin.mutate(id)}
          onToggleGoalStep={handleToggleGoalStep}
        />
      </div>
      <div className="min-w-0 flex-1">
        <NoteEditor
          note={selected}
          onSave={handleSave}
          isSaving={update.isPending}
        />
      </div>
    </div>
  )
}

function PageState({ message, error }: { message: string; error?: boolean }) {
  return (
    <div className={`flex h-full items-center justify-center p-6 text-sm ${error ? 'text-destructive' : 'text-muted'}`}>
      {message}
    </div>
  )
}
