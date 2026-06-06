import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as draftsApi from '@/api/editorDrafts'
import type { EditorDraftPayload } from '@/api/editorDrafts'

export const editorDraftsKey = ['editor-drafts'] as const

export function useEditorDrafts() {
  return useQuery({
    queryKey: editorDraftsKey,
    queryFn: () => draftsApi.fetchEditorDrafts(),
  })
}

export function useEditorDraftMutations() {
  const qc = useQueryClient()

  const invalidate = () => void qc.invalidateQueries({ queryKey: editorDraftsKey })

  const save = useMutation({
    mutationFn: (body: {
      id?: string
      name?: string
      source_image_id?: string | null
      width?: number
      height?: number
      payload: EditorDraftPayload
      thumbnail?: string
    }) =>
      body.id
        ? draftsApi.updateEditorDraft(body.id, body)
        : draftsApi.createEditorDraft(body),
    onSuccess: () => {
      invalidate()
      toast.success('Draft saved')
    },
    onError: () => toast.error('Could not save draft'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => draftsApi.deleteEditorDraft(id),
    onSuccess: () => {
      invalidate()
      toast.success('Draft deleted')
    },
    onError: () => toast.error('Could not delete draft'),
  })

  return { save, remove }
}
