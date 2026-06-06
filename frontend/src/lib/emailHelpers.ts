/** Virtual folder key for the scheduled-send queue (not an IMAP folder). */
export const SCHEDULED_FOLDER = '__scheduled__'

export function isScheduledFolder(folder: string): boolean {
  return folder === SCHEDULED_FOLDER
}

/** Strip LLM marker blocks from AI reply/summary text. */
export function cleanAiReplyText(text: string): string {
  if (!text) return ''
  let t = String(text)
  const open = /<<<\s*(?:REPLY|SUMMARY|OUTPUT)\s*>>+/i
  const close = /<<<\s*END\s*>>+/i
  const m = open.exec(t)
  if (m) {
    const rest = t.slice(m.index + m[0].length)
    const c = close.exec(rest)
    t = c ? rest.slice(0, c.index) : rest
  }
  return t
    .replace(/<<<\s*(?:REPLY|SUMMARY|OUTPUT)\s*>>+/gi, '')
    .replace(/<<<\s*END\s*>>+/gi, '')
    .trim()
}

/** Build a query string from optional email API params (skips empty values). */
export function buildEmailQueryParams(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/** Format a display name + address for compose headers. */
export function formatAddress(name?: string, address?: string): string {
  const n = (name || '').trim()
  const a = (address || '').trim()
  if (n && a && n.toLowerCase() !== a.toLowerCase()) return `${n} <${a}>`
  return a || n
}

/** Prefix Re: for reply subjects when missing. */
export function replySubject(subject: string): string {
  const s = (subject || '').trim()
  if (!s) return 'Re:'
  if (/^re:/i.test(s)) return s
  return `Re: ${s}`
}

/** Build References header for a reply. */
export function replyReferences(messageId: string, existing?: string): string {
  const mid = (messageId || '').trim()
  const refs = (existing || '').trim()
  if (!mid) return refs
  if (refs.includes(mid)) return refs
  return refs ? `${refs} ${mid}` : mid
}

/** Short relative or locale date for list rows. */
export function formatEmailDate(epoch: number, iso?: string): string {
  if (epoch > 0) {
    const d = new Date(epoch * 1000)
    const now = new Date()
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    if (sameDay) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  if (iso) {
    const d = new Date(iso)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
  }
  return ''
}

/** Pick a sensible default folder from IMAP folder list. */
export function defaultFolder(folders: string[]): string {
  if (folders.includes('INBOX')) return 'INBOX'
  return folders[0] ?? 'INBOX'
}
