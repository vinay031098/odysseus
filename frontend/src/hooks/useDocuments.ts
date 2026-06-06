import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as documentsApi from '@/api/documents'
import type { DocumentCreatePayload, DocumentPatchPayload, LibraryQuery } from '@/api/documents'
import {
  importDocumentFiles,
  type ImportProgress,
} from '@/lib/documentImport'

export const documentsLibraryKey = (params: LibraryQuery) =>
  ['documents', 'library', params] as const

export const documentDetailKey = (id: string | null) => ['documents', 'detail', id] as const

export const documentVersionsKey = (id: string | null) => ['documents', 'versions', id] as const

export function useDocumentLibrary(params: LibraryQuery) {
  return useQuery({
    queryKey: documentsLibraryKey(params),
    queryFn: () => documentsApi.fetchLibrary(params),
  })
}

export function useDocument(id: string | null) {
  return useQuery({
    queryKey: documentDetailKey(id),
    queryFn: () => documentsApi.fetchDocument(id!),
    enabled: Boolean(id),
  })
}

export function useDocumentVersions(id: string | null, enabled = false) {
  return useQuery({
    queryKey: documentVersionsKey(id),
    queryFn: () => documentsApi.fetchDocumentVersions(id!),
    enabled: Boolean(id) && enabled,
  })
}

export function useDocumentMutations(libraryParams: LibraryQuery) {
  const qc = useQueryClient()

  const invalidateLibrary = () =>
    void qc.invalidateQueries({ queryKey: documentsLibraryKey(libraryParams) })

  const invalidateDetail = (id: string) =>
    void qc.invalidateQueries({ queryKey: documentDetailKey(id) })

  const create = useMutation({
    mutationFn: (payload: DocumentCreatePayload) => documentsApi.createDocument(payload),
    onSuccess: () => {
      invalidateLibrary()
      toast.success('Document created')
    },
    onError: () => toast.error('Could not create document'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: (_data, id) => {
      invalidateLibrary()
      qc.removeQueries({ queryKey: documentDetailKey(id) })
      toast.success('Document deleted')
    },
    onError: () => toast.error('Could not delete document'),
  })

  const archive = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      documentsApi.archiveDocument(id, archived),
    onSuccess: (_data, { id, archived }) => {
      invalidateLibrary()
      qc.removeQueries({ queryKey: documentDetailKey(id) })
      toast.success(archived ? 'Document archived' : 'Document restored')
    },
    onError: (_err, { archived }) =>
      toast.error(archived ? 'Could not archive document' : 'Could not restore document'),
  })

  const importPdf = useMutation({
    mutationFn: (file: File) => documentsApi.importPdf(file),
    onSuccess: () => {
      invalidateLibrary()
      toast.success('PDF imported')
    },
    onError: () => toast.error('Could not import PDF'),
  })

  const update = useMutation({
    mutationFn: ({
      id,
      content,
      summary,
    }: {
      id: string
      content: string
      summary?: string
    }) => documentsApi.updateDocument(id, { content, summary }),
    onSuccess: (doc) => {
      invalidateLibrary()
      invalidateDetail(doc.id)
      void qc.invalidateQueries({ queryKey: documentVersionsKey(doc.id) })
    },
    onError: () => toast.error('Could not save document'),
  })

  const patch = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: DocumentPatchPayload
    }) => documentsApi.patchDocument(id, payload),
    onSuccess: (doc) => {
      invalidateLibrary()
      invalidateDetail(doc.id)
    },
    onError: () => toast.error('Could not update document'),
  })

  const restoreVersion = useMutation({
    mutationFn: ({ id, versionNumber }: { id: string; versionNumber: number }) =>
      documentsApi.restoreDocumentVersion(id, versionNumber),
    onSuccess: (doc) => {
      invalidateLibrary()
      invalidateDetail(doc.id)
      void qc.invalidateQueries({ queryKey: documentVersionsKey(doc.id) })
      toast.success('Version restored')
    },
    onError: () => toast.error('Could not restore version'),
  })

  const cloneToSession = useMutation({
    mutationFn: async ({
      sourceId,
      sessionId,
      title,
    }: {
      sourceId: string
      sessionId: string
      title?: string
    }) => {
      const src = await documentsApi.fetchDocument(sourceId)
      return documentsApi.createDocument({
        title: title ?? `${src.title || 'Untitled'} (copy)`,
        content: src.current_content,
        language: src.language,
        session_id: sessionId,
      })
    },
    onSuccess: () => {
      invalidateLibrary()
      toast.success('Document cloned to session')
    },
    onError: () => toast.error('Could not clone document'),
  })

  const exportZip = useMutation({
    mutationFn: (ids: string[]) => documentsApi.exportDocumentsZip(ids),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'documents.zip'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export started')
    },
    onError: () => toast.error('Could not export documents'),
  })

  const tidy = useMutation({
    mutationFn: async () => {
      const phase1 = await documentsApi.tidyDocuments()
      let totalDeleted = phase1.deleted
      const totalFixed = phase1.fixed_titles
      let message = phase1.message
      try {
        const phase2 = await documentsApi.aiTidyDocuments()
        totalDeleted += phase2.deleted
        if (phase2.message) message = phase2.message
      } catch {
        /* AI tidy is optional when no endpoint is configured */
      }
      return { totalDeleted, totalFixed, message }
    },
    onSuccess: ({ totalDeleted, totalFixed, message }) => {
      invalidateLibrary()
      if (totalDeleted === 0 && totalFixed === 0) {
        toast.message('Already tidy')
      } else {
        toast.success(message || `Removed ${totalDeleted} document${totalDeleted !== 1 ? 's' : ''}`)
      }
    },
    onError: () => toast.error('Document tidy failed'),
  })

  return {
    create,
    remove,
    archive,
    importPdf,
    update,
    patch,
    restoreVersion,
    cloneToSession,
    exportZip,
    tidy,
    invalidateDetail,
  }
}

export function useDocumentBatchImport(libraryParams: LibraryQuery) {
  const qc = useQueryClient()
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const runningRef = useRef(false)

  const importFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || runningRef.current) return null
      runningRef.current = true
      try {
        const result = await importDocumentFiles(files, { onProgress: setImportProgress })
        void qc.invalidateQueries({ queryKey: documentsLibraryKey(libraryParams) })
        const msg =
          `Imported ${result.imported} file${result.imported !== 1 ? 's' : ''}` +
          (result.failed
            ? `, ${result.failed} failed${result.firstError ? ` — ${result.firstError}` : ''}`
            : '')
        if (result.failed) toast.error(msg)
        else toast.success(msg)
        return result
      } catch {
        toast.error('Import failed')
        return null
      } finally {
        runningRef.current = false
      }
    },
    [libraryParams, qc],
  )

  const clearImportProgress = useCallback(() => setImportProgress(null), [])

  return {
    importFiles,
    importProgress,
    clearImportProgress,
    isImporting: importProgress?.running ?? false,
  }
}
