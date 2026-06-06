import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { focusMainContent } from '@/lib/a11y'
import { applyRouteMeta } from '@/lib/routeMeta'
import { readSavedTheme } from '@/lib/theme'

export function useFocusOnRoute() {
  const { pathname } = useLocation()

  useEffect(() => {
    const accent = readSavedTheme()?.colors?.red ?? '#e06c75'
    applyRouteMeta(pathname, accent)
    focusMainContent()
  }, [pathname])
}
