import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEmailAccounts } from '@/api/email'
import {
  createEmailAccount,
  deleteEmailAccount,
  setDefaultEmailAccount,
  testEmailAccount,
  updateEmailAccount,
  type EmailAccountInput,
} from '@/api/emailAccounts'

const KEY = ['email', 'accounts'] as const

export function useEmailAccounts() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: KEY,
    queryFn: fetchEmailAccounts,
  })

  const create = useMutation({
    mutationFn: (data: EmailAccountInput) => createEmailAccount(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmailAccountInput> }) =>
      updateEmailAccount(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteEmailAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const setDefault = useMutation({
    mutationFn: (id: string) => setDefaultEmailAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const test = useMutation({
    mutationFn: (body: Record<string, unknown>) => testEmailAccount(body),
  })

  return { ...query, create, update, remove, setDefault, test }
}
