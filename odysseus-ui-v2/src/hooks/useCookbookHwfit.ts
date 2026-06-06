import { useQuery } from '@tanstack/react-query'
import { fetchCachedModels } from '@/api/cookbookServe'
import { fetchHwfitModels, type HwfitQuery } from '@/api/cookbookHwfit'
import { buildGpuQuery } from '@/lib/cookbookServeHelpers'

export const cookbookHwfitKeys = {
  models: (query: HwfitQuery) => ['cookbook', 'hwfit', 'models', query] as const,
  cached: (host?: string, sshPort?: string) =>
    ['cookbook', 'hwfit', 'cached', host ?? '', sshPort ?? ''] as const,
}

export function useHwfitModels(query: HwfitQuery, enabled = true) {
  return useQuery({
    queryKey: cookbookHwfitKeys.models(query),
    queryFn: () => fetchHwfitModels(query),
    enabled,
    staleTime: 30_000,
  })
}

export function useHwfitCachedModels(host?: string, sshPort?: string, enabled = true) {
  const gpuQuery = buildGpuQuery(host, sshPort)
  return useQuery({
    queryKey: cookbookHwfitKeys.cached(host, sshPort),
    queryFn: () => fetchCachedModels(gpuQuery),
    enabled,
    staleTime: 60_000,
  })
}
