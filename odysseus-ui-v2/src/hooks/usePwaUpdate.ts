import { useCallback, useEffect, useRef, useState } from 'react'

/** Register the service worker in production; surface stale-cache refresh prompts. */
export function usePwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const updateRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)

  const applyUpdate = useCallback(async () => {
    if (updateRef.current) await updateRef.current(true)
    setNeedRefresh(false)
  }, [])

  const dismissUpdate = useCallback(() => setNeedRefresh(false), [])

  useEffect(() => {
    if (import.meta.env.DEV) return

    let cancelled = false

    void import('virtual:pwa-register').then(({ registerSW }) => {
      if (cancelled) return
      updateRef.current = registerSW({
        immediate: true,
        onNeedRefresh() {
          setNeedRefresh(true)
        },
        onOfflineReady() {
          setOfflineReady(true)
        },
      })
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { needRefresh, offlineReady, applyUpdate, dismissUpdate }
}
