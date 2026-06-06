import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTask } from '@/api/tasks'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const DAYS = [
  { k: 'MO', l: 'Mon', idx: 0 },
  { k: 'TU', l: 'Tue', idx: 1 },
  { k: 'WE', l: 'Wed', idx: 2 },
  { k: 'TH', l: 'Thu', idx: 3 },
  { k: 'FR', l: 'Fri', idx: 4 },
  { k: 'SA', l: 'Sat', idx: 5 },
  { k: 'SU', l: 'Sun', idx: 6 },
] as const

const WEEKDAYS = new Set(['MO', 'TU', 'WE', 'TH', 'FR'])

function localHHMMToUtc(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export interface ScheduleServeConfig {
  title: string
  repo_id: string
  host?: string
}

interface CookbookSchedulePanelProps {
  config: ScheduleServeConfig
  onClose: () => void
  className?: string
}

export function CookbookSchedulePanel({ config, onClose, className }: CookbookSchedulePanelProps) {
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [days, setDays] = useState<Set<string>>(new Set(WEEKDAYS))
  const [mirrorCalendar, setMirrorCalendar] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleDay(key: string) {
    setDays((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSave() {
    setError('')
    if (!/^\d\d:\d\d$/.test(startTime) || !/^\d\d:\d\d$/.test(endTime)) {
      setError('Start and end must be HH:MM')
      return
    }
    const dayList = [...days]
    if (!dayList.length) {
      setError('Pick at least one day')
      return
    }

    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    let dur = eh * 60 + em - (sh * 60 + sm)
    if (dur <= 0) dur += 24 * 60

    const startUtc = localHHMMToUtc(startTime)
    const [shUtc, smUtc] = startUtc.split(':').map(Number)
    const allDays = dayList.length === 7
    const weekdaysOnly =
      dayList.length === 5 && ['MO', 'TU', 'WE', 'TH', 'FR'].every((d) => dayList.includes(d))

    const sched: Record<string, string | number> = {}
    if (allDays) {
      sched.schedule = 'daily'
      sched.scheduled_time = startUtc
    } else if (weekdaysOnly) {
      sched.schedule = 'cron'
      sched.cron_expression = `${smUtc} ${shUtc} * * 1-5`
    } else if (dayList.length === 1) {
      const dayIdx = DAYS.find((d) => d.k === dayList[0])!.idx
      sched.schedule = 'weekly'
      sched.scheduled_time = startUtc
      sched.scheduled_day = dayIdx
    } else {
      const dayNum = dayList.map((k) => {
        const i = DAYS.find((d) => d.k === k)!.idx
        return i === 6 ? 0 : i + 1
      })
      sched.schedule = 'cron'
      sched.cron_expression = `${smUtc} ${shUtc} * * ${dayNum.join(',')}`
    }

    const fullName = (config.title || config.repo_id || '').trim() || 'model'
    setSaving(true)
    try {
      const task = await createTask({
        name: `Serve: ${fullName}`,
        task_type: 'action',
        action: 'cookbook_serve',
        trigger_type: 'schedule',
        prompt: JSON.stringify({
          preset: fullName,
          repo_id: config.repo_id || '',
          host: config.host || '',
          end_after_min: dur,
        }),
        ...sched,
      })

      if (mirrorCalendar) {
        try {
          const calsRes = await fetch('/api/calendar/calendars', { credentials: 'same-origin' })
          const calsBody = calsRes.ok ? await calsRes.json() : {}
          let cookbookCal = (calsBody.calendars || []).find(
            (c: { name?: string }) => (c.name || '').toLowerCase() === 'cookbook',
          )
          if (!cookbookCal) {
            const mk = await fetch('/api/calendar/calendars?name=Cookbook&color=%233b82f6', {
              method: 'POST',
              credentials: 'same-origin',
            })
            if (mk.ok) {
              const mkData = await mk.json()
              cookbookCal = { href: mkData.id, name: mkData.name, color: mkData.color }
            }
          }
          const evBody = {
            summary: `Serve: ${fullName}`,
            dtstart: new Date().toISOString(),
            dtend: new Date(Date.now() + dur * 60 * 1000).toISOString(),
            all_day: false,
            description: `Auto-mirrored from Cookbook schedule task ${task.id || ''}.\ncookbook_task_id: ${task.id || ''}`,
            rrule: weekdaysOnly
              ? 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
              : sched.schedule === 'weekly'
                ? `FREQ=WEEKLY;BYDAY=${dayList.join(',')}`
                : sched.schedule === 'daily'
                  ? 'FREQ=DAILY'
                  : 'FREQ=WEEKLY',
            color: '#3b82f6',
            calendar_href: cookbookCal?.href,
          }
          await fetch('/api/calendar/events', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(evBody),
          })
        } catch {
          /* best-effort */
        }
      }

      onClose()
      toast.success(`Created task: Serve: ${fullName}. Open Tasks to view.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      toast.error('Schedule save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn('rounded-md border border-border bg-muted/20 p-3 space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calendar className="h-4 w-4" />
        Schedule serve: {config.title}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Until</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {DAYS.map((d) => (
          <button
            key={d.k}
            type="button"
            className={cn(
              'rounded-full border px-2 py-0.5 text-xs',
              days.has(d.k) ? 'border-primary bg-primary/10' : 'border-border text-muted-foreground',
            )}
            onClick={() => toggleDay(d.k)}
          >
            {d.l}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={mirrorCalendar}
          onChange={(e) => setMirrorCalendar(e.target.checked)}
        />
        Create event in calendar
      </label>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save schedule'}
        </Button>
      </div>
    </div>
  )
}
