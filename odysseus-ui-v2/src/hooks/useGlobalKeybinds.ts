import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { dispatchKeybindEvent } from '@/lib/keybind-events'
import { isTypingTarget, matchesKeybind } from '@/lib/keybinds'
import { noteAppRoute, toggleAppWindow } from '@/lib/modalManager'
import { OPEN_TOOL_ROUTES } from '@/lib/settings-fields'
import { useAuth } from '@/hooks/useAuth'
import { useKeybinds } from '@/hooks/useKeybinds'

interface GlobalKeybindOptions {
  sidebarHidden: boolean
  onToggleSidebar: () => void
}

export function useGlobalKeybinds({ sidebarHidden, onToggleSidebar }: GlobalKeybindOptions) {
  const { keybinds } = useKeybinds()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = !!user?.is_admin

  useEffect(() => {
    noteAppRoute(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target)

      if (matchesKeybind(e, keybinds.toggle_sidebar)) {
        e.preventDefault()
        onToggleSidebar()
        return
      }

      if (matchesKeybind(e, keybinds.admin_panel)) {
        e.preventDefault()
        if (isAdmin) {
          navigate('/settings?tab=services')
        } else {
          navigate('/settings?tab=account')
        }
        return
      }

      if (matchesKeybind(e, keybinds.search)) {
        if (typing) return
        e.preventDefault()
        dispatchKeybindEvent('search')
        return
      }

      if (matchesKeybind(e, keybinds.new_session)) {
        if (typing) return
        e.preventDefault()
        dispatchKeybindEvent('newSession')
        return
      }

      if (matchesKeybind(e, keybinds.star_session)) {
        if (typing) return
        e.preventDefault()
        dispatchKeybindEvent('starSession')
        return
      }

      if (matchesKeybind(e, keybinds.delete_session)) {
        if (typing) return
        e.preventDefault()
        dispatchKeybindEvent('deleteSession')
        return
      }

      if (matchesKeybind(e, keybinds.tts)) {
        e.preventDefault()
        dispatchKeybindEvent('ttsToggle')
        return
      }

      if (matchesKeybind(e, keybinds.incognito)) {
        e.preventDefault()
        dispatchKeybindEvent('incognitoToggle')
        return
      }

      if (matchesKeybind(e, keybinds.settings)) {
        e.preventDefault()
        toggleAppWindow(location.pathname, navigate)
        return
      }

      if (matchesKeybind(e, keybinds.focus_input)) {
        e.preventDefault()
        dispatchKeybindEvent('focusInput')
        return
      }

      for (const [action, route] of Object.entries(OPEN_TOOL_ROUTES)) {
        const combo = keybinds[action]
        if (combo && matchesKeybind(e, combo)) {
          e.preventDefault()
          navigate(route)
          return
        }
      }

      if (matchesKeybind(e, keybinds.cancel)) {
        dispatchKeybindEvent('cancel')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isAdmin, keybinds, location.pathname, navigate, onToggleSidebar, sidebarHidden])
}
