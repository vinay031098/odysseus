import type { ComponentType } from 'react'
import { FolderPlus, Heart, Images, Trash2, Upload } from 'lucide-react'
import type { GalleryAlbum } from '@/api/gallery'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type AlbumFilter = 'all' | 'favorites' | string

type AlbumSidebarProps = {
  albums: GalleryAlbum[]
  activeFilter: AlbumFilter
  totalPhotos: number
  onFilterChange: (filter: AlbumFilter) => void
  onCreateAlbum: () => void
  onDeleteAlbum: (id: string) => void
  onUploadAlbum?: () => void
}

export function AlbumSidebar({
  albums,
  activeFilter,
  totalPhotos,
  onFilterChange,
  onCreateAlbum,
  onDeleteAlbum,
  onUploadAlbum,
}: AlbumSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-semibold">Gallery</h2>
        <p className="mt-1 text-xs text-muted">{totalPhotos} photos</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <FilterButton
          active={activeFilter === 'all'}
          onClick={() => onFilterChange('all')}
          icon={Images}
          label="All photos"
          count={totalPhotos}
        />
        <FilterButton
          active={activeFilter === 'favorites'}
          onClick={() => onFilterChange('favorites')}
          icon={Heart}
          label="Favorites"
        />

        <div className="pt-3 pb-1 px-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Albums
          </span>
          <div className="flex gap-0.5">
            {onUploadAlbum ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Upload album from folder"
                title="Upload album from folder"
                onClick={onUploadAlbum}
              >
                <Upload className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Create album"
              onClick={onCreateAlbum}
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {albums.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted">No albums yet.</p>
        ) : (
          albums.map((album) => (
            <div key={album.id} className="group flex items-center gap-1">
              <FilterButton
                active={activeFilter === album.id}
                onClick={() => onFilterChange(album.id)}
                coverUrl={album.cover_url}
                label={album.name}
                count={album.count}
                className="flex-1 min-w-0"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-destructive"
                aria-label={`Delete album ${album.name}`}
                onClick={() => onDeleteAlbum(album.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  icon: Icon,
  coverUrl,
  label,
  count,
  className,
}: {
  active: boolean
  onClick: () => void
  icon?: ComponentType<{ className?: string }>
  coverUrl?: string | null
  label: string
  count?: number
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-panel',
        active && 'bg-panel font-medium',
        className,
      )}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded object-cover bg-panel"
        />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      ) : (
        <span className="h-8 w-8 shrink-0 rounded bg-panel" />
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null ? (
        <span className="shrink-0 text-xs text-muted">{count}</span>
      ) : null}
    </button>
  )
}
