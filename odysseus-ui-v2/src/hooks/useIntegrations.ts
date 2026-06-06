import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createIntegration,
  deleteIntegration,
  fetchIntegrationPresets,
  fetchIntegrations,
  testIntegration,
  updateIntegration,
} from '@/api/integrations'

const KEY = ['integrations'] as const

export function useIntegrations(enabled: boolean) {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await fetchIntegrations()
      return res.integrations ?? []
    },
    enabled,
  })

  const presets = useQuery({
    queryKey: [...KEY, 'presets'],
    queryFn: async () => {
      const res = await fetchIntegrationPresets()
      return res.presets ?? {}
    },
    enabled,
  })

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => createIntegration(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      updateIntegration(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteIntegration(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const test = useMutation({
    mutationFn: (id: string) => testIntegration(id),
  })

  return { ...list, presets, create, update, remove, test }
}
