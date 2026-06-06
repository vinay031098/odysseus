import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAuthStatus, login, logout } from '@/api/auth'
import type { LoginRequest } from '@/api/types'

export const authQueryKey = ['auth', 'status'] as const

export function useAuth() {
  const queryClient = useQueryClient()

  const statusQuery = useQuery({
    queryKey: authQueryKey,
    queryFn: fetchAuthStatus,
    staleTime: 30_000,
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: (body: LoginRequest) => login(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authQueryKey })
    },
  })

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(authQueryKey, { authenticated: false })
    },
  })

  const user = statusQuery.data
  const authenticated = !!user?.authenticated

  return {
    user,
    authenticated,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    login: loginMutation.mutateAsync,
    loginState: loginMutation,
    logout: logoutMutation.mutateAsync,
    logoutState: logoutMutation,
    refetch: statusQuery.refetch,
  }
}
