const BLOCKED_TAGS =
  'script, iframe, object, embed, form, style, link, svg, math, base, meta, noscript, frame, frameset, applet, portal'

const URL_ATTRS = [
  'href',
  'src',
  'xlink:href',
  'srcset',
  'action',
  'formaction',
  'background',
  'poster',
  'data',
]

const STRIP_CSS_PROPS = [
  'color',
  'background',
  'background-color',
  'font-family',
  'font',
  '-webkit-text-fill-color',
  'position',
  'z-index',
]

const HIGHLIGHT_INLINE_TAGS = new Set(['SPAN', 'FONT', 'EM', 'B', 'I', 'STRONG', 'SMALL', 'U'])
const HAS_BG_COLOR =
  /background(?:-color)?\s*:\s*(?!\s*(?:transparent|none|inherit|initial)\b)[^;]+/i

function compactUrlSchemeValue(value: string): string {
  return String(value || '')
    .replace(/[\0-\x20\x7f-\x9f]+/g, '')
    .toLowerCase()
}

function isDangerousUrl(value: string): boolean {
  const compact = compactUrlSchemeValue(value)
  return (
    compact.startsWith('javascript:') ||
    compact.startsWith('vbscript:') ||
    compact.startsWith('data:')
  )
}

function isDangerousSrcset(value: string): boolean {
  return String(value || '')
    .split(',')
    .some((candidate) => isDangerousUrl(candidate))
}

function sanitizeHtmlOnce(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll(BLOCKED_TAGS).forEach((el) => el.remove())

  const markedForHighlight: Element[] = []

  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name)
        continue
      }
      if (name === 'srcdoc') {
        el.removeAttribute(attr.name)
        continue
      }
      if (
        URL_ATTRS.includes(name) &&
        (name === 'srcset' ? isDangerousSrcset(attr.value) : isDangerousUrl(attr.value))
      ) {
        el.removeAttribute(attr.name)
      }
    }
    el.removeAttribute('color')
    const bgcolor = el.getAttribute('bgcolor')
    el.removeAttribute('bgcolor')
    el.removeAttribute('face')
    const style = el.getAttribute('style')
    const hadHighlight =
      HIGHLIGHT_INLINE_TAGS.has(el.tagName) &&
      ((style && HAS_BG_COLOR.test(style)) || (bgcolor != null && bgcolor !== 'transparent'))
    if (hadHighlight) markedForHighlight.push(el)
    if (style) {
      const kept = style
        .split(';')
        .map((s) => s.trim())
        .filter((decl) => {
          if (!decl) return false
          const lower = compactUrlSchemeValue(decl)
          if (
            lower.includes('javascript:') ||
            lower.includes('vbscript:') ||
            lower.includes('data:') ||
            lower.includes('expression(')
          ) {
            return false
          }
          const prop = decl.split(':', 1)[0]?.trim().toLowerCase()
          return prop != null && !STRIP_CSS_PROPS.includes(prop)
        })
      if (kept.length) el.setAttribute('style', kept.join('; '))
      else el.removeAttribute('style')
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank')
      el.setAttribute('rel', 'noopener noreferrer')
    }
  })

  markedForHighlight.forEach((el) => {
    if (el.tagName === 'MARK' || !el.firstChild) return
    const mark = doc.createElement('mark')
    while (el.firstChild) mark.appendChild(el.firstChild)
    el.appendChild(mark)
  })

  return doc.body.innerHTML
}

/** Strip XSS vectors from remote email HTML before rendering. */
export function sanitizeEmailHtml(html: string): string {
  let out = String(html ?? '')
  for (let i = 0; i < 4; i++) {
    const next = sanitizeHtmlOnce(out)
    if (next === out) break
    out = next
  }
  return out
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text || ''
  return div.innerHTML
}

function attrEsc(text: string): string {
  return String(text ?? '')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, '&#96;')
}

/** Escape and linkify URLs and email addresses for plain-text bodies. */
export function escapeLinkify(text: string): string {
  const escaped = escapeHtml(text)
  const urlRe = /\b((?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?)\]])/g
  const mailRe = /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g
  return escaped
    .replace(urlRe, (m) => {
      const href = m.startsWith('www.') ? `https://${m}` : m
      return `<a href="${attrEsc(href)}" target="_blank" rel="noopener noreferrer">${m}</a>`
    })
    .replace(mailRe, (m) => `<a href="${attrEsc(`mailto:${m}`)}">${m}</a>`)
}

/** Strip HTML tags to produce a plain-text fallback for compose/send. */
export function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').replace(/\u00a0/g, ' ').trim()
}
