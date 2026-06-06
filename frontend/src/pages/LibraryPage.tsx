import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import type { LibraryQuery } from '@/api/documents'
import { DocumentTabs } from '@/features/editor/DocumentTabs'
import type { OpenTab } from '@/features/editor/types'
import { DocumentEditor } from '@/features/library/DocumentEditor'
import { DocumentList } from '@/features/library/DocumentList'
import { ImportProgressPanel } from '@/features/library/ImportProgressPanel'
import {
  useDocument,
  useDocumentBatchImport,
  useDocumentLibrary,
  useDocumentMutations,
} from '@/hooks/useDocuments'
import { emptyCanvasProject, serializeCanvasProject } from '@/lib/canvasHelpers'
import { Button } from '@/components/ui/button'

export function LibraryPage() {
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState<LibraryQuery['sort']>('recent')
  const [languageFilter, setLanguageFilter] = useState<string | null>(null)
  const [archived, setArchived] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const libraryParams = useMemo<LibraryQuery>(
    () => ({
      search: debouncedSearch || undefined,
      language: languageFilter ?? undefined,
      sort,
      limit: 50,
      archived,
    }),
    [debouncedSearch, languageFilter, sort, archived],
  )

  const { data: library, isLoading, isError } = useDocumentLibrary(libraryParams)
  const { data: selectedDoc, isLoading: detailLoading } = useDocument(activeId)
  const { create, remove, archive, exportZip, tidy } = useDocumentMutations(libraryParams)
  const { importFiles, importProgress, clearImportProgress, isImporting } =
    useDocumentBatchImport(libraryParams)

  const documents = useMemo(() => library?.documents ?? [], [library?.documents])
  const languages = library?.languages ?? {}
  const total = library?.total ?? 0

  const openDocument = useCallback(
    (id: string, title?: string) => {
      setOpenTabs((tabs) => {
        if (tabs.some((t) => t.id === id)) return tabs
        return [...tabs, { id, title: title ?? 'Untitled' }]
      })
      setActiveId(id)
    },
    [],
  )

  const closeTab = useCallback(
    (id: string) => {
      setOpenTabs((tabs) => {
        const next = tabs.filter((t) => t.id !== id)
        if (activeId === id) {
          setActiveId(next[next.length - 1]?.id ?? null)
        }
        return next
      })
    },
    [activeId],
  )

  const handleSelect = (id: string) => {
    const doc = documents.find((d) => d.id === id)
    openDocument(id, doc?.title)
  }

  const handleCreate = async () => {
    const doc = await create.mutateAsync({
      title: 'Untitled',
      content: '# Untitled\n\n',
      language: 'markdown',
    })
    openDocument(doc.id, doc.title)
  }

  const handleCreateCanvas = async () => {
    const project = emptyCanvasProject(1024, 768)
    const doc = await create.mutateAsync({
      title: 'Untitled canvas',
      content: serializeCanvasProject(project),
      language: 'canvas',
    })
    openDocument(doc.id, doc.title)
  }

  const handleDelete = (id: string) => {
    remove.mutate(id)
    closeTab(id)
  }

  const handleArchive = (id: string, toArchived: boolean) => {
    archive.mutate({ id, archived: toArchived })
    closeTab(id)
  }

  const handleImportFiles = (files: File[]) => {
    void importFiles(files).then((result) => {
      const last = result?.documents[result.documents.length - 1]
      if (last) openDocument(last.id, last.title)
    })
  }

  const handleTidy = () => {
    tidy.mutate()
  }

  const handleTitleChange = (id: string, title: string) => {
    setOpenTabs((tabs) => tabs.map((t) => (t.id === id ? { ...t, title } : t)))
  }

  const handleBulkExport = () => {
    const ids = [...bulkSelected]
    if (!ids.length) return
    exportZip.mutate(ids)
  }

  useEffect(() => {
    if (!bulkMode) setBulkSelected(new Set())
  }, [bulkMode])

  // Sync tab titles from library list
  useEffect(() => {
    if (!documents.length) return
    setOpenTabs((tabs) =>
      tabs.map((t) => {
        const doc = documents.find((d) => d.id === t.id)
        return doc ? { ...t, title: doc.title || t.title } : t
      }),
    )
  }, [documents])

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-destructive">
        Could not load document library.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[480px] flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" aria-hidden />
              <h1 className="text-lg font-semibold">Documents</h1>
            </div>
            <p className="mt-1 text-sm text-muted">
              Multi-tab editor with markdown, canvas, version history, and bulk export.
            </p>
          </div>
          {bulkMode && bulkSelected.size > 0 ? (
            <Button
              size="sm"
              onClick={handleBulkExport}
              disabled={exportZip.isPending}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Export {bulkSelected.size} as ZIP
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-full max-w-sm shrink-0 border-r border-border">
          <DocumentList
            documents={documents}
            total={total}
            languages={languages}
            selectedId={activeId}
            search={search}
            sort={sort ?? 'recent'}
            languageFilter={languageFilter}
            archived={archived}
            isLoading={isLoading}
            bulkMode={bulkMode}
            bulkSelected={bulkSelected}
            onBulkToggle={() => setBulkMode((v) => !v)}
            onBulkSelect={(id, selected) => {
              setBulkSelected((prev) => {
                const next = new Set(prev)
                if (selected) next.add(id)
                else next.delete(id)
                return next
              })
            }}
            onSearchChange={setSearch}
            onSortChange={setSort}
            onLanguageFilter={setLanguageFilter}
            onArchivedToggle={setArchived}
            onSelect={handleSelect}
            onCreate={() => void handleCreate()}
            onCreateCanvas={() => void handleCreateCanvas()}
            onImportFiles={handleImportFiles}
            onTidy={handleTidy}
            isImporting={isImporting}
            isTidying={tidy.isPending}
            onDelete={handleDelete}
            onArchive={handleArchive}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <DocumentTabs
            tabs={openTabs}
            activeId={activeId}
            onSelect={setActiveId}
            onClose={closeTab}
          />
          <div className="min-h-0 flex-1">
            <DocumentEditor
              document={selectedDoc}
              archived={archived}
              isLoading={Boolean(activeId) && detailLoading}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onTitleChange={handleTitleChange}
            />
          </div>
        </div>
      </div>

      <ImportProgressPanel progress={importProgress} onDismiss={clearImportProgress} />
    </div>
  )
}
