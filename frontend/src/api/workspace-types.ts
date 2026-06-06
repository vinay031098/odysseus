/** Workspace API types (notes, tasks, calendar, memory) */

export interface Note {
  id: string
  owner?: string
  title: string
  content?: string | null
  items?: NoteChecklistItem[] | null
  note_type: string
  color?: string | null
  label?: string | null
  pinned: boolean
  archived: boolean
  due_date?: string | null
  repeat?: string | null
  source?: string
  session_id?: string | null
  sort_order?: number
  created_at?: string | null
  updated_at?: string | null
}

export interface NoteChecklistItem {
  text: string
  checked?: boolean
  done?: boolean
}

export interface NotesListResponse {
  notes: Note[]
}

export interface NoteCreatePayload {
  title?: string
  content?: string
  note_type?: string
  label?: string
  pinned?: boolean
}

export interface NoteUpdatePayload {
  title?: string
  content?: string
  pinned?: boolean
  archived?: boolean
  due_date?: string | null
  repeat?: string | null
  note_type?: string
  label?: string | null
  items?: NoteChecklistItem[] | null
}

export interface NoteFireReminderPayload {
  note_id: string
  title: string
  body: string
}

export interface ScheduledTask {
  id: string
  name: string
  prompt?: string | null
  task_type: string
  action?: string | null
  schedule?: string | null
  scheduled_time?: string | null
  scheduled_day?: number | null
  scheduled_date?: string | null
  cron_expression?: string | null
  trigger_type?: string
  trigger_event?: string | null
  trigger_count?: number | null
  webhook_token?: string | null
  next_run?: string | null
  last_run?: string | null
  status: string
  output_target?: string
  model?: string | null
  is_builtin?: boolean
  is_modified?: boolean
  run_count?: number
  created_at?: string | null
}

export interface TaskRun {
  id: string
  task_id: string
  started_at?: string | null
  finished_at?: string | null
  status: string
  result?: string | null
  error?: string | null
  tokens_used?: number | null
  model?: string | null
}

export interface TaskRunsResponse {
  runs: TaskRun[]
  total: number
}

export interface TasksListResponse {
  tasks: ScheduledTask[]
}

export interface TaskCreatePayload {
  name: string
  prompt?: string
  task_type?: string
  action?: string
  schedule?: string
  scheduled_time?: string
  trigger_type?: string
  trigger_event?: string
  trigger_count?: number
}

export interface TaskMetaEvent {
  name: string
  description: string
}

export interface TaskMetaAction {
  name: string
  description: string
}

export interface EventUpdatePayload {
  summary?: string
  dtstart?: string
  dtend?: string
  all_day?: boolean
  description?: string
  location?: string
  color?: string
  rrule?: string
}

export interface CalendarInfo {
  name: string
  href: string
  color?: string
  source?: string
}

export interface CalendarEvent {
  uid: string
  summary: string
  dtstart: string
  dtend: string
  all_day?: boolean
  description?: string
  location?: string
  calendar?: string
  calendar_href?: string
  color?: string
  is_recurrence?: boolean
  series_uid?: string
}

export interface CalendarsResponse {
  calendars: CalendarInfo[]
}

export interface CalendarEventsResponse {
  events: CalendarEvent[]
  truncated?: boolean
}

export interface EventCreatePayload {
  summary: string
  dtstart: string
  dtend?: string
  all_day?: boolean
  description?: string
  location?: string
  calendar_href?: string
  color?: string
}

export interface CaldavSyncResponse {
  ok?: boolean
  calendars?: number
  events?: number
  deleted?: number
  errors?: string[]
}

export interface IcsImportResponse {
  ok: boolean
  imported: number
  skipped: number
  calendar: string
}

export interface MemoryAuditResponse {
  ok: boolean
  before: number
  after: number
  removed: number
  already_tidy?: boolean
}

export interface MemoryImportResponse {
  suggestions: Array<string | { text: string; category?: string }>
  filename?: string
}

export interface MemoryEntry {
  id: string
  text: string
  timestamp?: number
  source?: string
  category?: string
  session_id?: string
  pinned?: boolean
  owner?: string
}

export interface MemoryListResponse {
  memory: MemoryEntry[]
}

export interface MemorySearchResponse {
  memories: MemoryEntry[]
  total: number
  query: string
}
