import { api } from './client'
import type {
  CalendarEvent,
  CalendarEventsResponse,
  CaldavSyncResponse,
  CalendarsResponse,
  EventCreatePayload,
  EventUpdatePayload,
  IcsImportResponse,
} from './workspace-types'

export async function fetchCalendars() {
  const data = await api.get<CalendarsResponse>('/api/calendar/calendars')
  return data.calendars ?? []
}

export async function fetchEvents(start: string, end: string, calendar = ''): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({ start, end })
  if (calendar) params.set('calendar', calendar)
  const data = await api.get<CalendarEventsResponse>(`/api/calendar/events?${params}`)
  return data.events ?? []
}

export async function createEvent(payload: EventCreatePayload): Promise<{ ok: boolean; uid: string }> {
  return api.post('/api/calendar/events', payload)
}

export async function updateEvent(uid: string, payload: EventUpdatePayload): Promise<void> {
  await api.put(`/api/calendar/events/${encodeURIComponent(uid)}`, payload)
}

export async function deleteEvent(uid: string): Promise<void> {
  await api.delete(`/api/calendar/events/${encodeURIComponent(uid)}`)
}

export async function syncCaldav(): Promise<CaldavSyncResponse> {
  return api.post<CaldavSyncResponse>('/api/calendar/sync')
}

export async function importIcs(file: File, calendarName = ''): Promise<IcsImportResponse> {
  const form = new FormData()
  form.set('file', file)
  if (calendarName.trim()) form.set('calendar_name', calendarName.trim())
  return api.postForm<IcsImportResponse>('/api/calendar/import', form)
}
