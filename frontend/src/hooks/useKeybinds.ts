import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAuthSettings } from '@/api/settings'
import { DEFAULT_KEYBINDS } from '@/lib/settings-fields'

export function useKeybinds() {
  const query = useQuery({
    queryKey: ['auth', 'settings', 'keybinds'],
    queryFn: fetchAuthSettings,
    staleTime: 60_000,
  })

  const keybinds = useMemo(() => {
    const saved = query.data?.keybinds
    if (saved && typeof saved === 'object') {
      const merged = { ...DEFAULT_KEYBINDS, ...(saved as Record<string, string>) }
      const raw = saved as Record<string, string>
      if (raw.fav_session && raw.star_session === undefined) {
        merged.star_session = raw.fav_session
      }
      return merged
    }
    return { ...DEFAULT_KEYBINDS }
  }, [query.data])

  useEffect(() => {
    ;(window as Window & { _odysseusKeybinds?: Record<string, string> })._odysseusKeybinds =
      keybinds
  }, [keybinds])

  return { keybinds, isLoading: query.isLoading }
}
