import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Upload } from 'lucide-react'
import { CalendarEventForm } from '@/features/workspace/CalendarEventForm'
import { CalendarView } from '@/features/workspace/CalendarView'
import { Button } from '@/components/ui/button'
import { useCalendars, useCalendarMutations } from '@/hooks/useCalendar'
import {
  useCalendarAutoSync,
  useCalendarEventsForView,
  useCalendarSync,
  useIcsImport,
} from '@/hooks/useCalendarViews'
import type { CalendarEvent, EventCreatePayload, EventUpdatePayload } from '@/api/workspace-types'
import type { CalendarViewMode } from '@/lib/workspace/dateHelpers'

export function CalendarPage() {
  const [reference, setReference] = useState(() => new Date())
  const [view, setView] = useState<CalendarViewMode>('month')
  const [calendarHref, setCalendarHref] = useState('')
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [creatingForDate, setCreatingForDate] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const { data: calendars = [] } = useCalendars()
  const selectedCalendar = calendarHref || calendars[0]?.href || ''
  const { data: events = [], isLoading, isError } = useCalendarEventsForView(
    reference,
    view,
    selectedCalendar,
  )
  const { create, update, remove } = useCalendarMutations(reference, view, selectedCalendar)
  const sync = useCalendarSync()
  useCalendarAutoSync()

  const icsImport = useIcsImport()

  const showForm = editingEvent !== null || creatingForDate !== null

  const closeForm = () => {
    setEditingEvent(null)
    setCreatingForDate(null)
  }

  const handleSave = (
    payload: EventCreatePayload | EventUpdatePayload,
    uid?: string,
  ) => {
    if (uid) {
      update.mutate(
        { uid, payload },
        { onSuccess: () => closeForm() },
      )
    } else {
      create.mutate(payload as EventCreatePayload, { onSuccess: () => closeForm() })
    }
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-destructive">
        Could not load calendar.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Calendar</h2>
          <p className="mt-1 text-sm text-muted">
            Month grid, week, year, and agenda views with CalDAV sync.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
          >
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${sync.isPending ? 'animate-spin' : ''}`} />
            Sync now
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={icsImport.isPending}
            onClick={() => importRef.current?.click()}
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            Import .ics
          </Button>
          <input
            ref={importRef}
            type="file"
            accept=".ics"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) icsImport.mutate({ file })
              e.target.value = ''
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditingEvent(null)
              setCreatingForDate(new Date().toISOString().slice(0, 10))
            }}
          >
            New event
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {calendars.length > 0 ? (
          <label className="flex items-center gap-2">
            <span className="text-muted">Calendar</span>
            <select
              value={selectedCalendar}
              onChange={(e) => setCalendarHref(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            >
              {calendars.map((cal) => (
                <option key={cal.href} value={cal.href}>
                  {cal.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Link to="/settings?tab=integrations" className="text-primary hover:underline">
          CalDAV settings
        </Link>
      </div>

      {showForm ? (
        <CalendarEventForm
          event={editingEvent}
          defaultDate={creatingForDate ?? undefined}
          calendarHref={selectedCalendar}
          onSave={handleSave}
          onDelete={(uid) => remove.mutate(uid, { onSuccess: () => closeForm() })}
          onCancel={closeForm}
          isSaving={create.isPending || update.isPending}
        />
      ) : null}

      <CalendarView
        reference={reference}
        view={view}
        onReferenceChange={setReference}
        onViewChange={setView}
        events={events}
        isLoading={isLoading}
        onDelete={(uid) => remove.mutate(uid)}
        onSelectEvent={setEditingEvent}
        onSelectDay={(date) => {
          setEditingEvent(null)
          setCreatingForDate(date)
        }}
      />
    </div>
  )
}
