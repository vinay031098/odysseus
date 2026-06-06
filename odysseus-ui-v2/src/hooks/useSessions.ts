import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  archiveSession,
  createSession,
  deleteSession,
  fetchArchivedSessions,
  fetchSessions,
  moveSessionToFolder,
  renameSession,
  setSessionImportant,
  unarchiveSession,
} from '@/api/sessions'
import type { PendingChat, Session } from '@/api/types'
import {
  clearLastSessionId,
  LAST_SESSION_KEY,
  readLastSessionId,
  writeLastSessionId,
} from '@/lib/storageKeys'

export function useSessions(sessionId: string | null, onSessionChange: (id: string | null) => void) {
  const queryClient = useQueryClient()
  const [pendingChat, setPendingChat] = useState<PendingChat | null>(null)

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  })

  const archivedQuery = useQuery({
    queryKey: ['sessions', 'archived'],
    queryFn: () => fetchArchivedSessions({ limit: 50 }),
  })

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['sessions'] })
    void queryClient.invalidateQueries({ queryKey: ['sessions', 'archived'] })
  }, [queryClient])

  const createMutation = useMutation({
    mutationFn: ({ pending, name }: { pending: PendingChat; name?: string }) =>
      createSession(pending, name),
    onSuccess: (data) => {
      invalidate()
      onSessionChange(data.id)
      writeLastSessionId(data.id)
      setPendingChat(null)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create session'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (_, deletedId) => {
      invalidate()
      if (sessionId === deletedId) {
        onSessionChange(null)
        clearLastSessionId()
        setPendingChat(null)
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete session'),
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameSession(id, name),
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message || 'Failed to rename session'),
  })

  const archiveMutation = useMutation({
    mutationFn: archiveSession,
    onSuccess: (_, archivedId) => {
      invalidate()
      toast.success('Session archived')
      if (sessionId === archivedId) {
        onSessionChange(null)
        clearLastSessionId()
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to archive session'),
  })

  const unarchiveMutation = useMutation({
    mutationFn: unarchiveSession,
    onSuccess: () => {
      invalidate()
      toast.success('Session restored')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to restore session'),
  })

  const importantMutation = useMutation({
    mutationFn: ({ id, important }: { id: string; important: boolean }) =>
      setSessionImportant(id, important),
    onSuccess: (_, { important }) => {
      invalidate()
      toast.success(important ? 'Session favorited' : 'Session unfavorited')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update favorite'),
  })

  const folderMutation = useMutation({
    mutationFn: ({ id, folder }: { id: string; folder: string }) =>
      moveSessionToFolder(id, folder),
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message || 'Failed to move session'),
  })

  const startNewChat = useCallback(
    (pending: PendingChat) => {
      setPendingChat(pending)
      onSessionChange(null)
      clearLastSessionId()
    },
    [onSessionChange],
  )

  const selectSession = useCallback(
    (id: string) => {
      setPendingChat(null)
      onSessionChange(id)
      writeLastSessionId(id)
    },
    [onSessionChange],
  )

  const materializePending = useCallback(
    async (pending: PendingChat, options?: { incognito?: boolean }) => {
      const name = options?.incognito
        ? 'Nobody'
        : undefined
      const result = await createSession(pending, name)
      invalidate()
      writeLastSessionId(result.id)
      setPendingChat(null)
      return result.id
    },
    [invalidate],
  )

  useEffect(() => {
    if (sessionId || pendingChat || !sessionsQuery.data?.length) return
    const saved = readLastSessionId()
    if (saved && sessionsQuery.data.some((s) => s.id === saved)) {
      onSessionChange(saved)
    }
  }, [sessionId, pendingChat, sessionsQuery.data, onSessionChange])

  return {
    sessions: (sessionsQuery.data ?? []) as Session[],
    archivedSessions: (archivedQuery.data?.sessions ?? []) as Session[],
    isLoading: sessionsQuery.isLoading,
    pendingChat,
    startNewChat,
    selectSession,
    materializePending,
    deleteSession: deleteMutation.mutate,
    renameSession: renameMutation.mutate,
    archiveSession: archiveMutation.mutate,
    unarchiveSession: unarchiveMutation.mutate,
    toggleImportant: (id: string, important: boolean) =>
      importantMutation.mutate({ id, important }),
    moveToFolder: (id: string, folder: string) => folderMutation.mutate({ id, folder }),
    isCreating: createMutation.isPending,
  }
}

export { LAST_SESSION_KEY }
