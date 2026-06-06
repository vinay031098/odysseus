import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type TagFilterChipsProps = {
  availableTags: string[]
  activeTags: string[]
  onToggleTag: (tag: string) => void
  onClearTag: (tag: string) => void
}

export function TagFilterChips({
  availableTags,
  activeTags,
  onToggleTag,
  onClearTag,
}: TagFilterChipsProps) {
  if (!availableTags.length && !activeTags.length) return null

  const inactive = availableTags.filter(
    (t) => !activeTags.some((a) => a.toLowerCase() === t.toLowerCase()),
  )

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2" data-testid="gallery-tag-filters">
      {activeTags.map((tag) => (
        <span
          key={`active-${tag}`}
          className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-2 py-0.5 text-xs"
        >
          #{tag}
          <button
            type="button"
            className="rounded hover:text-destructive"
            aria-label={`Remove tag filter ${tag}`}
            onClick={() => onClearTag(tag)}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {inactive.slice(0, 12).map((tag) => (
        <button
          key={tag}
          type="button"
          className={cn(
            'rounded-full border border-border bg-panel px-2 py-0.5 text-xs hover:border-primary',
          )}
          onClick={() => onToggleTag(tag)}
        >
          #{tag}
        </button>
      ))}
    </div>
  )
}
