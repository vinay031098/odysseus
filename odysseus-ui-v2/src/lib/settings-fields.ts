export const SEARCH_PROVIDERS = [
  'searxng',
  'duckduckgo',
  'brave',
  'google_pse',
  'tavily',
  'serper',
  'disabled',
] as const

export const REMINDER_CHANNELS = ['browser', 'email', 'ntfy', 'webhook'] as const

export const DEFAULT_KEYBINDS: Record<string, string> = {
  search: 'ctrl+k',
  toggle_sidebar: 'ctrl+b',
  new_session: 'ctrl+alt+n',
  star_session: 'ctrl+alt+f',
  delete_session: 'ctrl+alt+d',
  admin_panel: 'ctrl+shift+u',
  cancel: 'escape',
  tts: 'alt+shift+t',
  incognito: 'ctrl+alt+i',
  settings: 'ctrl+,',
  focus_input: 'ctrl+/',
  // Open-tool shortcuts (calendar bound by default; rest unbound).
  open_calendar: 'ctrl+alt+c',
  open_compare: '',
  open_cookbook: '',
  open_research: '',
  open_gallery: '',
  open_library: '',
  open_memory: '',
  open_notes: '',
  open_tasks: '',
  open_theme: '',
}

/** Map open_* keybind actions to SPA routes. */
export const OPEN_TOOL_ROUTES: Record<string, string> = {
  open_calendar: '/calendar',
  open_compare: '/compare',
  open_cookbook: '/cookbook',
  open_research: '/research',
  open_gallery: '/gallery',
  open_library: '/library',
  open_memory: '/memory',
  open_notes: '/notes',
  open_tasks: '/tasks',
  open_theme: '/backgrounds',
}

export function normalizeKeybind(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

export function parseExtraRoots(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((r) => String(r).trim()).filter(Boolean)
}

export function formatExtraRoots(roots: string[]): string {
  return roots.join('\n')
}
