import type { GalleryImage } from '@/api/gallery'

const STORAGE_KEY = 'odysseus-gallery-manual-order'

export function loadGalleryManualOrder(scope: string): string[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${scope}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveGalleryManualOrder(scope: string, ids: string[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}:${scope}`, JSON.stringify(ids))
  } catch {
    /* quota */
  }
}

/** Reorder items using saved manual order; unknown ids append in original order. */
export function applyGalleryManualOrder(
  items: GalleryImage[],
  savedOrder: string[],
): GalleryImage[] {
  if (!savedOrder.length) return items
  const byId = new Map(items.map((i) => [i.id, i]))
  const out: GalleryImage[] = []
  for (const id of savedOrder) {
    const item = byId.get(id)
    if (item) {
      out.push(item)
      byId.delete(id)
    }
  }
  for (const item of items) {
    if (byId.has(item.id)) out.push(item)
  }
  return out
}

export function reorderGalleryIds(ids: string[], fromId: string, toId: string): string[] {
  if (fromId === toId) return ids
  const next = [...ids]
  const fromIdx = next.indexOf(fromId)
  const toIdx = next.indexOf(toId)
  if (fromIdx < 0 || toIdx < 0) return ids
  next.splice(fromIdx, 1)
  next.splice(toIdx, 0, fromId)
  return next
}

export function galleryOrderScope(album: string | undefined, sort: string): string {
  return `${album ?? 'all'}:${sort}`
}
