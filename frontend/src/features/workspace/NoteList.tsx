import { useMemo } from 'react'
import { Bell, BellOff, Pin, Target, Trash2 } from 'lucide-react'
import type { Note } from '@/api/workspace-types'
import { Button } from '@/components/ui/button'
import {
  collectLabels,
  countDefaultNotes,
  countGoals,
  countTodayGoals,
  goalProgress,
  nextGoalStep,
  type NoteFilter,
} from '@/lib/workspace/noteFilters'
import {
  countNotesWithReminders,
  isReminderDue,
  type ReminderFilter,
} from '@/lib/workspace/noteReminders'
import { cn } from '@/lib/utils'

type NoteListProps = {
  notes: Note[]
  allNotes: Note[]
  selectedId: string | null
  noteFilter: NoteFilter
  labelFilter: string | null
  reminderFilter: ReminderFilter
  onNoteFilterChange: (filter: NoteFilter) => void
  onLabelFilterChange: (label: string | null) => void
  onReminderFilterChange: (filter: ReminderFilter) => void
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onTogglePin: (id: string) => void
  onToggleGoalStep?: (noteId: string, itemIdx: number) => void
}

export function NoteList({
  notes,
  allNotes,
  selectedId,
  noteFilter,
  labelFilter,
  reminderFilter,
  onNoteFilterChange,
  onLabelFilterChange,
  onReminderFilterChange,
  onSelect,
  onCreate,
  onDelete,
  onTogglePin,
  onToggleGoalStep,
}: NoteListProps) {
  const reminderCount = countNotesWithReminders(allNotes)
  const defaultCount = countDefaultNotes(allNotes)
  const goalCount = countGoals(allNotes)
  const todayCount = countTodayGoals(allNotes)
  const labels = useMemo(() => collectLabels(allNotes), [allNotes])

  const cycleReminderFilter = () => {
    if (reminderFilter === null) onReminderFilterChange('reminders')
    else if (reminderFilter === 'reminders') onReminderFilterChange('no-reminders')
    else onReminderFilterChange(null)
  }

  const toggleFilter = (f: NoteFilter) => {
    onNoteFilterChange(noteFilter === f ? null : f)
    if (f !== null) onLabelFilterChange(null)
  }

  if (allNotes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted">No notes yet.</p>
        <Button size="sm" onClick={onCreate}>
          New note
        </Button>
      </div>
    )
  }

  const isTodayView = noteFilter === 'today'

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3 space-y-2">
        <Button size="sm" className="w-full" onClick={onCreate}>
          New note
        </Button>
        <div className="flex flex-wrap gap-1">
          <FilterChip
            active={noteFilter === 'default'}
            onClick={() => toggleFilter('default')}
            label={`Default ${defaultCount}`}
          />
          {todayCount > 0 ? (
            <FilterChip
              active={noteFilter === 'today'}
              onClick={() => toggleFilter('today')}
              label={`Today ${todayCount}`}
              icon={<Target className="h-3 w-3" />}
            />
          ) : null}
          {goalCount > 0 ? (
            <FilterChip
              active={noteFilter === 'goals'}
              onClick={() => toggleFilter('goals')}
              label={`Goals ${goalCount}`}
            />
          ) : null}
          <FilterChip
            active={reminderFilter === 'reminders'}
            negated={reminderFilter === 'no-reminders'}
            onClick={cycleReminderFilter}
            label={`Reminders ${reminderCount}`}
            icon={
              reminderFilter === 'no-reminders' ? (
                <BellOff className="h-3 w-3" />
              ) : (
                <Bell className="h-3 w-3" />
              )
            }
          />
          {labels.map((label) => (
            <FilterChip
              key={label}
              active={labelFilter === label}
              onClick={() => {
                onLabelFilterChange(labelFilter === label ? null : label)
                if (labelFilter !== label) onNoteFilterChange(null)
              }}
              label={`#${label}`}
            />
          ))}
        </div>
      </div>

      {isTodayView ? (
        <TodayGoalList
          notes={notes}
          onSelect={onSelect}
          onToggleGoalStep={onToggleGoalStep}
        />
      ) : notes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
          No matching notes.
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-border">
          {notes.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => onSelect(note.id)}
                className={cn(
                  'flex w-full items-start gap-2 px-3 py-3 text-left transition-colors hover:bg-panel',
                  selectedId === note.id && 'bg-panel',
                  isReminderDue(note) && 'note-reminder-fired',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    {note.pinned ? <Pin className="h-3 w-3 shrink-0 text-primary" /> : null}
                    <span className="truncate text-sm font-medium">
                      {note.title?.trim() || 'Untitled'}
                    </span>
                    {note.note_type === 'goal' ? (
                      <span className="text-[10px] text-muted">{goalProgress(note)}</span>
                    ) : null}
                  </div>
                  {note.content ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{note.content}</p>
                  ) : null}
                  {note.due_date ? (
                    <p className="mt-1 text-xs text-primary">
                      Due {new Date(note.due_date).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                    onClick={(e) => {
                      e.stopPropagation()
                      onTogglePin(note.id)
                    }}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    aria-label="Delete note"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(note.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TodayGoalList({
  notes,
  onSelect,
  onToggleGoalStep,
}: {
  notes: Note[]
  onSelect: (id: string) => void
  onToggleGoalStep?: (noteId: string, itemIdx: number) => void
}) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
        All caught up — no pending goal steps.
      </div>
    )
  }

  return (
    <ul className="flex-1 overflow-y-auto divide-y divide-border">
      {notes.map((note) => {
        const next = nextGoalStep(note)
        if (!next) return null
        return (
          <li key={note.id} className="px-3 py-3">
            <div className="flex items-start gap-2">
              <button
                type="button"
                className="mt-1 h-4 w-4 shrink-0 rounded-full border border-border hover:border-primary"
                aria-label="Mark step done"
                onClick={() => onToggleGoalStep?.(note.id, next.idx)}
              />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  className="text-left text-sm font-medium hover:underline"
                  onClick={() => onSelect(note.id)}
                >
                  {note.title?.trim() || 'Untitled goal'}
                </button>
                <p className="mt-0.5 text-xs text-muted">{next.item.text}</p>
              </div>
              <span className="text-[10px] text-muted">{goalProgress(note)}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function FilterChip({
  active,
  negated,
  onClick,
  label,
  icon,
}: {
  active: boolean
  negated?: boolean
  onClick: () => void
  label: string
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
        active || negated
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted hover:text-foreground',
        negated && 'opacity-80',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

export type { NoteFilter }
