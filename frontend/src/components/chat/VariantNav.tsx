import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getVariantIndex, parseVariants, variantLabelText } from '@/lib/messageVariants'
import type { ChatMessage } from '@/api/types'

interface VariantNavProps {
  message: ChatMessage
  onSwitch: (index: number) => void
}

export function VariantNav({ message, onSwitch }: VariantNavProps) {
  const variants = parseVariants(message.metadata)
  if (variants.length < 2) return null
  const current = getVariantIndex(message.metadata, variants.length - 1)

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <span className="rounded bg-muted px-1.5 py-0.5">
        {variantLabelText(variants[current]?.label ?? 'variant')}
      </span>
      <span className="text-muted-foreground/60">|</span>
      <button
        type="button"
        className="rounded p-0.5 hover:bg-muted disabled:opacity-40"
        disabled={current <= 0}
        onClick={() => onSwitch(current - 1)}
        aria-label="Previous variant"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span>
        {current + 1} / {variants.length}
      </span>
      <button
        type="button"
        className="rounded p-0.5 hover:bg-muted disabled:opacity-40"
        disabled={current >= variants.length - 1}
        onClick={() => onSwitch(current + 1)}
        aria-label="Next variant"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
