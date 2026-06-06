import { cn } from '@/lib/utils'

const ICONS: Record<string, string> = {
  markdown:
    '<rect x="2" y="5" width="20" height="14" rx="2"/>' +
    '<polyline points="6 15 6 9 9 12 12 9 12 15"/>' +
    '<polyline points="16 9 16 15 13 12"/>' +
    '<polyline points="16 15 19 12 16 9"/>',
  csv:
    '<rect x="3" y="4" width="18" height="16" rx="1.5"/>' +
    '<line x1="3" y1="9" x2="21" y2="9"/>' +
    '<line x1="3" y1="14" x2="21" y2="14"/>' +
    '<line x1="9" y1="4" x2="9" y2="20"/>' +
    '<line x1="15" y1="4" x2="15" y2="20"/>',
  python:
    '<path d="M12 2c-3 0-5 1-5 4v3h6v1H4c-1.5 0-3 1-3 4s1.5 4 3 4h3v-3c0-2 2-3 4-3h5c2 0 4-1 4-3V6c0-3-2-4-5-4z"/>' +
    '<circle cx="9" cy="5" r="1" fill="currentColor"/>' +
    '<circle cx="15" cy="19" r="1" fill="currentColor"/>',
  html:
    '<polyline points="8 5 2 12 8 19"/>' +
    '<polyline points="16 5 22 12 16 19"/>' +
    '<line x1="14" y1="3" x2="10" y2="21"/>',
  json:
    '<path d="M9 3c-3 0-3 4-3 6 0 3-3 3-3 3s3 0 3 3 0 6 3 6"/>' +
    '<path d="M15 3c3 0 3 4 3 6 0 3 3 3 3 3s-3 0-3 3 0 6-3 6"/>',
  javascript:
    '<rect x="2" y="2" width="20" height="20" rx="2.5"/>' +
    '<path d="M11 11v6c0 1.5-1 2.2-2.3 2.2S6.5 18.5 6.5 17"/>' +
    '<path d="M14 17.5c0 1.2 1.2 1.7 2.5 1.7s2.5-.6 2.5-1.7c0-2.5-5-2.2-5-4.5 0-1.2 1-1.7 2.3-1.7s2.2.6 2.2 1.7"/>',
  typescript:
    '<rect x="2" y="2" width="20" height="20" rx="2.5"/>' +
    '<polyline points="6 11 13 11 9.5 11 9.5 19"/>' +
    '<path d="M14 17.5c0 1.2 1.2 1.7 2.5 1.7s2.5-.6 2.5-1.7c0-2.5-5-2.2-5-4.5 0-1.2 1-1.7 2.3-1.7s2.2.6 2.2 1.7"/>',
  yaml:
    '<circle cx="5" cy="6.5" r="1.2" fill="currentColor"/>' +
    '<line x1="8" y1="6.5" x2="21" y2="6.5"/>' +
    '<circle cx="8" cy="12" r="1.2" fill="currentColor"/>' +
    '<line x1="11" y1="12" x2="21" y2="12"/>' +
    '<circle cx="8" cy="17.5" r="1.2" fill="currentColor"/>' +
    '<line x1="11" y1="17.5" x2="19" y2="17.5"/>',
  css:
    '<line x1="9" y1="3" x2="7" y2="21"/>' +
    '<line x1="17" y1="3" x2="15" y2="21"/>' +
    '<line x1="3" y1="9" x2="21" y2="9"/>' +
    '<line x1="3" y1="15" x2="21" y2="15"/>',
  bash:
    '<rect x="2" y="4" width="20" height="16" rx="1.5"/>' +
    '<polyline points="6 10 9 13 6 16"/>' +
    '<line x1="12" y1="16" x2="18" y2="16"/>',
  sh:
    '<rect x="2" y="4" width="20" height="16" rx="1.5"/>' +
    '<polyline points="6 10 9 13 6 16"/>' +
    '<line x1="12" y1="16" x2="18" y2="16"/>',
  sql:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/>' +
    '<path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5"/>' +
    '<path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6"/>' +
    '<path d="M3 17v2c0 1.7 4 3 9 3s9-1.3 9-3v-2"/>',
  pdf:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
    '<polyline points="14 2 14 8 20 8"/>' +
    '<path d="M7 14h1.5a1.2 1.2 0 0 1 0 2.4H7"/>' +
    '<path d="M11 14h1.3a1.4 1.4 0 0 1 1.4 1.4v.6a1.4 1.4 0 0 1-1.4 1.4H11z"/>' +
    '<line x1="15.5" y1="14" x2="17.5" y2="14"/>' +
    '<line x1="15.5" y1="15.7" x2="17" y2="15.7"/>' +
    '<line x1="15.5" y1="14" x2="15.5" y2="17.5"/>',
  email:
    '<rect x="2" y="4" width="20" height="16" rx="2"/>' +
    '<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  xml:
    '<polyline points="8 5 2 12 8 19"/>' +
    '<polyline points="16 5 22 12 16 19"/>' +
    '<line x1="14" y1="3" x2="10" y2="21"/>',
  svg:
    '<circle cx="7" cy="7" r="4"/>' +
    '<rect x="13" y="13" width="8" height="8"/>' +
    '<polygon points="13 3 21 3 17 11"/>',
  rust:
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.93 4.93l2.12 2.12 M16.95 16.95l2.12 2.12 M4.93 19.07l2.12-2.12 M16.95 7.05l2.12-2.12"/>' +
    '<circle cx="12" cy="12" r="8"/>',
  go:
    '<circle cx="12" cy="12" r="9"/>' +
    '<circle cx="9" cy="10" r="1.4" fill="currentColor"/>' +
    '<circle cx="15" cy="10" r="1.4" fill="currentColor"/>' +
    '<path d="M9 15c.8 1.5 5.2 1.5 6 0"/>',
  java:
    '<path d="M6 11h11v6a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"/>' +
    '<path d="M17 12h1.5a2.5 2.5 0 0 1 0 5H17"/>' +
    '<path d="M9 4c0 1.2-1 1.8-1 3s1 1.8 1 3"/>' +
    '<path d="M13 4c0 1.2-1 1.8-1 3s1 1.8 1 3"/>',
  c: '<path d="M18 7a7 7 0 1 0 0 10"/>',
  cpp:
    '<path d="M10 7a5 5 0 1 0 0 10"/>' +
    '<line x1="15" y1="10" x2="15" y2="14"/>' +
    '<line x1="13" y1="12" x2="17" y2="12"/>' +
    '<line x1="20" y1="10" x2="20" y2="14"/>' +
    '<line x1="18" y1="12" x2="22" y2="12"/>',
  csharp:
    '<path d="M10 7a5 5 0 1 0 0 10"/>' +
    '<line x1="17" y1="7" x2="15" y2="17"/>' +
    '<line x1="22" y1="7" x2="20" y2="17"/>' +
    '<line x1="14" y1="11" x2="22.5" y2="11"/>' +
    '<line x1="13.5" y1="13" x2="22" y2="13"/>',
  ruby:
    '<polygon points="12 2 21 9 12 22 3 9"/>' +
    '<line x1="3" y1="9" x2="21" y2="9"/>' +
    '<line x1="8" y1="9" x2="12" y2="22"/>' +
    '<line x1="16" y1="9" x2="12" y2="22"/>' +
    '<line x1="8" y1="9" x2="12" y2="2"/>' +
    '<line x1="16" y1="9" x2="12" y2="2"/>',
  php:
    '<path d="M3 14c0-3 3-6 7-6h5c2.5 0 5 1.5 5 4v2c0 2-1.5 3.5-3.5 3.5H17"/>' +
    '<path d="M17 17v2 M7 17v3 M11 17v3"/>' +
    '<path d="M18 12c1 0 1.5-.7 1.5-1.5"/>' +
    '<circle cx="7" cy="11" r="0.6" fill="currentColor"/>',
  code:
    '<polyline points="8 6 2 12 8 18"/>' +
    '<polyline points="16 6 22 12 16 18"/>',
}

const ALIASES: Record<string, string> = {
  md: 'markdown',
  py: 'python',
  htm: 'html',
  js: 'javascript',
  ts: 'typescript',
  yml: 'yaml',
  shell: 'bash',
  zsh: 'bash',
  'c++': 'cpp',
  'c#': 'csharp',
  rs: 'rust',
  rb: 'ruby',
  toml: 'yaml',
  ini: 'yaml',
}

export function resolveLangIconKey(lang: string | null | undefined): string | null {
  if (!lang) return null
  const key = String(lang).toLowerCase()
  if (ICONS[key]) return key
  const alias = ALIASES[key]
  return alias && ICONS[alias] ? alias : null
}

export function hasLangIcon(lang: string | null | undefined): boolean {
  return resolveLangIconKey(lang) !== null
}

interface LangIconProps {
  lang: string | null | undefined
  size?: number
  className?: string
}

export function LangIcon({ lang, size = 14, className }: LangIconProps) {
  const key = resolveLangIconKey(lang)
  if (!key) return null
  const inner = ICONS[key]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0 opacity-70', className)}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  )
}
