import { ExternalLink, FileText, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DocSuggestion } from '@/api/types'
import type { Document } from '@/api/documents'
import { DocumentEditor } from '@/features/library/DocumentEditor'
import { useDocument } from '@/hooks/useDocuments'
import { useSessionDocuments } from '@/hooks/useSessionDocuments'
import { LangIcon } from '@/lib/langIcons'
import { streamingDocToDocument, type StreamingDocument } from '@/lib/docStream'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DocumentPanelDockProps {
  open: boolean
  onToggle: () => void
  sessionId: string | null
  activeDocId: string | null
  onSelectDoc: (id: string | null) => void
  streamingDoc?: StreamingDocument | null
  pendingSuggestions?: DocSuggestion[] | null
  onDismissSuggestions?: () => void
  onApplySuggestion?: (suggestion: DocSuggestion) => void
}

function DocumentPanelBody({
  activeDocId,
  onSelectDoc,
  onClose,
  listLoading,
  sessionDocs,
  streamingDoc,
  activeDoc,
  docLoading,
  isStreamingActive,
  pendingSuggestions,
  onDismissSuggestions,
  onApplySuggestion,
}: {
  activeDocId: string | null
  onSelectDoc: (id: string | null) => void
  onClose: () => void
  listLoading: boolean
  sessionDocs: ReturnType<typeof useSessionDocuments>['data']
  streamingDoc?: StreamingDocument | null
  activeDoc: Document | null | undefined
  docLoading: boolean
  isStreamingActive: boolean
  pendingSuggestions?: DocSuggestion[] | null
  onDismissSuggestions?: () => void
  onApplySuggestion?: (suggestion: DocSuggestion) => void
}) {
  const docs = sessionDocs ?? []
  const hasDocs = docs.length > 0 || Boolean(streamingDoc)

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4" />
          Documents
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" asChild className="h-8 px-2 text-xs">
            <Link to="/library">
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Library
            </Link>
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Close document panel">
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-40 overflow-y-auto border-b border-border lg:max-h-40">
        {listLoading ? (
          <p className="p-3 text-xs text-muted">Loading session documents…</p>
        ) : !hasDocs ? (
          <p className="p-3 text-xs text-muted">No documents in this session yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {streamingDoc ? (
              <li key={streamingDoc.id}>
                <button
                  type="button"
                  onClick={() => onSelectDoc(streamingDoc.id)}
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-background',
                    activeDocId === streamingDoc.id && 'bg-background',
                  )}
                >
                  <LangIcon lang={streamingDoc.language} size={12} className="mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {streamingDoc.title?.trim() || 'Untitled'}
                      <span className="ml-1 text-muted">(streaming)</span>
                    </span>
                    <span className="text-muted">{streamingDoc.language || 'text'}</span>
                  </span>
                </button>
              </li>
            ) : null}
            {docs.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onSelectDoc(doc.id)}
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-background',
                    activeDocId === doc.id && 'bg-background',
                  )}
                >
                  <LangIcon lang={doc.language} size={12} className="mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{doc.title?.trim() || 'Untitled'}</span>
                    <span className="text-muted">{doc.language || 'text'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingSuggestions && pendingSuggestions.length > 0 ? (
        <div className="border-b border-border bg-muted/20 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-medium">
              {pendingSuggestions.length} suggestion{pendingSuggestions.length === 1 ? '' : 's'}
            </span>
            <button type="button" className="text-muted hover:text-foreground" onClick={onDismissSuggestions}>
              Dismiss
            </button>
          </div>
          {pendingSuggestions.slice(0, 3).map((sugg) => (
            <div key={sugg.id} className="mb-2 rounded border border-border bg-background p-2 last:mb-0">
              {sugg.reason ? <p className="mb-1 text-muted-foreground">{sugg.reason}</p> : null}
              <p className="font-mono text-[10px] line-through opacity-70">{sugg.find.slice(0, 120)}</p>
              <p className="font-mono text-[10px]">{sugg.replace.slice(0, 120)}</p>
              <Button
                type="button"
                size="sm"
                className="mt-2 h-7"
                onClick={() => onApplySuggestion?.(sugg)}
              >
                Apply
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeDocId ? (
          <>
            {isStreamingActive ? (
              <div className="border-b border-border px-3 py-1 text-[10px] text-primary">
                Streaming document…
              </div>
            ) : null}
            <DocumentEditor
              document={activeDoc}
              archived={false}
              isLoading={docLoading}
              onDelete={() => onSelectDoc(null)}
              onArchive={() => onSelectDoc(null)}
              compact
            />
          </>
        ) : (
          <div className="flex h-full min-h-[12rem] items-center justify-center p-4 text-center text-sm text-muted">
            Select a document to edit alongside chat.
          </div>
        )}
      </div>
    </>
  )
}

export function DocumentPanelDock({
  open,
  onToggle,
  sessionId,
  activeDocId,
  onSelectDoc,
  streamingDoc,
  pendingSuggestions,
  onDismissSuggestions,
  onApplySuggestion,
}: DocumentPanelDockProps) {
  const { data: sessionDocs = [], isLoading: listLoading } = useSessionDocuments(sessionId)
  const isStreamingActive = Boolean(streamingDoc && activeDocId === streamingDoc.id)
  const { data: fetchedDoc, isLoading: docLoading } = useDocument(
    isStreamingActive ? null : activeDocId,
  )
  const activeDoc = isStreamingActive && streamingDoc
    ? streamingDocToDocument(streamingDoc, sessionId)
    : fetchedDoc
  const showDocLoading = !isStreamingActive && docLoading

  if (!open) return null

  const bodyProps = {
    activeDocId,
    onSelectDoc,
    onClose: onToggle,
    listLoading,
    sessionDocs,
    streamingDoc,
    activeDoc,
    docLoading: showDocLoading,
    isStreamingActive,
    pendingSuggestions,
    onDismissSuggestions,
    onApplySuggestion,
  }

  return (
    <>
      <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-panel lg:flex">
        <DocumentPanelBody {...bodyProps} />
      </aside>

      <div className="fixed inset-0 z-50 flex flex-col lg:hidden" role="dialog" aria-label="Documents">
        <button
          type="button"
          className="flex-1 bg-black/50"
          aria-label="Close document panel"
          onClick={onToggle}
        />
        <div className="flex max-h-[88vh] flex-col rounded-t-xl border-t border-border bg-panel shadow-xl">
          <DocumentPanelBody {...bodyProps} />
        </div>
      </div>
    </>
  )
}

export function DocumentPanelToggle({ open, onToggle }: Pick<DocumentPanelDockProps, 'open' | 'onToggle'>) {
  return (
    <Button
      type="button"
      size="sm"
      variant={open ? 'secondary' : 'ghost'}
      className="inline-flex"
      onClick={onToggle}
      aria-label={open ? 'Hide document panel' : 'Show document panel'}
    >
      {open ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
      <span className="ml-1 hidden sm:inline">Docs</span>
    </Button>
  )
}
