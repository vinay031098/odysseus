import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createModelEndpoint,
  deleteModelEndpoint,
  fetchModelEndpoints,
  probeModelEndpoint,
  updateModelEndpoint,
  type CreateEndpointInput,
} from '@/api/settings'

export const endpointsQueryKey = ['model-endpoints'] as const

export function useEndpoints(enabled = true) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: endpointsQueryKey,
    queryFn: fetchModelEndpoints,
    enabled,
    staleTime: 30_000,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: endpointsQueryKey })
    void queryClient.invalidateQueries({ queryKey: ['models'] })
    void queryClient.invalidateQueries({ queryKey: ['default-chat'] })
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateEndpointInput) => createModelEndpoint(input),
    onSuccess: invalidate,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_enabled }: { id: string; is_enabled: boolean }) =>
      updateModelEndpoint(id, { is_enabled }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteModelEndpoint(id),
    onSuccess: invalidate,
  })

  const probeMutation = useMutation({
    mutationFn: (id: string) => probeModelEndpoint(id),
    onSuccess: invalidate,
  })

  return {
    endpoints: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    createEndpoint: createMutation.mutateAsync,
    createState: createMutation,
    toggleEndpoint: toggleMutation.mutateAsync,
    toggleState: toggleMutation,
    deleteEndpoint: deleteMutation.mutateAsync,
    deleteState: deleteMutation,
    probeEndpoint: probeMutation.mutateAsync,
    probeState: probeMutation,
  }
}
