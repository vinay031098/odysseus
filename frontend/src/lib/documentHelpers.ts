/** Helpers for document library preview and display */

const PDF_SOURCE_RE = /<!--\s*pdf_(?:form_)?source\s+upload_id="[^"]+"/

export function isPdfDocument(content: string): boolean {
  return PDF_SOURCE_RE.test(content)
}

export function shouldRenderMarkdown(language: string | null | undefined): boolean {
  const lang = (language || 'text').toLowerCase()
  return lang === 'markdown' || lang === 'text' || lang === 'email'
}

export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return ''
  const then = new Date(isoString).getTime()
  if (Number.isNaN(then)) return ''
  const diffS = Math.floor((Date.now() - then) / 1000)
  if (diffS < 60) return 'just now'
  const diffM = Math.floor(diffS / 60)
  if (diffM < 60) return `${diffM}m ago`
  const diffH = Math.floor(diffM / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'yesterday'
  if (diffD < 14) return `${diffD}d ago`
  const diffW = Math.floor(diffD / 7)
  if (diffW < 8) return `${diffW}w ago`
  return new Date(isoString).toLocaleDateString()
}
