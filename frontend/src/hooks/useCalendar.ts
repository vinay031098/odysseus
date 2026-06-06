import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as calendarApi from '@/api/calendar'
import type { EventCreatePayload, EventUpdatePayload } from '@/api/workspace-types'
import { calendarRangeKey } from '@/hooks/useCalendarViews'
import { getMonthRange, type CalendarViewMode } from '@/lib/workspace/dateHelpers'

export function calendarEventsKey(month: Date) {
  const { start, end } = getMonthRange(month)
  return ['calendar', 'events', 'month', start, end] as const
}

export function useCalendarEvents(month: Date) {
  const { start, end } = getMonthRange(month)
  return useQuery({
    queryKey: calendarEventsKey(month),
    queryFn: () => calendarApi.fetchEvents(start, end),
  })
}

export function useCalendars() {
  return useQuery({
    queryKey: ['calendar', 'calendars'],
    queryFn: () => calendarApi.fetchCalendars(),
  })
}

export function useCalendarMutations(
  reference: Date,
  view: CalendarViewMode,
  calendar = '',
) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['calendar'] })
    void qc.invalidateQueries({ queryKey: calendarRangeKey(reference, view) })
  }

  const create = useMutation({
    mutationFn: (payload: EventCreatePayload) => calendarApi.createEvent(payload),
    onSuccess: () => {
      invalidate()
      toast.success('Event created')
    },
    onError: () => toast.error('Could not create event'),
  })

  const update = useMutation({
    mutationFn: ({ uid, payload }: { uid: string; payload: EventUpdatePayload }) =>
      calendarApi.updateEvent(uid, payload),
    onSuccess: () => {
      invalidate()
      toast.success('Event updated')
    },
    onError: () => toast.error('Could not update event'),
  })

  const remove = useMutation({
    mutationFn: (uid: string) => calendarApi.deleteEvent(uid),
    onSuccess: () => {
      invalidate()
      toast.success('Event deleted')
    },
    onError: () => toast.error('Could not delete event'),
  })

  void calendar

  return { create, update, remove }
}
