import { Heart, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { GalleryImage } from '@/api/gallery'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { imageLabel, isVideoUrl } from '@/lib/galleryHelpers'

type GalleryGridProps = {
  items: GalleryImage[]
  selectedId: string | null
  selectMode?: boolean
  selectedIds?: Set<string>
  isLoading?: boolean
  hasMore?: boolean
  reorderEnabled?: boolean
  onSelect: (id: string) => void
  onToggleSelect?: (id: string) => void
  onToggleFavorite: (id: string) => void
  onReorder?: (orderedIds: string[]) => void
  onLoadMore?: () => void
  onDropFiles?: (files: File[]) => void
  onDropDataTransfer?: (dt: DataTransfer) => void
}

export function GalleryGrid({
  items,
  selectedId,
  selectMode,
  selectedIds,
  isLoading,
  hasMore,
  reorderEnabled,
  onSelect,
  onToggleSelect,
  onToggleFavorite,
  onReorder,
  onLoadMore,
  onDropFiles,
  onDropDataTransfer,
}: GalleryGridProps) {
  const [dragOver, setDragOver] = useState(false)
  const [dragTileId, setDragTileId] = useState<string | null>(null)

  const handleTileDrop = (targetId: string) => {
    if (!onReorder || !dragTileId || dragTileId === targetId) return
    const ids = items.map((i) => i.id)
    const fromIdx = ids.indexOf(dragTileId)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx < 0 || toIdx < 0) return
    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, dragTileId)
    onReorder(ids)
    setDragTileId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!onDropFiles && !onDropDataTransfer) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    if (!onDropFiles && !onDropDataTransfer) return
    e.preventDefault()
    setDragOver(false)
    if (onDropDataTransfer) {
      onDropDataTransfer(e.dataTransfer)
      return
    }
    const files = [...e.dataTransfer.files]
    if (files.length && onDropFiles) onDropFiles(files)
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        Loading photos…
      </div>
    )
  }

  if (!isLoading && items.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-2 p-8 text-sm text-muted transition-colors',
          dragOver && 'bg-primary/5 ring-2 ring-inset ring-primary',
        )}
        data-testid="gallery-drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>No photos yet.</p>
        {onDropFiles ? <p className="text-xs">Drop images here or use Upload.</p> : null}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div
        className={cn(
          'relative flex-1 overflow-y-auto p-4 transition-colors',
          dragOver && 'bg-primary/5',
        )}
        data-testid="gallery-grid"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragOver ? (
          <div className="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 text-sm font-medium text-primary">
            Drop to upload
          </div>
        ) : null}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
          {items.map((img) => (
            <GalleryTile
              key={img.id}
              image={img}
              selected={selectedId === img.id}
              bulkSelected={selectedIds?.has(img.id)}
              selectMode={selectMode}
              reorderEnabled={reorderEnabled && !selectMode}
              dragActive={dragTileId === img.id}
              onDragStart={() => setDragTileId(img.id)}
              onDragEnd={() => setDragTileId(null)}
              onDrop={() => handleTileDrop(img.id)}
              onSelect={() => {
                if (selectMode && onToggleSelect) onToggleSelect(img.id)
                else onSelect(img.id)
              }}
              onToggleFavorite={() => onToggleFavorite(img.id)}
            />
          ))}
        </div>
        {hasMore ? (
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" size="sm" onClick={onLoadMore} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Loading…
                </>
              ) : (
                'Load more'
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function GalleryTile({
  image,
  selected,
  bulkSelected,
  selectMode,
  reorderEnabled,
  dragActive,
  onDragStart,
  onDragEnd,
  onDrop,
  onSelect,
  onToggleFavorite,
}: {
  image: GalleryImage
  selected: boolean
  bulkSelected?: boolean
  selectMode?: boolean
  reorderEnabled?: boolean
  dragActive?: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDrop: () => void
  onSelect: () => void
  onToggleFavorite: () => void
}) {
  const label = imageLabel(image)
  const video = isVideoUrl(image.url)

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border bg-panel',
        (selected || bulkSelected) && 'ring-2 ring-primary',
        dragActive && 'opacity-50',
      )}
      data-testid="gallery-tile"
      draggable={reorderEnabled}
      onDragStart={(e) => {
        if (!reorderEnabled) return
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (!reorderEnabled) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        if (!reorderEnabled) return
        e.preventDefault()
        e.stopPropagation()
        onDrop()
      }}
    >
      {selectMode ? (
        <div className="absolute left-1.5 top-1.5 z-10">
          <input
            type="checkbox"
            checked={!!bulkSelected}
            onChange={onSelect}
            aria-label={`Select ${label}`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        className="block w-full text-left focus-visible:outline-none"
        aria-label={`View ${label}`}
      >
        <div className="aspect-square overflow-hidden bg-background">
          {video ? (
            <video
              src={image.url}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={image.url}
              alt={label}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
        </div>
        <div className="truncate px-2 py-1.5 text-xs">{label}</div>
      </button>
      {!selectMode ? (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute right-1 top-1 h-7 w-7 bg-background/70 opacity-0 group-hover:opacity-100',
            image.favorite && 'opacity-100 text-primary',
          )}
          aria-label={image.favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={image.favorite}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
        >
          <Heart className={cn('h-3.5 w-3.5', image.favorite && 'fill-current')} />
        </Button>
      ) : null}
    </div>
  )
}
