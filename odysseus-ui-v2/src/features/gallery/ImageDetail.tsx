import {
  Download,
  Heart,
  Loader2,
  Pencil,
  RotateCcw,
  RotateCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { GalleryImage } from '@/api/gallery'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  humanFileSize,
  imageLabel,
  isVideoUrl,
  mergeTags,
} from '@/lib/galleryHelpers'

type ImageDetailProps = {
  image: GalleryImage | null
  isAiTagging?: boolean
  isRotating?: boolean
  isRenaming?: boolean
  onClose: () => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
  onAiTag: (id: string) => void
  onClearAiTags: (id: string) => void
  onEdit?: (id: string) => void
  onRotate?: (id: string, angle: 90 | -90) => void
  onRename?: (id: string, name: string) => void
  onTagFilter?: (tag: string) => void
}

export function ImageDetail({
  image,
  isAiTagging,
  isRotating,
  isRenaming,
  onClose,
  onDelete,
  onToggleFavorite,
  onAiTag,
  onClearAiTags,
  onEdit,
  onRotate,
  onRename,
  onTagFilter,
}: ImageDetailProps) {
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  if (!image) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
        Select a photo to view details.
      </div>
    )
  }

  const label = imageLabel(image)
  const video = isVideoUrl(image.url)
  const tags = mergeTags(image.user_tags || image.tags, image.ai_tags)
  const dims =
    image.width && image.height ? `${image.width} × ${image.height}` : null
  const size = humanFileSize(image.file_size)
  const dateSrc = image.taken_at || image.created_at

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = image.url
    a.download = image.filename
    a.click()
  }

  const handleDelete = () => {
    if (!window.confirm('Delete this photo?')) return
    onDelete(image.id)
    onClose()
  }

  const startRename = () => {
    setRenameValue(label)
    setRenaming(true)
  }

  const submitRename = () => {
    const name = renameValue.trim()
    if (!name || !onRename) {
      setRenaming(false)
      return
    }
    onRename(image.id, name)
    setRenaming(false)
  }

  return (
    <div className="flex h-full flex-col" data-testid="gallery-image-detail">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        {renaming ? (
          <form
            className="flex min-w-0 flex-1 gap-1"
            onSubmit={(e) => {
              e.preventDefault()
              submitRename()
            }}
          >
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              aria-label="Rename photo"
            />
            <Button type="submit" size="sm" disabled={isRenaming}>
              Save
            </Button>
          </form>
        ) : (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline"
            title="Click to rename"
            onClick={startRename}
            disabled={!onRename}
          >
            {label}
          </button>
        )}
        {!video && onEdit ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Edit in canvas editor"
            onClick={() => onEdit(image.id)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', image.favorite && 'text-primary')}
          aria-label={image.favorite ? 'Unfavorite' : 'Favorite'}
          aria-pressed={image.favorite}
          onClick={() => onToggleFavorite(image.id)}
        >
          <Heart className={cn('h-4 w-4', image.favorite && 'fill-current')} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Download"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          aria-label="Delete photo"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="relative bg-background p-3">
          {video ? (
            <video
              src={image.url}
              controls
              className="mx-auto max-h-[50vh] w-full rounded-md object-contain"
            />
          ) : (
            <>
              <img
                src={image.url}
                alt={label}
                className="mx-auto max-h-[50vh] w-full rounded-md object-contain"
              />
              {onRotate ? (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-5 top-1/2 h-8 w-8 -translate-y-1/2 opacity-80"
                    aria-label="Rotate counter-clockwise"
                    disabled={isRotating}
                    onClick={() => onRotate(image.id, -90)}
                  >
                    {isRotating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-5 top-1/2 h-8 w-8 -translate-y-1/2 opacity-80"
                    aria-label="Rotate clockwise"
                    disabled={isRotating}
                    onClick={() => onRotate(image.id, 90)}
                  >
                    {isRotating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCw className="h-4 w-4" />
                    )}
                  </Button>
                </>
              ) : null}
            </>
          )}
        </div>

        <div className="space-y-4 p-4 text-sm">
          <DetailRow label="Model" value={image.model ?? '—'} />
          {image.session_name ? (
            <DetailRow label="Session" value={image.session_name} />
          ) : null}
          {dateSrc ? (
            <DetailRow label="Date" value={new Date(dateSrc).toLocaleString()} />
          ) : null}
          {dims ? <DetailRow label="Dimensions" value={dims} /> : null}
          {size ? <DetailRow label="File size" value={size} /> : null}
          {image.camera ? <DetailRow label="Camera" value={image.camera} /> : null}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Tags</span>
              <Button
                variant="outline"
                size="sm"
                disabled={isAiTagging}
                onClick={() =>
                  image.ai_tags ? onClearAiTags(image.id) : onAiTag(image.id)
                }
              >
                {isAiTagging ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                )}
                {image.ai_tags ? 'Clear AI tags' : 'AI tag'}
              </Button>
            </div>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="rounded-full border border-border bg-panel px-2 py-0.5 text-xs hover:border-primary"
                    onClick={() => onTagFilter?.(tag)}
                    title={`Filter by ${tag}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">No tags yet.</p>
            )}
          </div>

          {image.prompt && image.prompt !== label ? (
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Prompt</span>
              <p className="mt-1 text-sm whitespace-pre-wrap">{image.prompt}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <p className="mt-0.5">{value}</p>
    </div>
  )
}
