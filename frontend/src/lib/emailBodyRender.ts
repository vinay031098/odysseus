import type { EmailBoundaries, EmailMessage, EmailThreadTurn } from '@/api/email-types'
import { escapeLinkify, escapeHtml, sanitizeEmailHtml } from './emailSanitize'
import {
  QUOTE_ICON,
  extractQuoteMeta,
  foldQuotedReplies,
  foldSummary,
  renderPlaintextThread,
} from './emailQuoteFold'
import { foldSignature, isBloatedSig } from './emailSignatureFold'

type RenderInput = Pick<
  EmailMessage,
  | 'body'
  | 'body_html'
  | 'thread_turns'
  | 'boundaries'
  | 'sender_signature'
  | 'from_address'
  | 'from_name'
  | 'date'
  | 'folder'
>

export type EmailBodyRenderOptions = {
  bubblesDisabled?: boolean
  /** Lowercase addresses belonging to the active account(s). */
  mineAddresses?: string[]
}

function fmtPlain(s: string): string {
  return escapeLinkify(s).replace(/\n/g, '<br>')
}

export function parseTurnMeta(meta: string | undefined): {
  author: string
  email: string
  date: string
} {
  if (!meta) return { author: '', email: '', date: '' }
  const m = String(meta)
  const eMatch =
    m.match(/<([^<>\s]+@[^<>\s]+)>/) || m.match(/\b([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})\b/)
  const email = eMatch ? eMatch[1].toLowerCase().trim() : ''
  const parts = m.split(/\s+[·•]\s+/)
  let author: string
  let date = ''
  if (parts.length >= 2) {
    author = parts[0].replace(/<[^>]+>/g, '').trim()
    date = parts.slice(1).join(' · ').trim()
  } else {
    author = m.replace(/<[^>]+>/g, '').trim()
  }
  return { author, email, date }
}

export function formatBubbleDate(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function senderColor(name: string): string {
  if (!name) return 'hsl(220, 55%, 65%)'
  const key = String(name).toLowerCase()
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0
  }
  const hue = ((hash % 360) + 360) % 360
  return `hsl(${hue}, 55%, 65%)`
}

export function senderInitials(s: string): string {
  if (!s) return '?'
  const clean = String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\s]/gu, ' ')
    .trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0][0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function mineSet(addresses: string[] | undefined): Set<string> {
  return new Set((addresses || []).map((a) => a.toLowerCase().trim()).filter(Boolean))
}

function renderTurnsFromServer(turns: EmailThreadTurn[]): string {
  if (!turns.length) return ''
  let out = ''
  const stack: { level: number; meta?: string; html: string }[] = []

  const wrap = (t: { meta?: string; html: string }) =>
    `<details class="email-thread-turn email-quote-fold">` +
    foldSummary('Earlier reply', QUOTE_ICON, t.meta || '') +
    `<div class="email-thread-turn-body">${t.html}</div>` +
    '</details>'

  for (const t of turns) {
    if (t.level === 0) {
      while (stack.length) {
        const top = stack.pop()!
        const w = wrap(top)
        if (stack.length) stack[stack.length - 1].html += w
        else out += w
      }
      out += sanitizeEmailHtml(t.body_html || '')
    } else {
      while (stack.length && stack[stack.length - 1].level > t.level) {
        const top = stack.pop()!
        const w = wrap(top)
        if (stack.length) stack[stack.length - 1].html += w
        else out += w
      }
      if (!stack.length || stack[stack.length - 1].level < t.level) {
        stack.push({
          level: t.level,
          meta: t.meta,
          html: sanitizeEmailHtml(t.body_html || ''),
        })
      } else {
        stack[stack.length - 1].html += sanitizeEmailHtml(t.body_html || '')
        if (t.meta && !stack[stack.length - 1].meta) {
          stack[stack.length - 1].meta = t.meta
        }
      }
    }
  }
  while (stack.length) {
    const top = stack.pop()!
    const w = wrap(top)
    if (stack.length) stack[stack.length - 1].html += w
    else out += w
  }
  const lastIdx = out.lastIndexOf('<details class="email-thread-turn email-quote-fold"')
  if (lastIdx >= 0) {
    out =
      out.slice(0, lastIdx) +
      out
        .slice(lastIdx)
        .replace(
          'email-thread-turn email-quote-fold"',
          'email-thread-turn email-quote-fold last-fold"',
        )
  }
  return out
}

/** Chat-bubble layout for server-parsed thread turns. */
export function renderTurnsAsBubbles(
  turns: EmailThreadTurn[],
  data: RenderInput,
  mineAddresses?: string[],
): string {
  if (!turns.length) return ''
  const mines = mineSet(mineAddresses)
  const lvl0Email = String(data.from_address || '')
    .toLowerCase()
    .trim()
  const lvl0Mine = !!lvl0Email && mines.has(lvl0Email)
  const lvl0Author = data.from_name || data.from_address || ''
  const lvl0Date = formatBubbleDate(data.date)
  const ordered = turns.slice()

  const turnIdentity = ordered.map((t) => {
    if (t.level === 0) return { email: lvl0Email, author: lvl0Author }
    const p = parseTurnMeta(t.meta)
    return { email: p.email, author: p.author }
  })

  const anyMine = turnIdentity.some((x) => x.email && mines.has(x.email))
  const sideForKey = (() => {
    if (anyMine) return null
    const freq = new Map<string, number>()
    const firstSeen = new Map<string, number>()
    turnIdentity.forEach((x, i) => {
      const key = (x.email || x.author || '').toLowerCase()
      if (!key) return
      freq.set(key, (freq.get(key) || 0) + 1)
      if (!firstSeen.has(key)) firstSeen.set(key, i)
    })
    const sorted = [...freq.entries()].sort(
      (a, b) => b[1] - a[1] || (firstSeen.get(a[0]) ?? 0) - (firstSeen.get(b[0]) ?? 0),
    )
    const leftKey = sorted[0]?.[0]
    const rightKey = sorted[1]?.[0]
    return (key: string) => {
      if (!key) return 'theirs'
      if (key === leftKey) return 'theirs'
      if (key === rightKey) return 'mine'
      let h = 0
      for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0
      return (h & 1) ? 'mine' : 'theirs'
    }
  })()

  const rows = ordered.map((t, i) => {
    let isMine: boolean
    let author: string
    let date: string
    if (t.level === 0) {
      isMine = lvl0Mine
      author = lvl0Author || 'Me'
      date = lvl0Date
    } else {
      const p = parseTurnMeta(t.meta)
      isMine = !!p.email && mines.has(p.email)
      author = p.author || t.meta || 'Earlier reply'
      date = p.date
    }
    if (sideForKey) {
      const id = turnIdentity[i]
      const key = (id.email || id.author || '').toLowerCase()
      isMine = sideForKey(key) === 'mine'
    }
    const side = isMine ? 'mine' : 'theirs'
    const initials = senderInitials(author)
    const color = senderColor(author || (t.level === 0 ? lvl0Email : ''))
    const head =
      `<div class="email-bubble-head">` +
      `<span class="email-bubble-author" style="color:${color}">${escapeHtml(author)}</span>` +
      (date ? `<span class="email-bubble-date">${escapeHtml(date)}</span>` : '') +
      `</div>`
    const avatar = `<div class="email-bubble-avatar" aria-hidden="true" style="background:${color}">${escapeHtml(initials)}</div>`
    return (
      `<div class="email-bubble-row email-bubble-${side}" style="--bubble-accent:${color}">` +
      (isMine ? '' : avatar) +
      `<div class="email-bubble">` +
      head +
      `<div class="email-bubble-body">${sanitizeEmailHtml(t.body_html || '')}</div>` +
      `</div>` +
      (isMine ? avatar : '') +
      `</div>`
    )
  })
  return `<div class="email-bubbles">${rows.join('')}</div>`
}

function renderFromBoundaries(plain: string, b: EmailBoundaries): string {
  let sig = typeof b.sig_start === 'number' && b.sig_start >= 0 ? b.sig_start : -1
  let quote = typeof b.quote_start === 'number' && b.quote_start >= 0 ? b.quote_start : -1
  if (sig >= plain.length) sig = -1
  if (quote >= plain.length) quote = -1

  let head = plain
  let sigSection = ''
  let quoteSection = ''
  if (sig >= 0 && quote >= 0) {
    const earlier = Math.min(sig, quote)
    head = plain.slice(0, earlier)
    if (sig < quote) {
      sigSection = plain.slice(sig, quote)
      quoteSection = plain.slice(quote)
    } else {
      quoteSection = plain.slice(quote, sig)
      sigSection = plain.slice(sig)
    }
  } else if (sig >= 0) {
    head = plain.slice(0, sig)
    sigSection = plain.slice(sig)
  } else if (quote >= 0) {
    head = plain.slice(0, quote)
    quoteSection = plain.slice(quote)
  }

  let out = fmtPlain(head)
  if (quoteSection) {
    out +=
      '<details class="email-quote-fold">' +
      foldSummary('Earlier thread', QUOTE_ICON, extractQuoteMeta(quoteSection)) +
      fmtPlain(quoteSection) +
      '</details>'
  }
  if (sigSection) {
    const sigHtml = fmtPlain(sigSection)
    if (isBloatedSig(sigHtml)) {
      out +=
        '<details class="email-sig-fold">' + foldSummary('Signature', '') + sigHtml + '</details>'
    } else {
      out += sigHtml
    }
  }
  return out
}

/** Render an email body as sanitized HTML with thread/signature folds. */
export function renderEmailBodyHtml(
  data: RenderInput,
  options: EmailBodyRenderOptions = {},
): string {
  const plain = (typeof data.body === 'string' && data.body.length ? data.body : '').trim()
  const folder = String(data.folder || '').toLowerCase()
  const isSentFolder = folder.includes('sent')
  const fromAddr = String(data.from_address || '')
    .toLowerCase()
    .trim()
  const mines = mineSet(options.mineAddresses)
  const isMine = !!fromAddr && mines.has(fromAddr)
  const hintSig = data.sender_signature || null
  const bubblesDisabled = options.bubblesDisabled ?? false

  if ((isSentFolder || isMine) && plain) {
    const plainTurns = renderPlaintextThread(plain)
    if (plainTurns && !/^\s*<details\b/i.test(plainTurns.trim())) {
      return foldSignature(plainTurns, null)
    }
    return foldSignature(fmtPlain(plain), null)
  }

  if (
    !bubblesDisabled &&
    Array.isArray(data.thread_turns) &&
    data.thread_turns.length
  ) {
    return foldSignature(
      renderTurnsAsBubbles(data.thread_turns, data, options.mineAddresses),
      hintSig,
    )
  }

  if (Array.isArray(data.thread_turns) && data.thread_turns.length) {
    return foldSignature(renderTurnsFromServer(data.thread_turns), hintSig)
  }

  const b = data.boundaries
  if (b && plain && (b.sig_start >= 0 || b.quote_start >= 0)) {
    return foldSignature(renderFromBoundaries(plain, b), hintSig)
  }

  const isHtml = !!data.body_html
  let rendered: string
  if (isHtml) {
    rendered = foldQuotedReplies(sanitizeEmailHtml(data.body_html!))
  } else if (plain) {
    const plainTurns = renderPlaintextThread(plain)
    if (plainTurns) return foldSignature(plainTurns, hintSig)
    rendered = fmtPlain(plain)
  } else {
    return ''
  }

  return foldSignature(rendered, hintSig)
}

export function isHtmlEmailBody(data: RenderInput): boolean {
  return !!data.body_html || /<[a-z][\s\S]*>/i.test(data.body || '')
}

export function hasThreadBubbleLayout(data: RenderInput): boolean {
  return Array.isArray(data.thread_turns) && data.thread_turns.length > 0
}
