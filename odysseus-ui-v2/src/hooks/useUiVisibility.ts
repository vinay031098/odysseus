import { useCallback, useEffect, useState } from 'react'
import {
  loadUiVisibility,
  saveUiVisibility,
  type UiVisibilityState,
} from '@/lib/ui-visibility'

export function useUiVisibility() {
  const [state, setState] = useState<UiVisibilityState>(() => loadUiVisibility())

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'odysseus-ui-visibility') {
        setState(loadUiVisibility())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setVisible = useCallback((key: string, visible: boolean) => {
    setState((prev) => {
      const next = { ...prev, [key]: visible }
      saveUiVisibility(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    saveUiVisibility({})
    setState({})
  }, [])

  return { state, setVisible, reset }
}
