import { useQuery } from '@tanstack/react-query'
import { fetchHealth, fetchReady, fetchRuntime, fetchVersion } from '@/api/services'

export function useServicesHealth() {
  const health = useQuery({
    queryKey: ['services', 'health'],
    queryFn: fetchHealth,
    refetchInterval: 60_000,
  })

  const ready = useQuery({
    queryKey: ['services', 'ready'],
    queryFn: fetchReady,
    refetchInterval: 60_000,
  })

  const runtime = useQuery({
    queryKey: ['services', 'runtime'],
    queryFn: fetchRuntime,
  })

  const version = useQuery({
    queryKey: ['services', 'version'],
    queryFn: fetchVersion,
  })

  return { health, ready, runtime, version }
}
