import { useMutation } from '@tanstack/react-query'
import { changePassword } from '@/api/settings'
import type { ChangePasswordRequest } from '@/api/types'

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) => changePassword(body),
  })
}
