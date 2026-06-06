import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createUser,
  deleteUser,
  fetchUsers,
  setSignupEnabled,
  updateUserPrivileges,
} from '@/api/users'
import type { UserPrivileges } from '@/api/types'

const KEY = ['auth', 'users'] as const

export function useUsers(enabled: boolean) {
  const qc = useQueryClient()

  const list = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await fetchUsers()
      return res.users ?? []
    },
    enabled,
  })

  const create = useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const remove = useMutation({
    mutationFn: (username: string) => deleteUser(username),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const setPrivileges = useMutation({
    mutationFn: ({
      username,
      privileges,
    }: {
      username: string
      privileges: UserPrivileges
    }) => updateUserPrivileges(username, privileges),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const signup = useMutation({
    mutationFn: (enabled: boolean) => setSignupEnabled(enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth', 'status'] }),
  })

  return { ...list, create, remove, setPrivileges, signup }
}
