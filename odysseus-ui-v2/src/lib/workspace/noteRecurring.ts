/** Recurring reminder helpers (mirrors static/js/notes.js) */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export type RepeatValue = string

export function normalizeRepeat(repeat: string, originalDate: Date): RepeatValue {
  if (!repeat || repeat === 'none') return 'none'
  if (repeat === 'daily' || repeat === 'yearly') return repeat
  if (/^(weekly|monthly):/.test(repeat)) return repeat
  const wd = originalDate.getDay()
  const n = Math.ceil(originalDate.getDate() / 7)
  if (repeat === 'weekly') return `weekly:${wd}`
  if (repeat === 'monthly') return `monthly:day:${originalDate.getDate()}`
  if (repeat === 'monthly_nth_weekday') return `monthly:nth:${n}:${wd}`
  if (repeat === 'monthly_last_weekday') return `monthly:last:${wd}`
  return repeat
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  let count = 0
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, month, d)
    if (dt.getMonth() !== month) break
    if (dt.getDay() === weekday) {
      count++
      if (count === n) return dt
    }
  }
  return new Date(year, month, 1)
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const lastDay = new Date(year, month + 1, 0)
  for (let d = lastDay.getDate(); d >= 1; d--) {
    const dt = new Date(year, month, d)
    if (dt.getDay() === weekday) return dt
  }
  return lastDay
}

function toLocalDatetimeStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function advanceRecurring(dateStr: string, repeat: string): string | null {
  const orig = new Date(dateStr)
  if (Number.isNaN(orig.getTime())) return null
  const hh = orig.getHours()
  const mm = orig.getMinutes()
  let d: Date | null = new Date(orig)
  const norm = normalizeRepeat(repeat, orig)
  if (norm === 'none') return null

  const step = () => {
    if (!d) return
    if (norm === 'daily') {
      d.setDate(d.getDate() + 1)
      return
    }
    if (norm === 'yearly') {
      d.setFullYear(d.getFullYear() + 1)
      return
    }
    const parts = norm.split(':')
    const kind = parts[0]
    if (kind === 'weekly') {
      const targetWd = parseInt(parts[1], 10)
      let delta = (targetWd - d.getDay() + 7) % 7
      if (delta === 0) delta = 7
      d.setDate(d.getDate() + delta)
      d.setHours(hh, mm, 0, 0)
      return
    }
    if (kind === 'monthly') {
      const sub = parts[1]
      const ny = d.getFullYear() + (d.getMonth() === 11 ? 1 : 0)
      const nm = (d.getMonth() + 1) % 12
      let target: Date
      if (sub === 'day') {
        const wantDay = parseInt(parts[2], 10)
        const lastDay = new Date(ny, nm + 1, 0).getDate()
        target = new Date(ny, nm, Math.min(wantDay, lastDay))
      } else if (sub === 'nth') {
        target = nthWeekdayOfMonth(ny, nm, parseInt(parts[3], 10), parseInt(parts[2], 10))
      } else if (sub === 'last') {
        target = lastWeekdayOfMonth(ny, nm, parseInt(parts[2], 10))
      } else {
        d = null
        return
      }
      target.setHours(hh, mm, 0, 0)
      d = target
      return
    }
    d = null
  }

  step()
  if (!d) return null
  const now = Date.now()
  let guard = 5000
  while (d.getTime() <= now) {
    if (--guard <= 0) return null
    step()
    if (!d) return null
  }
  return toLocalDatetimeStr(d)
}

export function formatRepeatLabel(repeat: string, originalDate?: Date): string {
  if (!repeat || repeat === 'none') return ''
  const norm = normalizeRepeat(repeat, originalDate ?? new Date())
  if (norm === 'daily') return 'Daily'
  if (norm === 'yearly') return 'Yearly'
  const parts = norm.split(':')
  if (parts[0] === 'weekly') {
    const wd = parseInt(parts[1], 10)
    return Number.isNaN(wd) ? 'Weekly' : `Weekly on ${DAYS[wd]}s`
  }
  if (parts[0] === 'monthly') {
    if (parts[1] === 'day') return `Monthly on day ${parts[2]}`
    if (parts[1] === 'nth') {
      const ordinals = ['1st', '2nd', '3rd', '4th', '5th']
      const n = parseInt(parts[2], 10)
      const wd = parseInt(parts[3], 10)
      return `Monthly on ${ordinals[n - 1] ?? `${n}th`} ${DAYS[wd]}`
    }
    if (parts[1] === 'last') {
      const wd = parseInt(parts[2], 10)
      return `Monthly on last ${DAYS[wd]}`
    }
  }
  return norm
}

export const REPEAT_OPTIONS = [
  { value: 'none', label: "Doesn't repeat" },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly (same weekday)' },
  { value: 'monthly', label: 'Monthly (same day)' },
  { value: 'yearly', label: 'Yearly' },
] as const
