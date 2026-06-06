import { Loader2, RotateCcw } from 'lucide-react'
import type { DocumentVersion } from '@/api/documents'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/documentHelpers'
import { cn } from '@/lib/utils'

type VersionHistoryPanelProps = {
  open: boolean
  onClose: () => void
  versions: DocumentVersion[] | undefined
  isLoading?: boolean
  onRestore: (versionNumber: number) => void
  isRestoring?: boolean
  onPreview?: (content: string) => void
}

export function VersionHistoryPanel({
  open,
  onClose,
  versions,
  isLoading,
  onRestore,
  isRestoring,
  onPreview,
}: VersionHistoryPanelProps) {
  if (!open) return null

  return (
    <div className="absolute right-4 top-14 z-20 w-80 rounded-lg border border-border bg-background shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium">Version history</span>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {isLoading ? (
          <p className="flex items-center gap-2 p-3 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </p>
        ) : !versions?.length ? (
          <p className="p-3 text-sm text-muted">No versions yet.</p>
        ) : (
          <ul className="space-y-2">
            {versions.map((v, i) => (
              <li
                key={v.id}
                className={cn(
                  'rounded-md border border-border p-2 text-sm',
                  i === 0 && 'border-primary/40 bg-primary/5',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">v{v.version_number}</span>
                  {i === 0 ? (
                    <span className="text-xs text-primary">latest</span>
                  ) : (
                    <span className="text-xs text-muted">
                      {v.source} · {formatRelativeTime(v.created_at)}
                    </span>
                  )}
                </div>
                {v.summary ? <p className="mt-1 text-xs text-muted">{v.summary}</p> : null}
                <div className="mt-2 flex gap-2">
                  {onPreview ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPreview(v.content)}
                    >
                      Preview
                    </Button>
                  ) : null}
                  {i > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isRestoring}
                      onClick={() => onRestore(v.version_number)}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Restore
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
