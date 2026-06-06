import { useRef } from 'react'
import { Archive, CheckSquare, FileUp, Loader2, Plus, Sparkles, Square, Trash2 } from 'lucide-react'
import type { DocumentSummary } from '@/api/documents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatRelativeTime } from '@/lib/documentHelpers'
import { IMPORT_ACCEPT } from '@/lib/documentImport'
import { LangIcon } from '@/lib/langIcons'
import { cn } from '@/lib/utils'

type DocumentListProps = {
  documents: DocumentSummary[]
  total: number
  languages: Record<string, number>
  selectedId: string | null
  search: string
  sort: 'recent' | 'oldest' | 'edits' | 'alpha'
  languageFilter: string | null
  archived: boolean
  isLoading?: boolean
  bulkMode?: boolean
  bulkSelected?: Set<string>
  onBulkToggle?: () => void
  onBulkSelect?: (id: string, selected: boolean) => void
  onSearchChange: (value: string) => void
  onSortChange: (sort: 'recent' | 'oldest' | 'edits' | 'alpha') => void
  onLanguageFilter: (lang: string | null) => void
  onArchivedToggle: (archived: boolean) => void
  onSelect: (id: string) => void
  onCreate: () => void
  onCreateCanvas?: () => void
  onImportFiles?: (files: File[]) => void
  onTidy?: () => void
  isImporting?: boolean
  isTidying?: boolean
  onDelete: (id: string) => void
  onArchive: (id: string, archived: boolean) => void
}

export function DocumentList({
  documents,
  total,
  languages,
  selectedId,
  search,
  sort,
  languageFilter,
  archived,
  isLoading,
  bulkMode,
  bulkSelected,
  onBulkToggle,
  onBulkSelect,
  onSearchChange,
  onSortChange,
  onLanguageFilter,
  onArchivedToggle,
  onSelect,
  onCreate,
  onCreateCanvas,
  onImportFiles,
  onTidy,
  isImporting,
  isTidying,
  onDelete,
  onArchive,
}: DocumentListProps) {
  const importInputRef = useRef<HTMLInputElement>(null)
  const totalAll = Object.values(languages).reduce((a, b) => a + b, 0)
  const sortedLangs = Object.entries(languages).sort((a, b) => b[1] - a[1])

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-border p-3">
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={onCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            New
          </Button>
          {onCreateCanvas ? (
            <Button size="sm" variant="outline" onClick={onCreateCanvas} aria-label="New canvas">
              Canvas
            </Button>
          ) : null}
          <Button
            id={bulkMode ? 'library-bulk-cancel' : undefined}
            size="sm"
            variant={bulkMode ? 'default' : 'outline'}
            onClick={onBulkToggle}
            aria-pressed={bulkMode}
            aria-label="Bulk select"
          >
            {bulkMode ? (
              <CheckSquare className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept={IMPORT_ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => {
              const list = e.target.files
              if (list?.length && onImportFiles) {
                onImportFiles(Array.from(list))
              }
              e.target.value = ''
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={isImporting}
            onClick={() => importInputRef.current?.click()}
            aria-label="Import files"
            title="Import text, code, PDF, spreadsheet, and DOCX files"
          >
            {isImporting ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <FileUp className="mr-1 h-3.5 w-3.5" aria-hidden />
            )}
            Import
          </Button>
        </div>

        {!archived && onTidy ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={isTidying || isImporting}
            onClick={onTidy}
            title="Remove empty, junk, and test documents"
          >
            {isTidying ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
            )}
            AI Tidy
          </Button>
        ) : null}

        <Input
          type="search"
          placeholder="Search documents…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search documents"
        />

        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) =>
              onSortChange(e.target.value as 'recent' | 'oldest' | 'edits' | 'alpha')
            }
            className="h-9 flex-1 rounded-md border border-border bg-panel px-2 text-sm"
            aria-label="Sort documents"
          >
            <option value="recent">Recent</option>
            <option value="oldest">Oldest</option>
            <option value="edits">Most edits</option>
            <option value="alpha">A–Z</option>
          </select>
          <Button
            size="sm"
            variant={archived ? 'default' : 'outline'}
            onClick={() => onArchivedToggle(!archived)}
            aria-pressed={archived}
            aria-label={archived ? 'Show active documents' : 'Show archived documents'}
          >
            <Archive className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>

        <p className="text-xs text-muted">
          {search || languageFilter
            ? `${total} of ${totalAll} document${totalAll !== 1 ? 's' : ''}`
            : `${totalAll} document${totalAll !== 1 ? 's' : ''}`}
        </p>

        {sortedLangs.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onLanguageFilter(null)}
              className={cn(
                'rounded-full px-2 py-0.5 text-xs transition-colors',
                !languageFilter
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-panel text-muted hover:text-foreground',
              )}
            >
              all ({totalAll})
            </button>
            {sortedLangs.map(([lang, count]) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguageFilter(lang)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors',
                  languageFilter === lang
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-panel text-muted hover:text-foreground',
                )}
              >
                <LangIcon lang={lang} size={11} className="mr-0.5 inline" />
                {lang} ({count})
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isLoading && documents.length === 0 ? (
        <p className="p-4 text-sm text-muted">Loading…</p>
      ) : documents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-sm text-muted">
            {archived ? 'No archived documents.' : 'No documents yet.'}
          </p>
          {!archived ? (
            <Button size="sm" onClick={onCreate}>
              Create document
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-border">
          {documents.map((doc) => {
            const bulkChecked = bulkSelected?.has(doc.id)
            return (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => {
                  if (bulkMode && onBulkSelect) {
                    onBulkSelect(doc.id, !bulkChecked)
                  } else {
                    onSelect(doc.id)
                  }
                }}
                className={cn(
                  'flex w-full items-start gap-2 px-3 py-3 text-left transition-colors hover:bg-panel',
                  selectedId === doc.id && !bulkMode && 'bg-panel',
                  bulkChecked && 'bg-primary/10',
                )}
              >
                {bulkMode ? (
                  <span className="mt-0.5 shrink-0 text-primary" aria-hidden>
                    {bulkChecked ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4 text-muted" />
                    )}
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {doc.title?.trim() || 'Untitled'}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-panel px-1.5 py-0.5 text-[10px] uppercase text-muted">
                      <LangIcon lang={doc.language} size={10} />
                      {doc.language || 'text'}
                    </span>
                  </div>
                  {doc.preview ? (
                    <p className="mt-1 line-clamp-2 font-mono text-xs text-muted">{doc.preview}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted">
                    {formatRelativeTime(doc.updated_at)}
                    {doc.session_name ? ` · ${doc.session_name}` : ''}
                  </p>
                </div>
                {!bulkMode ? (
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={archived ? 'Restore document' : 'Archive document'}
                    onClick={(e) => {
                      e.stopPropagation()
                      onArchive(doc.id, !archived)
                    }}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    aria-label="Delete document"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(doc.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                ) : null}
              </button>
            </li>
          )})}
        </ul>
      )}
    </div>
  )
}
