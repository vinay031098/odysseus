import { useEffect, useState } from 'react'
import type { CalendarEvent, EventCreatePayload, EventUpdatePayload } from '@/api/workspace-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { splitDueDate, toDueDateIso } from '@/lib/workspace/noteReminders'
import { parseEventDate } from '@/lib/workspace/dateHelpers'

const EVENT_COLORS = ['#e06c75', '#61afef', '#98c379', '#e5c07b', '#c678dd', '#56b6c2']

const RRULE_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'FREQ=DAILY', label: 'Daily' },
  { value: 'FREQ=WEEKLY', label: 'Weekly' },
  { value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', label: 'Weekdays' },
  { value: 'FREQ=MONTHLY', label: 'Monthly' },
  { value: 'FREQ=YEARLY', label: 'Yearly' },
]

type CalendarEventFormProps = {
  event?: CalendarEvent | null
  defaultDate?: string
  calendarHref?: string
  onSave: (payload: EventCreatePayload | EventUpdatePayload, uid?: string) => void
  onDelete?: (uid: string) => void
  onCancel: () => void
  isSaving?: boolean
}

function eventToForm(ev: CalendarEvent) {
  const startSplit = splitDueDate(ev.dtstart)
  const endSplit = splitDueDate(ev.dtend || ev.dtstart)
  return {
    summary: ev.summary || '',
    date: startSplit.date,
    endDate: endSplit.date || startSplit.date,
    time: startSplit.time,
    endTime: endSplit.time,
    allDay: Boolean(ev.all_day),
    description: ev.description || '',
    location: ev.location || '',
    color: ev.color && !ev.color.startsWith('<') ? ev.color : EVENT_COLORS[0],
    rrule: '',
  }
}

export function CalendarEventForm({
  event,
  defaultDate,
  calendarHref,
  onSave,
  onDelete,
  onCancel,
  isSaving,
}: CalendarEventFormProps) {
  const isEdit = Boolean(event)
  const [summary, setSummary] = useState('')
  const [date, setDate] = useState(defaultDate ?? '')
  const [endDate, setEndDate] = useState(defaultDate ?? '')
  const [time, setTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [color, setColor] = useState(EVENT_COLORS[0])
  const [rrule, setRrule] = useState('')

  useEffect(() => {
    if (event) {
      const f = eventToForm(event)
      setSummary(f.summary)
      setDate(f.date)
      setEndDate(f.endDate)
      setTime(f.time)
      setEndTime(f.endTime)
      setAllDay(f.allDay)
      setDescription(f.description)
      setLocation(f.location)
      setColor(f.color)
    } else {
      const d = defaultDate ?? parseEventDate(new Date().toISOString()).toISOString().slice(0, 10)
      setDate(d)
      setEndDate(d)
      setSummary('')
      setDescription('')
      setLocation('')
      setAllDay(false)
    }
  }, [event, defaultDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!summary.trim() || !date) return
    const dtstart = allDay ? date : toDueDateIso(date, time)
    const dtend = allDay ? endDate || date : toDueDateIso(endDate || date, endTime)
    const payload = {
      summary: summary.trim(),
      dtstart,
      dtend,
      all_day: allDay,
      description: description.trim(),
      location: location.trim(),
      color,
      rrule: rrule || undefined,
      ...(calendarHref && !isEdit ? { calendar_href: calendarHref } : {}),
    }
    onSave(payload, event?.series_uid ?? event?.uid)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-panel p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold">{isEdit ? 'Edit event' : 'New event'}</h3>
      <div className="space-y-2">
        <Label htmlFor="cal-ev-summary">Title</Label>
        <Input
          id="cal-ev-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Meeting"
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
        All day
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cal-ev-date">Start date</Label>
          <Input id="cal-ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cal-ev-end-date">End date</Label>
          <Input id="cal-ev-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        {!allDay ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="cal-ev-time">Start time</Label>
              <Input id="cal-ev-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cal-ev-end-time">End time</Label>
              <Input id="cal-ev-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="cal-ev-loc">Location</Label>
        <Input id="cal-ev-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cal-ev-desc">Description</Label>
        <textarea
          id="cal-ev-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cal-ev-rrule">Repeat</Label>
        <select
          id="cal-ev-rrule"
          value={rrule}
          onChange={(e) => setRrule(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          {RRULE_OPTIONS.map((o) => (
            <option key={o.value || 'none'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex gap-2">
          {EVENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              className="h-6 w-6 rounded-full border-2"
              style={{
                backgroundColor: c,
                borderColor: color === c ? 'var(--color-foreground)' : 'transparent',
              }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {isEdit && onDelete && event ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onDelete(event.series_uid ?? event.uid)}
          >
            Delete
          </Button>
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSaving || !summary.trim()}>
          {isEdit ? 'Save' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
