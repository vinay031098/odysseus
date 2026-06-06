import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { EditorDraftSummary } from '@/api/editorDrafts'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EditorDraftsStripProps = {
  drafts: EditorDraftSummary[]
  isLoading?: boolean
  selectMode?: boolean
  selectedIds?: Set<string>
  onOpen: (draft: EditorDraftSummary) => void
  onToggleSelect?: (id: string) => void
  onDeleteSelected?: () => void
  onEnterSelect?: () => void
  onNewCanvas?: () => void
}

export function EditorDraftsStrip({
  drafts,
  isLoading,
  selectMode,
  selectedIds,
  onOpen,
  onToggleSelect,
  onDeleteSelected,
  onEnterSelect,
  onNewCanvas,
}: EditorDraftsStripProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Loading drafts…
      </div>
    )
  }

  if (!drafts.length && !onNewCanvas) return null

  return (
    <div className="border-b border-border" data-testid="gallery-editor-drafts">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Editor</span>
        {onNewCanvas ? (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onNewCanvas}>
            <Plus className="h-3 w-3" aria-hidden />
            New canvas
          </Button>
        ) : null}
        {onEnterSelect ? (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEnterSelect}>
            Select
          </Button>
        ) : null}
        {selectMode && selectedIds && selectedIds.size > 0 && onDeleteSelected ? (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={onDeleteSelected}>
            <Trash2 className="h-3 w-3" aria-hidden />
            Delete ({selectedIds.size})
          </Button>
        ) : null}
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {drafts.map((draft) => {
          const selected = selectedIds?.has(draft.id)
          return (
            <button
              key={draft.id}
              type="button"
              className={cn(
                'w-24 shrink-0 rounded-md border border-border bg-panel text-left text-xs hover:border-primary',
                selectMode && selected && 'ring-2 ring-primary',
              )}
              onClick={() => {
                if (selectMode && onToggleSelect) onToggleSelect(draft.id)
                else onOpen(draft)
              }}
            >
              {draft.thumbnail ? (
                <img src={draft.thumbnail} alt="" className="aspect-square w-full rounded-t-md object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-background text-muted">Draft</div>
              )}
              <div className="truncate px-1.5 py-1">{draft.name}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
