import { Archive, FileText, Trash2 } from 'lucide-react'
import type { Document } from '@/api/documents'
import { documentRenderPdfUrl } from '@/api/documents'
import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { Button } from '@/components/ui/button'
import {
  formatRelativeTime,
  isPdfDocument,
  shouldRenderMarkdown,
} from '@/lib/documentHelpers'

type DocumentViewerProps = {
  document: Document | null | undefined
  archived: boolean
  isLoading?: boolean
  onDelete: (id: string) => void
  onArchive: (id: string, archived: boolean) => void
}

export function DocumentViewer({
  document: doc,
  archived,
  isLoading,
  onDelete,
  onArchive,
}: DocumentViewerProps) {
  if (isLoading) {
    return <ViewerState message="Loading document…" />
  }

  if (!doc) {
    return (
      <ViewerState
        icon={<FileText className="h-10 w-10 text-muted" aria-hidden />}
        message="Select a document to preview"
      />
    )
  }

  const content = doc.current_content || ''
  const lang = doc.language || 'text'
  const pdf = isPdfDocument(content)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{doc.title?.trim() || 'Untitled'}</h2>
          <p className="mt-1 text-xs text-muted">
            {lang}
            {doc.version_count ? ` · ${doc.version_count} version${doc.version_count !== 1 ? 's' : ''}` : ''}
            {doc.updated_at ? ` · ${formatRelativeTime(doc.updated_at)}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onArchive(doc.id, !archived)}
            aria-label={archived ? 'Restore document' : 'Archive document'}
          >
            <Archive className="mr-1 h-3.5 w-3.5" aria-hidden />
            {archived ? 'Restore' : 'Archive'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => onDelete(doc.id)}
            aria-label="Delete document"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
            Delete
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {pdf ? (
          <iframe
            title={`PDF preview: ${doc.title || 'document'}`}
            src={documentRenderPdfUrl(doc.id)}
            className="h-[min(70vh,800px)] w-full rounded-md border border-border bg-background"
          />
        ) : shouldRenderMarkdown(lang) ? (
          <MarkdownMessage content={content} />
        ) : (
          <pre className="overflow-x-auto rounded-md bg-panel p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>
    </div>
  )
}

function ViewerState({
  message,
  icon,
}: {
  message: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted">
      {icon}
      <p>{message}</p>
    </div>
  )
}
