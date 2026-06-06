import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDefaultChat, fetchModels, flattenModelOptions } from '@/api/models'
import type { DefaultChat, ModelOption } from '@/api/types'

export function useModels() {
  const modelsQuery = useQuery({
    queryKey: ['models'],
    queryFn: () => fetchModels(),
    staleTime: 60_000,
  })

  const defaultQuery = useQuery({
    queryKey: ['default-chat'],
    queryFn: fetchDefaultChat,
    staleTime: 30_000,
  })

  const modelOptions: ModelOption[] = useMemo(
    () => flattenModelOptions(modelsQuery.data?.items ?? []),
    [modelsQuery.data],
  )

  const defaultChat: DefaultChat | null = useMemo(() => {
    const d = defaultQuery.data
    if (!d?.model || !d?.endpoint_url) return null
    return d
  }, [defaultQuery.data])

  const hasModels = modelOptions.length > 0
  const isConfigured = Boolean(defaultChat?.model)

  return {
    modelOptions,
    defaultChat,
    hasModels,
    isConfigured,
    isLoading: modelsQuery.isLoading || defaultQuery.isLoading,
    refetchModels: () => modelsQuery.refetch(),
  }
}
