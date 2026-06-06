import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  Copy,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Trash2,
} from 'lucide-react'
import type { Document } from '@/api/documents'
import { documentRenderPdfUrl } from '@/api/documents'
import { CanvasEditor } from '@/features/editor/CanvasEditor'
import { VersionHistoryPanel } from '@/features/editor/VersionHistoryPanel'
import { MarkdownEditor } from '@/features/library/MarkdownEditor'
import { Button } from '@/components/ui/button'
import {
  formatRelativeTime,
  isPdfDocument,
  shouldRenderMarkdown,
} from '@/lib/documentHelpers'
import { LAST_SESSION_KEY, PENDING_DOC_KEY } from '@/lib/documentKeys'
import {
  emptyCanvasProject,
  isCanvasDocument,
  parseCanvasProject,
  serializeCanvasProject,
  type CanvasProject,
} from '@/lib/canvasHelpers'
import { useDocumentMutations, useDocumentVersions } from '@/hooks/useDocuments'

type DocumentEditorProps = {
  document: Document | null | undefined
  archived: boolean
  isLoading?: boolean
  compact?: boolean
  onDelete: (id: string) => void
  onArchive: (id: string, archived: boolean) => void
  onTitleChange?: (id: string, title: string) => void
}

export function DocumentEditor({
  document: doc,
  archived,
  isLoading,
  compact,
  onDelete,
  onArchive,
  onTitleChange,
}: DocumentEditorProps) {
  const navigate = useNavigate()
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [canvasProject, setCanvasProject] = useState<CanvasProject | null>(null)

  const { update, patch, restoreVersion, cloneToSession } = useDocumentMutations({
    sort: 'recent',
    limit: 50,
  })

  const { data: versions, isLoading: versionsLoading } = useDocumentVersions(
    doc?.id ?? null,
    versionsOpen,
  )

  const isCanvas = doc ? isCanvasDocument(doc.language, doc.current_content || '') : false

  useEffect(() => {
    if (!doc || !isCanvas) {
      setCanvasProject(null)
      return
    }
    const parsed = parseCanvasProject(doc.current_content || '')
    setCanvasProject(parsed ?? emptyCanvasProject())
  }, [doc?.id, doc?.current_content, doc, isCanvas])

  const saveContent = useCallback(
    (content: string, summary?: string) => {
      if (!doc) return
      update.mutate({ id: doc.id, content, summary })
    },
    [doc, update],
  )

  const saveMarkdown = useCallback(
    (title: string, content: string) => {
      if (!doc) return
      if (title !== (doc.title ?? '')) {
        patch.mutate({ id: doc.id, payload: { title } })
        onTitleChange?.(doc.id, title)
      }
      saveContent(content, 'Manual edit')
    },
    [doc, patch, saveContent, onTitleChange],
  )

  const saveCanvas = useCallback(
    (project: CanvasProject) => {
      saveContent(serializeCanvasProject(project), 'Canvas edit')
    },
    [saveContent],
  )

  const canvasSaveTimer = useRef<number | null>(null)

  const handleCanvasChange = useCallback(
    (project: CanvasProject) => {
      setCanvasProject(project)
      if (canvasSaveTimer.current) window.clearTimeout(canvasSaveTimer.current)
      canvasSaveTimer.current = window.setTimeout(() => saveCanvas(project), 2000)
    },
    [saveCanvas],
  )

  const openInSession = () => {
    if (!doc?.session_id) return
    localStorage.setItem(PENDING_DOC_KEY, doc.id)
    navigate(`/chat/${doc.session_id}`)
  }

  const cloneToChat = async () => {
    if (!doc) return
    const sessionId = localStorage.getItem(LAST_SESSION_KEY)
    if (!sessionId) {
      navigate('/chat')
      return
    }
    const cloned = await cloneToSession.mutateAsync({
      sourceId: doc.id,
      sessionId,
    })
    localStorage.setItem(PENDING_DOC_KEY, cloned.id)
    navigate(`/chat/${sessionId}`)
  }

  if (isLoading) {
    return <EditorState message="Loading document…" />
  }

  if (!doc) {
    return (
      <EditorState
        icon={<FileText className="h-10 w-10 text-muted" aria-hidden />}
        message="Select a document to edit"
      />
    )
  }

  const content = doc.current_content || ''
  const lang = doc.language || 'text'
  const pdf = isPdfDocument(content)

  return (
    <div className="relative flex h-full flex-col">
      <header className={compact ? 'hidden' : 'flex items-start justify-between gap-4 border-b border-border px-4 py-3'}>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{doc.title?.trim() || 'Untitled'}</h2>
          <p className="mt-1 text-xs text-muted">
            {lang}
            {doc.version_count ? ` · ${doc.version_count} version${doc.version_count !== 1 ? 's' : ''}` : ''}
            {doc.updated_at ? ` · ${formatRelativeTime(doc.updated_at)}` : ''}
            {update.isPending ? ' · Saving…' : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setVersionsOpen((v) => !v)
              setPreviewContent(null)
            }}
            aria-pressed={versionsOpen}
          >
            <History className="mr-1 h-3.5 w-3.5" />
            v{doc.version_count || 1}
          </Button>
          {doc.session_id ? (
            <Button size="sm" variant="outline" onClick={openInSession}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Open session
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={cloneToSession.isPending}
            onClick={() => void cloneToChat()}
          >
            {cloneToSession.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="mr-1 h-3.5 w-3.5" />
            )}
            Clone to chat
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onArchive(doc.id, !archived)}
          >
            <Archive className="mr-1 h-3.5 w-3.5" />
            {archived ? 'Restore' : 'Archive'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => onDelete(doc.id)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </header>

      <VersionHistoryPanel
        open={versionsOpen}
        onClose={() => {
          setVersionsOpen(false)
          setPreviewContent(null)
        }}
        versions={versions}
        isLoading={versionsLoading}
        isRestoring={restoreVersion.isPending}
        onRestore={(num) => {
          restoreVersion.mutate(
            { id: doc.id, versionNumber: num },
            {
              onSuccess: () => {
                setVersionsOpen(false)
                setPreviewContent(null)
              },
            },
          )
        }}
        onPreview={setPreviewContent}
      />

      <div className="min-h-0 flex-1">
        {pdf ? (
          <iframe
            title={`PDF preview: ${doc.title || 'document'}`}
            src={documentRenderPdfUrl(doc.id)}
            className="h-full w-full border-0 bg-background"
          />
        ) : isCanvas && canvasProject ? (
          <CanvasEditor initialProject={canvasProject} onChange={handleCanvasChange} />
        ) : shouldRenderMarkdown(lang) || lang === 'markdown' ? (
          <MarkdownEditor
            title={doc.title || ''}
            content={content}
            language={lang}
            onSave={saveMarkdown}
            isSaving={update.isPending || patch.isPending}
            previewContent={previewContent}
          />
        ) : (
          <MarkdownEditor
            title={doc.title || ''}
            content={content}
            language={lang}
            onSave={saveMarkdown}
            isSaving={update.isPending || patch.isPending}
            previewContent={previewContent}
          />
        )}
      </div>
    </div>
  )
}

function EditorState({
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
