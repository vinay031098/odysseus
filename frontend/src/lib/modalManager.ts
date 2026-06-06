/**
 * Minimal route-aware window toggle (legacy modalManager deferred).
 * Tracks the last non-settings tool route and can bounce between chat and tools.
 */

const TOOL_PREFIXES = [
  '/notes',
  '/calendar',
  '/tasks',
  '/memory',
  '/cookbook',
  '/compare',
  '/research',
  '/email',
  '/gallery',
  '/library',
  '/agents',
  '/group-chat',
  '/backgrounds',
] as const

let lastToolRoute = '/chat'

function isToolPath(pathname: string): boolean {
  return TOOL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Remember the active tool route for reopen-after-toggle. */
export function noteAppRoute(pathname: string): void {
  if (pathname.startsWith('/settings')) return
  if (pathname.startsWith('/chat') || isToolPath(pathname)) {
    lastToolRoute = pathname
  }
}

export function getLastToolRoute(): string {
  return lastToolRoute
}

/**
 * Close the current tool view (navigate to chat) or reopen the last one.
 * Full modal minimize/restore is deferred — this covers SPA route toggling only.
 */
export function toggleAppWindow(pathname: string, navigate: (path: string) => void): void {
  if (pathname.startsWith('/settings')) {
    navigate(lastToolRoute || '/chat')
    return
  }
  if (isToolPath(pathname)) {
    navigate('/chat')
    return
  }
  if (pathname.startsWith('/chat')) {
    navigate(lastToolRoute === pathname ? '/settings' : lastToolRoute || '/settings')
    return
  }
  navigate('/settings')
}
