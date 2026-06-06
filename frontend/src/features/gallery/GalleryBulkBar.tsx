import { Download, Heart, Tag, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type GalleryBulkBarProps = {
  count: number
  total: number
  allSelected: boolean
  onToggleAll: (checked: boolean) => void
  onFavorite: () => void
  onAddTag: () => void
  onDownload: () => void
  onDelete: () => void
  onCancel: () => void
  busy?: boolean
}

export function GalleryBulkBar({
  count,
  total,
  allSelected,
  onToggleAll,
  onFavorite,
  onAddTag,
  onDownload,
  onDelete,
  onCancel,
  busy,
}: GalleryBulkBarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-border bg-panel px-4 py-2 text-sm"
      data-testid="gallery-bulk-bar"
    >
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => onToggleAll(e.target.checked)}
          aria-label="Select all photos"
        />
        All
      </label>
      <span className="text-muted">{count} selected</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={!count || busy} onClick={onFavorite}>
          <Heart className="h-3.5 w-3.5" aria-hidden />
          Favorite
        </Button>
        <Button variant="secondary" size="sm" disabled={!count || busy} onClick={onAddTag}>
          <Tag className="h-3.5 w-3.5" aria-hidden />
          Add tag
        </Button>
        <Button variant="secondary" size="sm" disabled={!count || busy} onClick={onDownload}>
          <Download className="h-3.5 w-3.5" aria-hidden />
          Download
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="text-destructive"
          disabled={!count || busy}
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Delete
        </Button>
        <Button
          id="gallery-bulk-cancel"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Cancel selection"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {total > 0 && count === 0 ? (
        <span className="sr-only">No photos selected of {total}</span>
      ) : null}
    </div>
  )
}
