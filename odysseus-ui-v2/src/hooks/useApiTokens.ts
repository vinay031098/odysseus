import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createApiToken,
  deleteApiToken,
  fetchApiTokens,
  fetchTokenProfiles,
  updateApiToken,
} from '@/api/tokens'

const KEY = ['api-tokens'] as const

export function useApiTokens(enabled: boolean) {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: KEY,
    queryFn: fetchApiTokens,
    enabled,
  })

  const profiles = useQuery({
    queryKey: [...KEY, 'profiles'],
    queryFn: fetchTokenProfiles,
    enabled,
  })

  const create = useMutation({
    mutationFn: createApiToken,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; scopes: string[] } }) =>
      updateApiToken(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteApiToken(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  return { ...list, profiles, create, update, remove }
}
