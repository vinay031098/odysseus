import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as notesApi from '@/api/notes'
import type { NoteCreatePayload, NoteUpdatePayload } from '@/api/workspace-types'

export const notesQueryKey = ['notes'] as const

export function useNotes() {
  return useQuery({
    queryKey: notesQueryKey,
    queryFn: () => notesApi.fetchNotes(),
  })
}

export function useNoteMutations() {
  const qc = useQueryClient()

  const invalidate = () => void qc.invalidateQueries({ queryKey: notesQueryKey })

  const create = useMutation({
    mutationFn: (payload: NoteCreatePayload) => notesApi.createNote(payload),
    onSuccess: () => {
      invalidate()
      toast.success('Note created')
    },
    onError: () => toast.error('Could not create note'),
  })

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: NoteUpdatePayload }) =>
      notesApi.updateNote(id, payload),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Could not save note'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => notesApi.deleteNote(id),
    onSuccess: () => {
      invalidate()
      toast.success('Note deleted')
    },
    onError: () => toast.error('Could not delete note'),
  })

  const togglePin = useMutation({
    mutationFn: (id: string) => notesApi.toggleNotePin(id),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Could not update pin'),
  })

  return { create, update, remove, togglePin }
}
