import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMcpServer,
  deleteMcpServer,
  fetchMcpServerTools,
  fetchMcpServers,
  reconnectMcpServer,
  toggleMcpServer,
  updateMcpDisabledTools,
  type CreateMcpServerInput,
} from '@/api/mcp'

const KEY = ['mcp', 'servers'] as const

export function useMcpServers(enabled: boolean) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: KEY,
    queryFn: fetchMcpServers,
    enabled,
  })

  const create = useMutation({
    mutationFn: (input: CreateMcpServerInput) => createMcpServer(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const toggle = useMutation({
    mutationFn: ({ id, enabled: on }: { id: string; enabled: boolean }) =>
      toggleMcpServer(id, on),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const reconnect = useMutation({
    mutationFn: (id: string) => reconnectMcpServer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteMcpServer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  return { ...query, create, toggle, reconnect, remove }
}

export function useMcpServerTools(serverId: string | null, enabled: boolean) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['mcp', 'tools', serverId],
    queryFn: () => fetchMcpServerTools(serverId!),
    enabled: enabled && !!serverId,
  })

  const updateTools = useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: string[] }) =>
      updateMcpDisabledTools(id, disabled),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['mcp', 'tools', id] })
    },
  })

  return { ...query, updateTools }
}
