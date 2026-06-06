export const SENSITIVE_BLUR_PREF_KEY = 'odysseus-sensitive-blur'
export const SENSITIVE_BLUR_CHANGE_EVENT = 'odysseus-sensitive-blur-change'

interface CensorPattern {
  re: RegExp
  label: string
}

const PATTERNS: CensorPattern[] = [
  { re: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, label: 'email' },
  {
    re: /\b(sk-[a-zA-Z0-9]{20,}|pk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36,}|gho_[a-zA-Z0-9]{36,}|glpat-[a-zA-Z0-9\-_]{20,}|xox[bpras]-[a-zA-Z0-9-]{10,}|npm_[a-zA-Z0-9]{36,}|AKIA[A-Z0-9]{12,})\b/g,
    label: 'api-key',
  },
  { re: /Bearer\s+[A-Za-z0-9._-]{20,}/g, label: 'token' },
  {
    re: /(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret)[\s]*[:=]\s*["']?[^\s"'<]{4,}["']?/gi,
    label: 'credential',
  },
  {
    re: /(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret)\s{2,}[^\s<]{4,}/gi,
    label: 'credential',
  },
  {
    re: /(?:^|\n)\s*(?:password|passwd|secret|api[_-]?key|token|private[_-]?key)[\t ]*\n\s*([^\s<]{4,})/gim,
    label: 'credential',
  },
  {
    re: /-----BEGIN\s[\w\s]*PRIVATE KEY-----[\s\S]*?-----END\s[\w\s]*PRIVATE KEY-----/g,
    label: 'private-key',
  },
  { re: /\b[0-9a-f]{32,}\b/gi, label: 'hash' },
  {
    re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    label: 'jwt',
  },
  {
    re: /\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}(?::\d+)?\b/g,
    label: 'internal-ip',
  },
]

const SENSITIVE_LABELS =
  /^(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret|token|credentials?)$/i

export function isSensitiveBlurPrefEnabled(): boolean {
  try {
    return localStorage.getItem(SENSITIVE_BLUR_PREF_KEY) === 'on'
  } catch {
    return false
  }
}

export function setSensitiveBlurPref(enabled: boolean): void {
  try {
    localStorage.setItem(SENSITIVE_BLUR_PREF_KEY, enabled ? 'on' : 'off')
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(SENSITIVE_BLUR_CHANGE_EVENT, { detail: { enabled } }),
  )
  if (!enabled) {
    document.querySelectorAll('.censored-item').forEach((el) => el.classList.add('revealed'))
  } else {
    document.querySelectorAll('.censored-item').forEach((el) => el.classList.remove('revealed'))
  }
}

export function isCensorEnabled(): boolean {
  return isSensitiveBlurPrefEnabled()
}

/** Legacy string blur — kept for tests and non-DOM contexts. */
export function applyCensor(text: string): string {
  if (!isCensorEnabled() || !text) return text
  let out = text
  for (const { re } of PATTERNS) {
    re.lastIndex = 0
    out = out.replace(re, (match) => `[${'•'.repeat(Math.min(match.length, 12))}]`)
  }
  return out
}

function shouldSkipTextNode(node: Text): boolean {
  const parent = node.parentElement
  if (!parent) return true
  if (parent.closest('.setup-guide-no-censor')) return true
  if (parent.closest('pre:not(.censored-item), .censored-item, code')) return true
  return false
}

function censorTextNode(textNode: Text) {
  const text = textNode.textContent ?? ''
  if (!text || text.trim().length < 4) return

  const matches: Array<{ start: number; end: number; text: string; label: string }> = []
  for (const pattern of PATTERNS) {
    pattern.re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = pattern.re.exec(text)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        label: pattern.label,
      })
    }
  }
  if (matches.length === 0) return

  matches.sort((a, b) => a.start - b.start)
  const deduped = [matches[0]]
  for (let i = 1; i < matches.length; i++) {
    const prev = deduped[deduped.length - 1]
    if (matches[i].start < prev.end) {
      if (matches[i].end > prev.end) prev.end = matches[i].end
    } else {
      deduped.push(matches[i])
    }
  }

  const frag = document.createDocumentFragment()
  let lastIdx = 0
  for (const match of deduped) {
    if (match.start > lastIdx) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx, match.start)))
    }
    const span = document.createElement('span')
    span.className = 'censored-item'
    span.dataset.type = match.label
    span.title = `Click to reveal ${match.label}`
    span.textContent = match.text
    frag.appendChild(span)
    lastIdx = match.end
  }
  if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)))
  textNode.parentNode?.replaceChild(frag, textNode)
}

function censorValueInElement(el: HTMLElement, value: string) {
  if (!value || value.length < 4) return
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    const textNode = node as Text
    if (shouldSkipTextNode(textNode)) continue
    const idx = (textNode.textContent ?? '').indexOf(value)
    if (idx < 0) continue
    const before = textNode.textContent!.slice(0, idx)
    const after = textNode.textContent!.slice(idx + value.length)
    const frag = document.createDocumentFragment()
    if (before) frag.appendChild(document.createTextNode(before))
    const span = document.createElement('span')
    span.className = 'censored-item'
    span.dataset.type = 'credential'
    span.title = 'Click to reveal credential'
    span.textContent = value
    frag.appendChild(span)
    if (after) frag.appendChild(document.createTextNode(after))
    textNode.parentNode?.replaceChild(frag, textNode)
    return
  }
}

function censorAllText(el: HTMLElement) {
  if (el.querySelector('.censored-item')) return
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) {
    const textNode = n as Text
    if (shouldSkipTextNode(textNode)) continue
    if ((textNode.textContent ?? '').trim().length >= 2) nodes.push(textNode)
  }
  for (const tn of nodes) {
    const span = document.createElement('span')
    span.className = 'censored-item'
    span.dataset.type = 'credential'
    span.title = 'Click to reveal credential'
    span.textContent = tn.textContent ?? ''
    tn.parentNode?.replaceChild(span, tn)
  }
}

function contextCensor(el: HTMLElement) {
  const allElements = el.querySelectorAll('td, th, dt, dd, span, strong, b, em, li, p, div')
  for (const elem of allElements) {
    if (elem.closest('.setup-guide-no-censor, .censored-item, pre')) continue
    const txt = (elem.textContent ?? '').trim()
    if (!SENSITIVE_LABELS.test(txt)) continue

    let censored = false
    let sibling: ChildNode | null = elem.nextSibling
    while (sibling && !censored) {
      if (sibling.nodeType === Node.TEXT_NODE) {
        const val = sibling.textContent?.trim() ?? ''
        if (val.length >= 4 && !SENSITIVE_LABELS.test(val)) {
          const span = document.createElement('span')
          span.className = 'censored-item'
          span.dataset.type = 'credential'
          span.title = 'Click to reveal credential'
          span.textContent = sibling.textContent ?? ''
          sibling.parentNode?.replaceChild(span, sibling)
          censored = true
        }
      } else if (sibling.nodeType === Node.ELEMENT_NODE) {
        const val = (sibling as HTMLElement).textContent?.trim() ?? ''
        if (val.length >= 4 && !SENSITIVE_LABELS.test(val)) {
          censorAllText(sibling as HTMLElement)
          censored = true
        }
      }
      sibling = censored ? null : sibling.nextSibling
    }

    if (!censored && elem.parentElement) {
      const nextEl = elem.parentElement.nextElementSibling
      if (nextEl && !nextEl.closest('.censored-item')) {
        const val = nextEl.textContent?.trim() ?? ''
        if (val.length >= 2 && !SENSITIVE_LABELS.test(val)) {
          censorAllText(nextEl as HTMLElement)
          break
        }
      }
    }
  }

  const fullText = el.textContent ?? ''
  const labelValueRe =
    /(?:password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key|client[_-]?secret|token|auth[_-]?token)\s*[:\s]\s*(\S{4,})/gi
  let m: RegExpExecArray | null
  while ((m = labelValueRe.exec(fullText)) !== null) {
    censorValueInElement(el, m[1])
  }
}

/** Process rendered markdown DOM — click-to-reveal spans (legacy censor.js parity). */
export function processCensorElement(el: HTMLElement | null) {
  if (!isCensorEnabled() || !el) return
  if (el.closest('.setup-guide-no-censor')) return

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    const textNode = node as Text
    if (shouldSkipTextNode(textNode)) continue
    textNodes.push(textNode)
  }

  for (const textNode of textNodes) censorTextNode(textNode)
  contextCensor(el)
}

let clickHandlerInstalled = false

export function ensureCensorClickHandler() {
  if (clickHandlerInstalled) return
  clickHandlerInstalled = true
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement | null)?.closest('.censored-item')
    if (!target) return
    e.preventDefault()
    e.stopPropagation()
    target.classList.toggle('revealed')
  })
}

export function observeCensorRoot(
  root: HTMLElement | null,
  enabled: boolean,
  onProcess: () => void,
): () => void {
  if (!root || !enabled) return () => {}

  onProcess()

  const observer = new MutationObserver(() => {
    onProcess()
  })
  observer.observe(root, { childList: true, subtree: true, characterData: true })

  let attempts = 0
  const interval = window.setInterval(() => {
    onProcess()
    attempts += 1
    if (attempts >= 30) window.clearInterval(interval)
  }, 2000)

  const finalPass = window.setTimeout(() => {
    window.clearInterval(interval)
    onProcess()
  }, 60000)

  return () => {
    observer.disconnect()
    window.clearInterval(interval)
    window.clearTimeout(finalPass)
  }
}
