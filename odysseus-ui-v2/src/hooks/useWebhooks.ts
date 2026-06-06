import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createWebhook,
  deleteWebhook,
  fetchWebhooks,
  testWebhook,
  toggleWebhook,
  type CreateWebhookInput,
} from '@/api/webhooks'

const KEY = ['webhooks'] as const

export function useWebhooks(enabled: boolean) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: KEY,
    queryFn: fetchWebhooks,
    enabled,
  })

  const create = useMutation({
    mutationFn: (input: CreateWebhookInput) => createWebhook(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const test = useMutation({
    mutationFn: (id: string) => testWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const toggle = useMutation({
    mutationFn: (id: string) => toggleWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  return { ...query, create, test, toggle, remove }
}
