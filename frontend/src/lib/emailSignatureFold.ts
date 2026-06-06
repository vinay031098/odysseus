import { foldSummary } from './emailQuoteFold'

export const SIG_BLOAT_MIN_CHARS = 200

export function isBloatedSig(htmlFragment: string): boolean {
  if (!htmlFragment) return false
  const plain = htmlFragment
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length >= SIG_BLOAT_MIN_CHARS
}

function peelSigNameLine(htmlAfterClosing: string): { preBloat: string; bloat: string } {
  if (!htmlAfterClosing) return { preBloat: '', bloat: '' }
  const breakRe = /<br\s*\/?>|<\/p>|<\/div>|\n/gi
  let cursor = 0
  let mm: RegExpExecArray | null
  while ((mm = breakRe.exec(htmlAfterClosing)) !== null) {
    const seg = htmlAfterClosing
      .slice(cursor, mm.index)
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim()
    if (seg.length > 0) {
      const looksBloat =
        /[@]|tel\.?:|mobile:|phone:|www\.|https?:\/\/|sent from|^\+?\d[\d \-().]{6,}$/i.test(
          seg,
        )
      if (looksBloat) {
        return {
          preBloat: htmlAfterClosing.slice(0, cursor),
          bloat: htmlAfterClosing.slice(cursor),
        }
      }
      {
        const off = mm.index + mm[0].length
        return {
          preBloat: htmlAfterClosing.slice(0, off),
          bloat: htmlAfterClosing.slice(off),
        }
      }
    }
    cursor = mm.index + mm[0].length
  }
  return { preBloat: htmlAfterClosing, bloat: '' }
}

function tryFoldHintSig(html: string, hintSig: string): string | null {
  if (!html || !hintSig || typeof hintSig !== 'string') return null
  if (hintSig.length < 20) return null
  const lines = hintSig
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  const closingsRe =
    /^(?:Best regards|Best wishes|Kind regards|Yours (?:truly|sincerely|faithfully)|Sincerely|Cheers|Thanks|Thank you|Regards|Warm regards|Many thanks|Take care)[,!.\s]*$/i
  const anchor = (
    lines.find((l) => l.length >= 8 && !closingsRe.test(l)) ||
    lines[0] ||
    ''
  ).trim()
  if (anchor.length < 8) return null

  const plain: string[] = []
  const map: number[] = []
  let i = 0
  while (i < html.length) {
    if (html[i] === '<') {
      if (/^<br\s*\/?\s*>/i.test(html.slice(i, i + 6))) {
        plain.push('\n')
        map.push(i)
        const e = html.indexOf('>', i)
        i = e + 1
        continue
      }
      const e = html.indexOf('>', i)
      if (e < 0) break
      i = e + 1
      continue
    }
    if (html[i] === '&') {
      const semi = html.indexOf(';', i)
      if (semi > 0 && semi - i < 8) {
        const ent = html.slice(i + 1, semi)
        const dec: Record<string, string> = {
          nbsp: ' ',
          amp: '&',
          lt: '<',
          gt: '>',
          quot: '"',
          apos: "'",
        }
        if (ent in dec) {
          plain.push(dec[ent])
          map.push(i)
          i = semi + 1
          continue
        }
      }
    }
    plain.push(html[i])
    map.push(i)
    i++
  }
  const plainStr = plain.join('')
  const idx = plainStr.lastIndexOf(anchor)
  if (idx < 0) return null
  const htmlStart = map[idx]
  if (htmlStart == null) return null
  const before = html.slice(0, htmlStart)
  const sigSection = html.slice(htmlStart)
  if (!isBloatedSig(sigSection)) return null
  return (
    before +
    '<details class="email-sig-fold">' +
    foldSummary('Signature', '') +
    sigSection +
    '</details>'
  )
}

/** Fold trailing signature / disclaimer blocks in HTML email bodies. */
export function foldSignature(html: string, hintSig?: string | null): string {
  if (!html || typeof html !== 'string') return html
  if (html.length > 80_000) return html
  if (hintSig) {
    const wrapped = tryFoldHintSig(html, hintSig)
    if (wrapped !== null) return wrapped
  }

  const wrap = (before: string, marker: string, rest: string) => {
    if (!isBloatedSig(rest)) return html
    return (
      before +
      (marker || '') +
      '<details class="email-sig-fold">' +
      foldSummary('Signature', '') +
      rest +
      '</details>'
    )
  }

  let m = html.match(/<div[^>]*class=["'][^"']*\bgmail_signature\b[^"']*["'][\s\S]*$/i)
  if (m) return wrap(html.slice(0, html.length - m[0].length), '', m[0])
  m = html.match(/<div[^>]*data-smartmail=["']gmail_signature["'][\s\S]*$/i)
  if (m) return wrap(html.slice(0, html.length - m[0].length), '', m[0])
  m = html.match(/<div[^>]*id=["'](?:Signature|signature|divRplyFwdMsg)["'][\s\S]*$/i)
  if (m) return wrap(html.slice(0, html.length - m[0].length), '', m[0])

  m = html.match(/(<br\s*\/?>|\n)\s*--\s*(<br\s*\/?>|\n)([\s\S]*)$/i)
  if (m) {
    const idx = html.lastIndexOf(m[0])
    return wrap(html.slice(0, idx), m[1], m[3])
  }

  const blockBoundary =
    '(?:<br\\s*/?>|<\\/p>|<\\/div>|<\\/li>|<p[^>]*>|<div[^>]*>|<span[^>]*>|\\n)'
  const closings =
    '(?:Best regards|Best wishes|Kind regards|Yours truly|Yours sincerely|Yours faithfully|Best,|Best\\s|Cheers,|Cheers\\s|Thanks,|Thanks\\s|Thank you,|Regards,|Regards\\s|Sincerely[, ]|Warm regards|Many thanks|Talk soon|Take care)'
  m = html.match(new RegExp(`(${blockBoundary})\\s*(${closings})([\\s\\S]+)$`, 'i'))
  if (m) {
    const idx = html.lastIndexOf(m[0])
    const boundary = m[1]
    const closing = m[2]
    const after = m[3]
    const { preBloat, bloat } = peelSigNameLine(after)
    if (!isBloatedSig(bloat)) return html
    return (
      html.slice(0, idx) +
      boundary +
      closing +
      preBloat +
      '<details class="email-sig-fold">' +
      foldSummary('Signature', '') +
      bloat +
      '</details>'
    )
  }

  m = html.match(
    new RegExp(
      `(${blockBoundary})\\s*((?:Sent from my (?:iPhone|iPad|Android|Galaxy|Pixel|phone|mobile)|Get Outlook for (?:iOS|Android))[\\s\\S]*)$`,
      'i',
    ),
  )
  if (m) {
    const idx = html.lastIndexOf(m[0])
    return wrap(html.slice(0, idx), m[1], m[2])
  }

  m = html.match(
    new RegExp(
      `(${blockBoundary})\\s*((?:CONFIDENTIALITY NOTICE|DISCLAIMER|This e-?mail (?:is confidential|may contain confidential)|The information (?:contained )?in this e-?mail|This message and any attachments)[\\s\\S]*)$`,
      'i',
    ),
  )
  if (m) {
    const idx = html.lastIndexOf(m[0])
    return wrap(html.slice(0, idx), m[1], m[2])
  }

  return html
}
