/** Shared with legacy v1 (`static/app.js` UI_VIS_KEY). */
export const UI_VISIBILITY_KEY = 'odysseus-ui-visibility'

/** Legacy keys default hidden on first run. */
export const UI_VIS_DEFAULT_OFF = new Set(['models-section', 'rag-toggle-btn', 'text-emojis'])

/** v2 sidebar nav item → legacy visibility key (when applicable). */
export const NAV_VISIBILITY_KEYS: Record<string, string> = {
  '/chat': 'nav-chat',
  '/group-chat': 'nav-group-chat',
  '/agents': 'nav-agents',
  '/notes': 'tool-notes',
  '/calendar': 'tool-calendar',
  '/tasks': 'tool-tasks',
  '/memory': 'tool-memory',
  '/cookbook': 'tool-cookbook',
  '/compare': 'tool-compare',
  '/research': 'tool-research',
  '/email': 'email-section',
  '/gallery': 'tool-gallery',
  '/library': 'tool-library',
}

export type UiVisibilityState = Record<string, boolean>

export function loadUiVisibility(): UiVisibilityState {
  try {
    const raw = localStorage.getItem(UI_VISIBILITY_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as UiVisibilityState) : {}
  } catch {
    return {}
  }
}

export function saveUiVisibility(state: UiVisibilityState): void {
  localStorage.setItem(UI_VISIBILITY_KEY, JSON.stringify(state))
}

export function isNavVisible(path: string, state?: UiVisibilityState): boolean {
  const key = NAV_VISIBILITY_KEYS[path]
  if (!key) return true
  const s = state ?? loadUiVisibility()
  if (key in s) return s[key] !== false
  return !UI_VIS_DEFAULT_OFF.has(key)
}

export const NAV_VISIBILITY_LABELS: { path: string; label: string }[] = [
  { path: '/chat', label: 'Chat' },
  { path: '/group-chat', label: 'Group chat' },
  { path: '/agents', label: 'Agents' },
  { path: '/notes', label: 'Notes' },
  { path: '/calendar', label: 'Calendar' },
  { path: '/tasks', label: 'Tasks' },
  { path: '/memory', label: 'Memory' },
  { path: '/cookbook', label: 'Cookbook' },
  { path: '/compare', label: 'Compare' },
  { path: '/research', label: 'Research' },
  { path: '/email', label: 'Email' },
  { path: '/gallery', label: 'Gallery' },
  { path: '/library', label: 'Documents' },
]
