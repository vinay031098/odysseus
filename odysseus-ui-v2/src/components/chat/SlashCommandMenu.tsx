import { useEffect, useMemo, useRef } from 'react'
import type { SlashCommandItem } from '@/lib/slashCommands'
import { cn } from '@/lib/utils'

interface SlashCommandMenuProps {
  items: SlashCommandItem[]
  activeIndex: number
  onSelect: (item: SlashCommandItem) => void
  onHover: (index: number) => void
  query?: string
}

export function SlashCommandMenu({
  items,
  activeIndex,
  onSelect,
  onHover,
  query,
}: SlashCommandMenuProps) {
  const listRef = useRef<HTMLUListElement>(null)

  const flatIndexByItem = useMemo(() => {
    const map = new Map<SlashCommandItem, number>()
    items.forEach((item, i) => map.set(item, i))
    return map
  }, [items])

  const grouped = useMemo(() => {
    const groups: { category: string; items: SlashCommandItem[] }[] = []
    const seen = new Map<string, number>()
    for (const item of items) {
      const cat = item.category || 'Other'
      const idx = seen.get(cat)
      if (idx === undefined) {
        seen.set(cat, groups.length)
        groups.push({ category: cat, items: [item] })
      } else {
        groups[idx].items.push(item)
      }
    }
    return groups
  }, [items])

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]') as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!items.length) {
    return query && query.length > 1 ? (
      <div className="absolute bottom-full left-0 right-0 z-20 mb-2 rounded-lg border border-border bg-panel px-3 py-2 text-xs text-muted shadow-lg">
        No commands match <code className="text-foreground">{query}</code>
      </div>
    ) : null
  }

  let rowIndex = 0

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label="Slash commands"
      className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-panel py-1 shadow-lg"
    >
      {grouped.map((group) => (
        <li key={group.category} role="presentation">
          <div className="sticky top-0 z-10 bg-panel/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {group.category}
          </div>
          {group.items.map((item) => {
            const index = flatIndexByItem.get(item) ?? rowIndex
            rowIndex += 1
            const isActive = index === activeIndex
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isActive}
                data-active={isActive ? 'true' : undefined}
                className={cn(
                  'flex w-full items-start gap-3 px-3 py-2 text-left text-sm',
                  isActive ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/60',
                )}
                onMouseEnter={() => onHover(index)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelect(item)
                }}
              >
                <span className="shrink-0 font-mono text-xs text-primary">{item.label}</span>
                {item.description ? (
                  <span className="min-w-0 truncate text-xs text-muted">{item.description}</span>
                ) : null}
              </button>
            )
          })}
        </li>
      ))}
    </ul>
  )
}
