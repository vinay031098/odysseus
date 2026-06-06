import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, MessageSquare, Search, Sparkles, Trash2, Upload } from 'lucide-react'
import { fetchSessions } from '@/api/sessions'
import type { MemoryEntry } from '@/api/workspace-types'
import { exportMemoriesJson } from '@/api/memory'
import type { MemoryTidyDiff } from '@/hooks/useMemory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type ImportSuggestion = { text: string; category: string }

type MemoryListProps = {
  items: MemoryEntry[]
  selectedId: string | null
  query: string
  onQueryChange: (q: string) => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onTidy: () => void
  onImport: (file: File) => void
  onExtract?: (sessionId: string) => void
  isTidying?: boolean
  isImporting?: boolean
  isExtracting?: boolean
  importSuggestions?: ImportSuggestion[]
  extractSuggestions?: string[]
  tidyDiff?: MemoryTidyDiff | null
  onClearTidyDiff?: () => void
  onSaveImportSuggestion?: (text: string, category: string) => void
  onSaveExtractSuggestion?: (text: string) => void
  onDismissImport?: () => void
  onDismissExtract?: () => void
}

export function MemoryList({
  items,
  selectedId,
  query,
  onQueryChange,
  onSelect,
  onDelete,
  onTidy,
  onImport,
  onExtract,
  isTidying,
  isImporting,
  isExtracting,
  importSuggestions,
  extractSuggestions,
  tidyDiff,
  onClearTidyDiff,
  onSaveImportSuggestion,
  onSaveExtractSuggestion,
  onDismissImport,
  onDismissExtract,
}: MemoryListProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [sessionId, setSessionId] = useState('')
  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  })

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search memories…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="secondary" disabled={isTidying} onClick={onTidy}>
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            {isTidying ? 'Tidying…' : 'Tidy'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => exportMemoriesJson(items)}
            disabled={items.length === 0}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={isImporting}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.txt,.md,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImport(file)
              e.target.value = ''
            }}
          />
        </div>
        {onExtract ? (
          <div className="flex gap-1">
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs"
            >
              <option value="">Extract from session…</option>
              {(sessionsQuery.data ?? []).slice(0, 50).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              disabled={!sessionId || isExtracting}
              onClick={() => sessionId && onExtract(sessionId)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
        <p className="text-xs text-muted">{items.length} entries</p>
      </div>

      {tidyDiff && (tidyDiff.removed.length > 0 || tidyDiff.edited.length > 0) ? (
        <TidyDiffPanel diff={tidyDiff} onDismiss={onClearTidyDiff} />
      ) : null}

      {extractSuggestions && extractSuggestions.length > 0 ? (
        <SuggestionPanel
          title={`Session extract (${extractSuggestions.length})`}
          onDismiss={onDismissExtract}
          items={extractSuggestions.map((text) => ({ text, category: 'fact' }))}
          onSave={(text) => onSaveExtractSuggestion?.(text)}
        />
      ) : null}

      {importSuggestions && importSuggestions.length > 0 ? (
        <SuggestionPanel
          title={`Import review (${importSuggestions.length})`}
          onDismiss={onDismissImport}
          items={importSuggestions}
          onSave={(text, category) => onSaveImportSuggestion?.(text, category ?? 'fact')}
        />
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
          {query.trim().length >= 2 ? 'No matching memories.' : 'No memories yet.'}
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  'flex w-full items-start gap-2 px-3 py-3 text-left hover:bg-panel',
                  selectedId === item.id && 'bg-panel',
                  tidyDiff?.removed.includes(item.id) && 'memory-tidy-removing opacity-60 line-through',
                  tidyDiff?.edited.some((e) => e.id === item.id) && 'memory-tidy-editing',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-3 text-sm">
                    {tidyDiff?.edited.find((e) => e.id === item.id)?.newText ?? item.text}
                  </p>
                  <div className="mt-1 flex gap-2 text-xs text-muted">
                    {item.category ? <span>{item.category}</span> : null}
                    {item.timestamp ? (
                      <span>{new Date(item.timestamp * 1000).toLocaleDateString()}</span>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-destructive"
                  aria-label="Delete memory"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(item.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TidyDiffPanel({
  diff,
  onDismiss,
}: {
  diff: MemoryTidyDiff
  onDismiss?: () => void
}) {
  return (
    <div className="border-b border-border bg-panel/50 p-3 space-y-2 max-h-40 overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">
          Tidy diff — {diff.removed.length} removed, {diff.edited.length} edited
        </p>
        {onDismiss ? (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : null}
      </div>
      {diff.edited.map((e) => (
        <div key={e.id} className="text-xs space-y-0.5">
          <p className="text-muted line-through">{e.oldText}</p>
          <p>{e.newText}</p>
        </div>
      ))}
      {diff.removed.map((id) => (
        <p key={id} className="text-xs text-muted line-through">
          Removed entry {id.slice(0, 8)}…
        </p>
      ))}
    </div>
  )
}

function SuggestionPanel({
  title,
  items,
  onDismiss,
  onSave,
}: {
  title: string
  items: Array<{ text: string; category?: string }>
  onDismiss?: () => void
  onSave: (text: string, category?: string) => void
}) {
  return (
    <div className="border-b border-border bg-panel/50 p-3 space-y-2 max-h-48 overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">{title}</p>
        {onDismiss ? (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : null}
      </div>
      {items.map((s, i) => (
        <div key={`${s.text}-${i}`} className="flex items-start gap-2 text-xs">
          <span className="min-w-0 flex-1">{s.text}</span>
          <Button size="sm" variant="secondary" onClick={() => onSave(s.text, s.category)}>
            Save
          </Button>
        </div>
      ))}
    </div>
  )
}
