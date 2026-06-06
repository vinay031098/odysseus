import { useQuery } from '@tanstack/react-query'
import * as documentsApi from '@/api/documents'

export const sessionDocumentsKey = (sessionId: string | null) =>
  ['documents', 'session', sessionId] as const

export function useSessionDocuments(sessionId: string | null) {
  return useQuery({
    queryKey: sessionDocumentsKey(sessionId),
    queryFn: () => documentsApi.fetchSessionDocuments(sessionId!),
    enabled: Boolean(sessionId),
  })
}
