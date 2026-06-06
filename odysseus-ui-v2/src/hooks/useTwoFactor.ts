import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmTwoFactor,
  disableTwoFactor,
  fetchTwoFactorStatus,
  setupTwoFactor,
} from '@/api/twoFactor'

const KEY = ['auth', '2fa'] as const

export function useTwoFactor() {
  const qc = useQueryClient()

  const status = useQuery({
    queryKey: KEY,
    queryFn: fetchTwoFactorStatus,
  })

  const setup = useMutation({
    mutationFn: setupTwoFactor,
  })

  const confirm = useMutation({
    mutationFn: (code: string) => confirmTwoFactor(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const disable = useMutation({
    mutationFn: (password: string) => disableTwoFactor(password),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  return { ...status, setup, confirm, disable }
}
