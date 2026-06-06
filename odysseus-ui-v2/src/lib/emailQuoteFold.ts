import { escapeHtml, escapeLinkify } from './emailSanitize'

export const TALON_WROTE =
  '(?:wrote|écrit|escribió|scrisse|schrieb|skrev|schreef|napisał|написал|napsal|написа|έγραψε|katselivat|napisao|написав|napisała|napisali|hat geschrieben|kirjoitti|написала|escreveu|napisao|написа|написала)'

export const TALON_FROM =
  '(?:From|Från|Von|De|Da|От|Od|Van|差出人|发件人|寄件人|Ut|Frá|Lähettäjä|Avsender|Pošiljatelj|Од|Від|Posiljatelj|Frå)'

export const TALON_SENT =
  '(?:Sent|Skickat|Gesendet|Envoy[ée]|Inviato|Enviado|Verzonden|Отправлено|Wysłane|Date|送信日時|发送时间|寄件日期|Sendt|Lähetetty|Tarih|Datum|Data|Datum)'

export const TALON_ORIG_RE =
  /(?:^|\n)[\s>]*[-_=]{3,}\s*(?:Original\s+Message|Forwarded\s+message|Ursprüngliche\s+Nachricht|Mensaje\s+original|Messaggio\s+originale|Message\s+d['']origine|Oorspronkelijk\s+bericht|Original\s+meddelande|Vor[ ]asal[a]\s+meddelande|原文|原始邮件|転送)\s*[-_=]{3,}/i

export const QUOTE_ICON =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>'

export function foldSummary(label: string, iconSvg: string, meta?: string): string {
  let primary = label
  let subMeta = meta || ''
  if (meta) {
    const idx = meta.indexOf(' · ')
    if (idx > 0) {
      primary = meta.slice(0, idx)
      subMeta = meta.slice(idx + 3)
    } else if (meta.length <= 80 && !/^\d/.test(meta)) {
      primary = meta
      subMeta = ''
    }
  }
  const metaSpan = subMeta
    ? `<span class="email-fold-summary-meta">${escapeHtml(subMeta)}</span>`
    : ''
  return (
    '<summary class="email-fold-summary">' +
    iconSvg +
    `<span class="email-fold-summary-name">${escapeHtml(primary)}</span>` +
    metaSpan +
    '<svg class="email-summary-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;transition:transform .15s ease;"><polyline points="6 9 12 15 18 9"/></svg>' +
    '</summary>'
  )
}

/** Extract sender + date from a quoted email block. */
export function extractQuoteMeta(html: string): string {
  if (typeof html !== 'string' || !html) return ''
  const txt = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .slice(0, 1500)

  const FROM = '(?:From|Från|Von|De|Da|От|Od|Van)'
  const SENT =
    '(?:Sent|Skickat|Gesendet|Envoyé|Inviato|Enviado|Verzonden|Отправлено|Wysłane|Date)'
  const STOP = `(?=\\s+(?:To|Cc|Bcc|Subject|Ämne|Betreff|Objet|Oggetto|Asunto|Onderwerp|Тема|Temat|${SENT})\\s*:)`
  const fromMatch = txt.match(new RegExp(`${FROM}\\s*:\\s*(.+?)${STOP}`, 'i'))
  const sentMatch = txt.match(
    new RegExp(
      `${SENT}\\s*:\\s*([^\\n]+?)(?=\\s+(?:To|Cc|Bcc|Subject|Ämne|Betreff|Objet|Oggetto|Asunto|Onderwerp|Тема|Temat)\\s*:)`,
      'i',
    ),
  )
  let from = fromMatch ? fromMatch[1].trim() : ''
  let date = sentMatch ? sentMatch[1].trim() : ''

  if (!from && !date) {
    const gmail = txt.match(
      /On\s+((?:[^,]*,){0,3}?[^,]*?\d{4}[^,]*),?\s+(.+?)\s+wrote\s*:/i,
    )
    if (gmail) {
      date = gmail[1].trim()
      from = gmail[2].trim()
    }
  }

  from = from.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()
  date = date.replace(/\s+/g, ' ').trim()
  if (from.length > 60) from = from.slice(0, 57) + '…'
  if (date.length > 28) date = date.slice(0, 25) + '…'

  if (from && date) return `${from} · ${date}`
  if (from) return from
  if (date) return date
  return ''
}

/** Wrap top-level blockquotes in collapsed details elements. */
export function foldQuotedReplies(html: string): string {
  if (!html || typeof html !== 'string') return html
  if (html.length > 200_000) return html
  const before = html
  try {
    const doc = new DOMParser().parseFromString(`<div id="__r">${html}</div>`, 'text/html')
    const root = doc.getElementById('__r')
    if (root) {
      const tops = Array.from(root.querySelectorAll('blockquote')).filter(
        (b) => !b.parentElement?.closest('blockquote'),
      )
      if (tops.length) {
        for (const bq of tops) {
          const det = doc.createElement('details')
          det.className = 'email-quote-fold'
          det.innerHTML = foldSummary('Earlier thread', QUOTE_ICON, extractQuoteMeta(bq.innerHTML))
          bq.parentNode?.insertBefore(det, bq)
          det.appendChild(bq)
        }
        const allFolds = root.querySelectorAll('.email-quote-fold')
        if (allFolds.length) allFolds[allFolds.length - 1].classList.add('last-fold')
        return root.innerHTML
      }
    }
  } catch {
    // fall through
  }
  if (html !== before) return html

  const FROM = '(?:From|Från|Von|De|De\\s|Da|От|Od|Van)'
  const SENT = '(?:Sent|Skickat|Gesendet|Envoyé|Inviato|Enviado|Verzonden|Отправлено|Wysłane)'
  const SUBJ = '(?:Subject|Ämne|Betreff|Objet|Oggetto|Asunto|Onderwerp|Тема|Temat)'
  const outlookRe = new RegExp(
    `(<br\\s*/?>|</p>|</div>|<p[^>]*>|<div[^>]*>|\\n)\\s*((?:<[^>]+>\\s*)*${FROM}\\s*:\\s*[^<\\n]+(?:<[^>]+>\\s*|\\s)*${SENT}\\s*:[\\s\\S]+?${SUBJ}\\s*:[\\s\\S]+)$`,
    'i',
  )
  const m = html.match(outlookRe)
  if (m) {
    const idx = html.lastIndexOf(m[0])
    return (
      html.slice(0, idx) +
      m[1] +
      '<details class="email-quote-fold last-fold">' +
      foldSummary('Earlier thread', QUOTE_ICON, extractQuoteMeta(m[2])) +
      m[2] +
      '</details>'
    )
  }
  return html
}

type PlainTurn = { level: number; text: string; meta: string | null }

function fmtPlain(s: string): string {
  return escapeLinkify(s).replace(/\n/g, '<br>')
}

/**
 * Parse a plaintext email body into stacked turn-cards by walking `> ` quote
 * prefixes and Outlook-style attribution boundaries. Returns rendered HTML, or
 * null when there is no quoted content.
 */
export function renderPlaintextThread(text: string): string | null {
  if (!text || typeof text !== 'string' || text.length > 200_000) return null
  const lines = text.split(/\r?\n/)
  const levels = lines.map((l) => {
    const m = l.match(/^((?:>\s?)+)/)
    return m ? (m[1].match(/>/g) || []).length : 0
  })
  const hasQuotes = levels.some((l) => l > 0)
  const attribLineRe = new RegExp(`(?:^|\\n)\\s*On\\s.+?\\s${TALON_WROTE}\\s*:\\s*$`, 'im')
  const hasAttrib = attribLineRe.test(text) || TALON_ORIG_RE.test(text)
  if (!hasQuotes && !hasAttrib) return null

  const turns: PlainTurn[] = []
  let buf: string[] = []
  let curLevel = 0
  let pendingMeta: string | null = null

  const flush = () => {
    if (!buf.length) return
    const t = buf.join('\n').trimEnd()
    if (t || curLevel > 0) turns.push({ level: curLevel, text: t, meta: pendingMeta })
    buf = []
    pendingMeta = null
  }

  for (let i = 0; i < lines.length; i++) {
    const lvl = levels[i]
    const raw = lines[i]
    const stripped = lvl > 0 ? raw.replace(/^(?:>\s?)+/, '') : raw
    const isSeparatorLine = lvl === 0 && /^-{5,}\s*Previous message\s*-{5,}$/i.test(raw.trim())
    const isAttribLine =
      lvl === 0 &&
      (new RegExp(`^\\s*On\\s.+?\\s${TALON_WROTE}\\s*:\\s*$`, 'i').test(raw) ||
        TALON_ORIG_RE.test('\n' + raw))
    if (isSeparatorLine || isAttribLine) {
      flush()
      pendingMeta = isSeparatorLine ? null : extractQuoteMeta(raw) || raw.trim()
      curLevel = 1
      continue
    }
    if (lvl !== curLevel) {
      flush()
      curLevel = lvl
    }
    buf.push(stripped)
  }
  flush()

  if (!turns.length || (turns.length === 1 && turns[0].level === 0)) return null

  let out = ''
  const stack: { level: number; meta: string | null; html: string }[] = []
  const wrapTurn = (t: { meta: string | null; html: string }) =>
    `<details class="email-thread-turn email-quote-fold">` +
    foldSummary('Earlier reply', QUOTE_ICON, t.meta || '') +
    `<div class="email-thread-turn-body">${t.html}</div>` +
    '</details>'

  for (const t of turns) {
    if (t.level === 0) {
      while (stack.length) {
        const top = stack.pop()!
        const wrapped = wrapTurn(top)
        if (stack.length) stack[stack.length - 1].html += wrapped
        else out += wrapped
      }
      out += fmtPlain(t.text)
    } else {
      while (stack.length && stack[stack.length - 1].level > t.level) {
        const top = stack.pop()!
        const wrapped = wrapTurn(top)
        if (stack.length) stack[stack.length - 1].html += wrapped
        else out += wrapped
      }
      if (!stack.length || stack[stack.length - 1].level < t.level) {
        stack.push({ level: t.level, meta: t.meta, html: fmtPlain(t.text) })
      } else {
        stack[stack.length - 1].html += '<br>' + fmtPlain(t.text)
        if (t.meta && !stack[stack.length - 1].meta) stack[stack.length - 1].meta = t.meta
      }
    }
  }
  while (stack.length) {
    const top = stack.pop()!
    const wrapped = wrapTurn(top)
    if (stack.length) stack[stack.length - 1].html += wrapped
    else out += wrapped
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
