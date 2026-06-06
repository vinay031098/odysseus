import type { ChatMessage } from '@/api/types'

export interface MessageVariant {
  content: string
  label: string
}

export function parseVariants(metadata?: Record<string, unknown>): MessageVariant[] {
  const raw = metadata?.variants
  if (!Array.isArray(raw)) return []
  return raw
    .map((v) => {
      if (typeof v === 'object' && v && ('content' in v || 'raw' in v)) {
        const item = v as { content?: unknown; label?: unknown; raw?: unknown }
        const content =
          typeof item.content === 'string'
            ? item.content
            : typeof item.raw === 'string'
              ? item.raw
              : ''
        const label = typeof item.label === 'string' ? item.label : 'variant'
        return content ? { content, label } : null
      }
      return null
    })
    .filter((v): v is MessageVariant => v !== null)
}

export function getVariantIndex(metadata?: Record<string, unknown>, fallback = 0): number {
  const idx = metadata?.variantIndex
  return typeof idx === 'number' && idx >= 0 ? idx : fallback
}

export function variantLabelText(label: string): string {
  if (label === 'original') return 'Original'
  if (label === 'shorter') return 'Shorter'
  if (label.startsWith('v')) return label.toUpperCase()
  return label
}

export function serializeVariants(variants: MessageVariant[]) {
  return variants.map((v) => ({ raw: v.content, label: v.label }))
}

/** Apply saved variant content when loading history (chatRenderer parity). */
export function hydrateMessagesWithVariants(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((msg) => {
    if (msg.role !== 'assistant') return msg
    const variants = parseVariants(msg.metadata)
    if (variants.length < 2) return msg
    const idx = getVariantIndex(msg.metadata, variants.length - 1)
    const chosen = variants[idx]
    if (!chosen) return msg
    return { ...msg, content: chosen.content }
  })
}

export function nextVariantLabel(existingCount: number): string {
  if (existingCount === 0) return 'original'
  return `v${existingCount}`
}
