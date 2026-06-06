import { useCallback, useEffect, useState } from 'react'
import {
  clearWorkspaceFolder,
  getWorkspaceFolder,
  setWorkspaceFolder,
  WORKSPACE_CHANGE_EVENT,
} from '@/lib/workspaceFolder'

export function useWorkspaceFolder() {
  const [path, setPath] = useState(getWorkspaceFolder)

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ path?: string }>).detail
      if (detail && typeof detail.path === 'string') setPath(detail.path)
    }
    window.addEventListener(WORKSPACE_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(WORKSPACE_CHANGE_EVENT, onChange)
  }, [])

  const setFolder = useCallback((next: string) => {
    setWorkspaceFolder(next)
    setPath(next)
  }, [])

  const clear = useCallback(() => {
    clearWorkspaceFolder()
    setPath('')
  }, [])

  return { path, setFolder, clear }
}
