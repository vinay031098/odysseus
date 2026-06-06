import { useCallback, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { Download, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, RefreshCw, Sun, X } from 'lucide-react'
import { toast } from 'sonner'
import { IconRail } from './IconRail'
import { Sidebar } from './Sidebar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useFocusOnRoute } from '@/hooks/useFocusOnRoute'
import { useGlobalKeybinds } from '@/hooks/useGlobalKeybinds'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useKeybinds } from '@/hooks/useKeybinds'
import { useMobileSidebar, useSidebarSwipe } from '@/hooks/useMobileSidebar'
import { useNavWidthSync } from '@/hooks/useNavWidthSync'
import { usePwaUpdate } from '@/hooks/usePwaUpdate'
import { useTheme } from '@/hooks/useTheme'
import { initEscBulkCancel } from '@/lib/bulkCancelEsc'
import { initTileManager } from '@/lib/tileManager'
import { SKIP_LINK_LABEL, SKIP_LINK_TARGET_ID } from '@/lib/a11y'
import { cn } from '@/lib/utils'

export function AppShell() {
  const { user, logout, logoutState } = useAuth()
  const { theme, toggle } = useTheme()
  const { canInstall, install, dismiss } = useInstallPrompt()
  const { needRefresh, applyUpdate, dismissUpdate } = usePwaUpdate()
  const {
    sidebarHidden,
    sidebarSide,
    isMobile,
    showIconRail,
    showMobileSidebar,
    showMobileMiniRail,
    mobileMiniRail,
    setMobileMiniRail,
    openSidebar,
    closeSidebar,
    toggleSidebar,
  } = useMobileSidebar()
  const sidebarRef = useRef<HTMLElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  useFocusOnRoute()
  useKeybinds()
  useNavWidthSync(true)

  useEffect(() => initTileManager(), [])

  useEffect(() => initEscBulkCancel(), [])

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', sidebarHidden)
    document.body.classList.toggle('hamburger-left', sidebarSide === 'left')
    document.body.classList.toggle('hamburger-right', sidebarSide === 'right')
    document.body.classList.toggle('hamburger-only', sidebarHidden && !showIconRail && !showMobileMiniRail)
    return () => {
      document.body.classList.remove(
        'sidebar-collapsed',
        'hamburger-left',
        'hamburger-right',
        'hamburger-only',
      )
    }
  }, [sidebarHidden, sidebarSide, showIconRail, showMobileMiniRail])

  useSidebarSwipe({
    enabled: true,
    isMobile,
    sidebarOpen: showMobileSidebar,
    onOpen: openSidebar,
    onClose: closeSidebar,
    sidebarRef,
    swipeAreaRef: mainRef,
  })

  useGlobalKeybinds({
    sidebarHidden,
    onToggleSidebar: () => toggleSidebar(false),
  })

  const handleHamburger = useCallback(
    (e: React.MouseEvent) => {
      toggleSidebar(e.shiftKey)
    },
    [toggleSidebar],
  )

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Signed out')
      window.location.href = '/login'
    } catch {
      toast.error('Could not sign out')
    }
  }

  const showDesktopSidebar = !sidebarHidden && !isMobile
  const showRail =
    (showIconRail || (isMobile && sidebarHidden && !mobileMiniRail)) && !showMobileSidebar
  const showBackdrop = showMobileSidebar || showMobileMiniRail

  const handleExpandFromRail = useCallback(() => {
    if (isMobile) {
      setMobileMiniRail(false)
      openSidebar('right')
      return
    }
    openSidebar()
  }, [isMobile, openSidebar, setMobileMiniRail])

  return (
    <div className="relative flex h-full min-h-0">
      <a
        href={`#${SKIP_LINK_TARGET_ID}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-panel focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        {SKIP_LINK_LABEL}
      </a>

      {showBackdrop ? (
        <button
          type="button"
          id="sidebar-backdrop"
          className="sidebar-backdrop visible"
          aria-label="Close sidebar"
          onClick={() => {
            closeSidebar()
            setMobileMiniRail(false)
          }}
        />
      ) : null}

      {(showDesktopSidebar || showMobileSidebar || (!isMobile && sidebarHidden)) ? (
        <Sidebar
          ref={sidebarRef}
          side={sidebarSide}
          hidden={!showDesktopSidebar && !showMobileSidebar}
          mobileOverlay={showMobileSidebar}
          onNavigate={isMobile ? closeSidebar : undefined}
          onCollapse={closeSidebar}
          onExpandFromRail={() => openSidebar()}
        />
      ) : null}

      {showRail || showMobileMiniRail ? (
        <IconRail
          side={sidebarSide}
          mobileMini={mobileMiniRail}
          onExpandSidebar={handleExpandFromRail}
          onOpenSidebar={isMobile ? () => openSidebar('right') : undefined}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Button
              id="hamburger-btn"
              variant="ghost"
              size="icon"
              onClick={handleHamburger}
              aria-label={
                showMobileSidebar || !sidebarHidden ? 'Hide sidebar' : 'Show sidebar'
              }
              className="hamburger-btn"
            >
              {isMobile ? (
                showMobileSidebar ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )
              ) : sidebarHidden ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
            <div className="text-sm text-muted hidden sm:block">
              Signed in as{' '}
              <span className="font-medium text-foreground">{user?.username ?? 'User'}</span>
              {user?.is_admin ? (
                <span className="ml-2 rounded bg-primary/15 px-2 py-0.5 text-xs text-primary">
                  Admin
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleLogout()}
              disabled={logoutState.isPending}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        {needRefresh ? (
          <div
            className="mx-4 mt-2 flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm"
            role="region"
            aria-label="App update available"
          >
            <span className="text-muted">A new version is ready — refresh to update.</span>
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={dismissUpdate}>
                Later
              </Button>
              <Button type="button" size="sm" onClick={() => void applyUpdate()}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        ) : null}

        {canInstall ? (
          <div
            className={cn(
              'mx-4 mt-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-panel px-3 py-2 text-sm',
            )}
            role="region"
            aria-label="Install app"
          >
            <span className="text-muted">Install Odysseus for quick access</span>
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
                Not now
              </Button>
              <Button type="button" size="sm" onClick={() => void install()}>
                <Download className="h-4 w-4" />
                Install
              </Button>
            </div>
          </div>
        ) : null}

        <main
          ref={mainRef}
          id={SKIP_LINK_TARGET_ID}
          className="min-h-0 flex-1 overflow-hidden outline-none"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
