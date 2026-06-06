import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import * as calendarApi from '@/api/calendar'
import { getRangeForView, type CalendarViewMode } from '@/lib/workspace/dateHelpers'

export function calendarRangeKey(reference: Date, view: CalendarViewMode) {
  const { start, end } = getRangeForView(reference, view)
  return ['calendar', 'events', view, start, end] as const
}

export function useCalendarEventsForView(reference: Date, view: CalendarViewMode, calendar = '') {
  const { start, end } = getRangeForView(reference, view)
  return useQuery({
    queryKey: [...calendarRangeKey(reference, view), calendar],
    queryFn: () => calendarApi.fetchEvents(start, end, calendar),
  })
}

/** Background CalDAV sync once per page load (mirrors static/js/calendar.js). */
export function useCalendarAutoSync() {
  const qc = useQueryClient()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    void calendarApi
      .syncCaldav()
      .then((data) => {
        const changed =
          (data.calendars ?? 0) > 0 &&
          ((data.events ?? 0) > 0 || (data.deleted ?? 0) > 0)
        if (changed) void qc.invalidateQueries({ queryKey: ['calendar'] })
      })
      .catch(() => {})
  }, [qc])
}

export function useCalendarSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => calendarApi.syncCaldav(),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['calendar'] })
      const events = data.events ?? 0
      const deleted = data.deleted ?? 0
      if (events > 0 || deleted > 0) {
        toast.success(`Synced: ${events} events${deleted ? `, ${deleted} removed` : ''}`)
      } else {
        toast.success('Calendar up to date')
      }
    },
    onError: () => toast.error('CalDAV sync failed'),
  })
}

export function useIcsImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, calendarName }: { file: File; calendarName?: string }) =>
      calendarApi.importIcs(file, calendarName),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['calendar'] })
      toast.success(`Imported ${data.imported} events into ${data.calendar}`)
    },
    onError: () => toast.error('ICS import failed'),
  })
}
