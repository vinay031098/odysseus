import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OpenTab } from './types'

type DocumentTabsProps = {
  tabs: OpenTab[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export function DocumentTabs({ tabs, activeId, onSelect, onClose }: DocumentTabsProps) {
  if (tabs.length === 0) return null

  return (
    <div
      className="flex shrink-0 gap-0 overflow-x-auto border-b border-border bg-panel"
      role="tablist"
      aria-label="Open documents"
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tab"
          aria-selected={activeId === tab.id}
          className={cn(
            'group flex max-w-[200px] shrink-0 items-center gap-1 border-r border-border px-3 py-2 text-sm',
            activeId === tab.id ? 'bg-background' : 'hover:bg-background/60',
          )}
        >
          <button
            type="button"
            onClick={() => onSelect(tab.id)}
            className="min-w-0 flex-1 truncate text-left"
          >
            {tab.title?.trim() || 'Untitled'}
            {tab.dirty ? ' *' : ''}
          </button>
          <button
            type="button"
            className="rounded p-0.5 opacity-50 hover:bg-panel hover:opacity-100"
            aria-label={`Close ${tab.title || 'document'}`}
            onClick={(e) => {
              e.stopPropagation()
              onClose(tab.id)
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
