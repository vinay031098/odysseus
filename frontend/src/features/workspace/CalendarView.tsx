import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import type { CalendarEvent } from '@/api/workspace-types'
import { Button } from '@/components/ui/button'
import {
  eventColor,
  formatEventTime,
  formatViewTitle,
  getMonthGridDays,
  getWeekDays,
  groupEventsByDayKey,
  parseEventDate,
  shiftReference,
  toDayKey,
  type CalendarViewMode,
} from '@/lib/workspace/dateHelpers'
import { cn } from '@/lib/utils'

type CalendarViewProps = {
  reference: Date
  view: CalendarViewMode
  onReferenceChange: (date: Date) => void
  onViewChange: (view: CalendarViewMode) => void
  events: CalendarEvent[]
  isLoading?: boolean
  onDelete?: (uid: string) => void
  onSelectEvent?: (event: CalendarEvent) => void
  onSelectDay?: (date: string) => void
}

const VIEW_MODES: CalendarViewMode[] = ['month', 'week', 'year', 'agenda']
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarView({
  reference,
  view,
  onReferenceChange,
  onViewChange,
  events,
  isLoading,
  onSelectEvent,
  onSelectDay,
}: CalendarViewProps) {
  const todayKey = toDayKey(new Date())

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onReferenceChange(shiftReference(reference, view, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="min-w-[140px] text-center text-sm font-semibold">
            {formatViewTitle(reference, view)}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onReferenceChange(shiftReference(reference, view, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1">
          {VIEW_MODES.map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={view === mode ? 'default' : 'secondary'}
              onClick={() => {
                if (mode === 'agenda') onReferenceChange(new Date())
                onViewChange(mode)
              }}
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading events…</p>
      ) : view === 'year' ? (
        <YearGrid
          reference={reference}
          events={events}
          onPickMonth={(m) => {
            onViewChange('month')
            onReferenceChange(new Date(reference.getFullYear(), m, 1))
          }}
        />
      ) : view === 'week' ? (
        <WeekGrid reference={reference} events={events} onSelectEvent={onSelectEvent} />
      ) : view === 'agenda' ? (
        <AgendaView events={events} todayKey={todayKey} onSelectEvent={onSelectEvent} />
      ) : (
        <MonthGrid
          reference={reference}
          events={events}
          todayKey={todayKey}
          onSelectEvent={onSelectEvent}
          onSelectDay={onSelectDay}
        />
      )}
    </div>
  )
}

function MonthGrid({
  reference,
  events,
  todayKey,
  onSelectEvent,
  onSelectDay,
}: {
  reference: Date
  events: CalendarEvent[]
  todayKey: string
  onSelectEvent?: (event: CalendarEvent) => void
  onSelectDay?: (date: string) => void
}) {
  const month = reference.getMonth()
  const days = getMonthGridDays(reference)
  const byDay = groupEventsByDayKey(events)

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-panel/50">
        {WEEKDAY_LABELS.map((wd) => (
          <div key={wd} className="px-1 py-2 text-center text-[10px] font-semibold uppercase text-muted">
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = toDayKey(day)
          const dayEvents = byDay.get(key) ?? []
          const isOtherMonth = day.getMonth() !== month
          const isToday = key === todayKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay?.(key)}
              className={cn(
                'min-h-[88px] border-b border-r border-border p-1 text-left transition-colors hover:bg-panel/60',
                isOtherMonth && 'bg-panel/20 text-muted',
                isToday && 'ring-1 ring-inset ring-primary/40',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isToday && 'bg-primary text-primary-foreground',
                )}
              >
                {day.getDate()}
              </span>
              <ul className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <li
                    key={ev.uid}
                    role="presentation"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectEvent?.(ev)
                    }}
                    className="flex items-center gap-1 truncate rounded px-0.5 text-[10px] hover:bg-panel"
                    title={ev.summary}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: eventColor(ev) }}
                    />
                    <span className="truncate">
                      {!ev.all_day ? `${formatEventTime(ev.dtstart, ev.all_day).replace('All day', '')} ` : ''}
                      {ev.summary || 'Untitled'}
                    </span>
                  </li>
                ))}
                {dayEvents.length > 3 ? (
                  <li className="px-0.5 text-[10px] text-muted">+{dayEvents.length - 3} more</li>
                ) : null}
              </ul>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AgendaView({
  events,
  todayKey,
  onSelectEvent,
}: {
  events: CalendarEvent[]
  todayKey: string
  onSelectEvent?: (event: CalendarEvent) => void
}) {
  const sorted = [...events].sort(
    (a, b) => parseEventDate(a.dtstart).getTime() - parseEventDate(b.dtstart).getTime(),
  )
  const byDay = groupEventsByDayKey(sorted)
  if (todayKey && !byDay.has(todayKey)) byDay.set(todayKey, [])
  const dates = [...byDay.keys()].sort()

  if (dates.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel p-8 text-center text-sm text-muted">
        No upcoming events.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {dates.map((dateKey) => {
        const dayEvents = byDay.get(dateKey) ?? []
        const d = parseEventDate(dateKey)
        const isToday = dateKey === todayKey
        const label = d.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })
        return (
          <section key={dateKey}>
            <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              {label}
              {isToday ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] normal-case text-primary">
                  Today
                </span>
              ) : null}
            </h4>
            {dayEvents.length === 0 ? (
              <p className="text-xs text-muted">No events</p>
            ) : (
              <ul className="space-y-2">
                {dayEvents.map((ev) => (
                  <AgendaEventRow key={ev.uid} ev={ev} onSelect={onSelectEvent} />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function AgendaEventRow({
  ev,
  onSelect,
}: {
  ev: CalendarEvent
  onSelect?: (event: CalendarEvent) => void
}) {
  const color = eventColor(ev)
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect?.(ev)}
        className="flex w-full items-start gap-3 rounded-lg border border-border bg-panel p-3 text-left hover:border-primary/30"
        style={{ borderLeftWidth: 4, borderLeftColor: color }}
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium">{ev.summary || 'Untitled'}</p>
          <p className="text-xs text-muted">
            {formatEventTime(ev.dtstart, ev.all_day)}
            {ev.location ? ` · ${ev.location}` : ''}
          </p>
        </div>
      </button>
    </li>
  )
}

function WeekGrid({
  reference,
  events,
  onSelectEvent,
}: {
  reference: Date
  events: CalendarEvent[]
  onSelectEvent?: (event: CalendarEvent) => void
}) {
  const days = getWeekDays(reference)
  const byDay = groupEventsByDayKey(events)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const key = toDayKey(day)
        const dayEvents = byDay.get(key) ?? []
        return (
          <div key={key} className="rounded-lg border border-border bg-panel p-2 min-h-[120px]">
            <p className="mb-2 text-xs font-semibold text-muted">
              {day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
            </p>
            <ul className="space-y-1">
              {dayEvents.map((ev) => (
                <li key={ev.uid}>
                  <button
                    type="button"
                    onClick={() => onSelectEvent?.(ev)}
                    className="w-full truncate rounded px-1 py-0.5 text-left text-xs hover:bg-background"
                    style={{ borderLeft: `3px solid ${eventColor(ev)}` }}
                    title={ev.summary}
                  >
                    {formatEventTime(ev.dtstart, ev.all_day)} {ev.summary || 'Untitled'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function YearGrid({
  reference,
  events,
  onPickMonth,
}: {
  reference: Date
  events: CalendarEvent[]
  onPickMonth: (month: number) => void
}) {
  const year = reference.getFullYear()
  const counts = Array.from({ length: 12 }, () => 0)
  for (const ev of events) {
    const d = parseEventDate(ev.dtstart)
    if (d.getFullYear() === year) counts[d.getMonth()]++
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {counts.map((count, month) => (
        <button
          key={month}
          type="button"
          onClick={() => onPickMonth(month)}
          className={cn(
            'rounded-lg border border-border bg-panel p-4 text-left hover:border-primary/40 transition-colors',
          )}
        >
          <p className="text-sm font-medium">
            {new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long' })}
          </p>
          <p className="mt-1 text-xs text-muted">
            {count === 0 ? 'No events' : `${count} event${count === 1 ? '' : 's'}`}
          </p>
        </button>
      ))}
    </div>
  )
}

export function EventRow({
  ev,
  onDelete,
  onSelect,
}: {
  ev: CalendarEvent
  onDelete?: (uid: string) => void
  onSelect?: (event: CalendarEvent) => void
}) {
  const color = eventColor(ev)
  return (
    <li
      className="flex items-start justify-between gap-3 rounded-lg border border-border bg-panel p-3"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect?.(ev)}>
        <p className="font-medium">{ev.summary || 'Untitled'}</p>
        <p className="text-xs text-muted">
          {formatEventTime(ev.dtstart, ev.all_day)}
          {ev.location ? ` · ${ev.location}` : ''}
          {ev.calendar ? ` · ${ev.calendar}` : ''}
        </p>
        {ev.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{ev.description}</p>
        ) : null}
      </button>
      {onDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-destructive"
          onClick={() => onDelete(ev.series_uid ?? ev.uid)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </li>
  )
}
