/** Per-route document title + favicon shapes (ported from static/js/theme.js). */

export type RouteMeta = {
  title: string
  /** Inner SVG markup; `__C__` is replaced with accent color. */
  faviconShape?: string
}

const APP_SUFFIX = ' · Odysseus'

const FAVICON_SHAPES: Record<string, string> = {
  '/calendar':
    "<rect x='4' y='6' width='24' height='22' rx='2' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<line x1='4' y1='12' x2='28' y2='12' stroke='__C__' stroke-width='2.5'/>" +
    "<line x1='10' y1='3' x2='10' y2='9' stroke='__C__' stroke-width='2.5' stroke-linecap='round'/>" +
    "<line x1='22' y1='3' x2='22' y2='9' stroke='__C__' stroke-width='2.5' stroke-linecap='round'/>",
  '/notes':
    "<rect x='6' y='4' width='20' height='24' rx='2' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<line x1='10' y1='10' x2='22' y2='10' stroke='__C__' stroke-width='2'/>" +
    "<line x1='10' y1='15' x2='22' y2='15' stroke='__C__' stroke-width='2'/>" +
    "<line x1='10' y1='20' x2='18' y2='20' stroke='__C__' stroke-width='2'/>",
  '/cookbook':
    "<path d='M5 8 L5 26 A2 2 0 0 0 7 28 L25 28 A2 2 0 0 0 27 26 L27 8' fill='none' stroke='__C__' stroke-width='2.5' stroke-linejoin='round'/>" +
    "<path d='M9 4 L23 4 L23 8 L9 8 Z' fill='none' stroke='__C__' stroke-width='2.5' stroke-linejoin='round'/>" +
    "<line x1='11' y1='14' x2='21' y2='14' stroke='__C__' stroke-width='2'/>" +
    "<line x1='11' y1='19' x2='17' y2='19' stroke='__C__' stroke-width='2'/>",
  '/email':
    "<rect x='4' y='7' width='24' height='18' rx='2' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<path d='M5 9 L16 17 L27 9' fill='none' stroke='__C__' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/>",
  '/memory':
    "<path d='M16 5 C10 5 6 9 6 14 C6 19 10 21 11 22 L11 26 L21 26 L21 22 C22 21 26 19 26 14 C26 9 22 5 16 5 Z' fill='none' stroke='__C__' stroke-width='2.5' stroke-linejoin='round'/>" +
    "<line x1='12' y1='28' x2='20' y2='28' stroke='__C__' stroke-width='2'/>",
  '/gallery':
    "<rect x='4' y='4' width='24' height='24' rx='2' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<circle cx='12' cy='12' r='2.5' fill='__C__'/>" +
    "<path d='M4 22 L11 16 L18 21 L23 17 L28 22' fill='none' stroke='__C__' stroke-width='2.5' stroke-linejoin='round'/>",
  '/tasks':
    "<rect x='4' y='4' width='24' height='24' rx='3' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<path d='M9 16 L14 21 L23 11' fill='none' stroke='__C__' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/>",
  '/library':
    "<rect x='5' y='5' width='5' height='22' rx='1' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<rect x='13' y='5' width='5' height='22' rx='1' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<rect x='21' y='8' width='6' height='19' rx='1' fill='none' stroke='__C__' stroke-width='2.5' transform='rotate(8 24 17)'/>",
  '/compare':
    "<rect x='4' y='6' width='10' height='20' rx='1.5' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<rect x='18' y='6' width='10' height='20' rx='1.5' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<path d='M14 11 L18 16 L14 21' fill='none' stroke='__C__' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/>",
  '/research':
    "<circle cx='14' cy='14' r='8' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<line x1='20' y1='20' x2='27' y2='27' stroke='__C__' stroke-width='2.5' stroke-linecap='round'/>",
  '/agents':
    "<rect x='6' y='8' width='20' height='16' rx='3' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<circle cx='12' cy='15' r='2' fill='__C__'/>" +
    "<circle cx='20' cy='15' r='2' fill='__C__'/>" +
    "<line x1='10' y1='4' x2='10' y2='8' stroke='__C__' stroke-width='2.5' stroke-linecap='round'/>" +
    "<line x1='22' y1='4' x2='22' y2='8' stroke='__C__' stroke-width='2.5' stroke-linecap='round'/>",
  '/group-chat':
    "<circle cx='11' cy='13' r='4' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<circle cx='21' cy='13' r='4' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<path d='M7 22 C7 18 9 17 11 17 C13 17 14 18 16 18 C18 18 19 17 21 17 C23 17 25 18 25 22' fill='none' stroke='__C__' stroke-width='2.5' stroke-linecap='round'/>",
  '/settings':
    "<circle cx='16' cy='16' r='5' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<path d='M16 4 L16 7 M16 25 L16 28 M4 16 L7 16 M25 16 L28 16 M7.5 7.5 L9.5 9.5 M22.5 22.5 L24.5 24.5 M7.5 24.5 L9.5 22.5 M22.5 9.5 L24.5 7.5' stroke='__C__' stroke-width='2.5' stroke-linecap='round'/>",
  '/backgrounds':
    "<rect x='4' y='8' width='24' height='16' rx='2' fill='none' stroke='__C__' stroke-width='2.5'/>" +
    "<circle cx='11' cy='14' r='2.5' fill='__C__'/>" +
    "<path d='M4 20 L12 14 L18 18 L28 12' fill='none' stroke='__C__' stroke-width='2.5' stroke-linejoin='round'/>",
}

const ROUTE_TITLES: Record<string, string> = {
  '/chat': 'Chat',
  '/group-chat': 'Group chat',
  '/agents': 'Agents',
  '/notes': 'Notes',
  '/calendar': 'Calendar',
  '/tasks': 'Tasks',
  '/library': 'Documents',
  '/memory': 'Memory',
  '/compare': 'Compare',
  '/research': 'Research',
  '/cookbook': 'Cookbook',
  '/email': 'Email',
  '/gallery': 'Gallery',
  '/settings': 'Settings',
  '/backgrounds': 'Backgrounds',
  '/login': 'Sign in',
}

const DEFAULT_BOAT_FAVICON =
  "<path d='M16 4L16 22L6 22Z' fill='__C__'/>" +
  "<path d='M16 8L16 22L24 22Z' fill='__C__' opacity='0.6'/>" +
  "<path d='M4 24Q10 20 16 24Q22 28 28 24' stroke='__C__' stroke-width='2.5' fill='none' stroke-linecap='round'/>"

export function normalizeRoutePath(pathname: string): string {
  const base = (pathname.split('?')[0] ?? pathname).toLowerCase()
  if (base.startsWith('/chat/')) return '/chat'
  return base
}

export function resolveRouteMeta(pathname: string): RouteMeta {
  const path = normalizeRoutePath(pathname)
  const label = ROUTE_TITLES[path]
  const title = label ? `${label}${APP_SUFFIX}` : 'Odysseus'
  const faviconShape = FAVICON_SHAPES[path]
  return { title, faviconShape }
}

export function routeDocumentTitle(pathname: string): string {
  return resolveRouteMeta(pathname).title
}

function faviconSvg(accent: string, shape?: string): string {
  const inner = (shape ?? DEFAULT_BOAT_FAVICON).split('__C__').join(accent)
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>${inner}</svg>`
}

function ensureLink(rel: string, type?: string): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>(`link[rel='${rel}']`)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    if (type) link.type = type
    document.head.appendChild(link)
  }
  return link
}

export function applyRouteFavicon(pathname: string, accent = '#e06c75'): void {
  const { faviconShape } = resolveRouteMeta(pathname)
  const href = `data:image/svg+xml,${encodeURIComponent(faviconSvg(accent, faviconShape))}`
  const icon = ensureLink('icon', 'image/svg+xml')
  icon.href = href
  const apple = ensureLink('apple-touch-icon')
  apple.href = href
}

export function applyRouteMeta(pathname: string, accent = '#e06c75'): void {
  document.title = routeDocumentTitle(pathname)
  applyRouteFavicon(pathname, accent)
}
