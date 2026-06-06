const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'mkv', 'm4v'])
const MEDIA_EXTS = new Set([
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  ...VIDEO_EXTS,
])

export function isVideoUrl(url: string): boolean {
  const ext = (url || '').toLowerCase().split('?')[0].split('.').pop() ?? ''
  return VIDEO_EXTS.has(ext)
}

export function isMediaFile(file: File): boolean {
  const t = (file.type || '').toLowerCase()
  if (t.startsWith('image/') || t.startsWith('video/')) return true
  const ext = (file.name || '').toLowerCase().split('.').pop() ?? ''
  return MEDIA_EXTS.has(ext)
}

export function humanFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`
}

export function parseTagList(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function imageLabel(img: { prompt?: string | null; filename?: string }): string {
  const name = (img.prompt || '').trim()
  if (name) return name
  const base = (img.filename || '').split('.')[0] ?? 'Untitled'
  return base || 'Untitled'
}

export function mergeTags(userTags: string, aiTags: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of [...parseTagList(userTags), ...parseTagList(aiTags)]) {
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}
