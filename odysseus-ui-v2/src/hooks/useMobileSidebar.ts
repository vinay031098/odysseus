import { useCallback, useEffect, useRef, useState } from 'react'

const SIDEBAR_HIDDEN_KEY = 'odysseus-v2-sidebar-hidden'
const SIDEBAR_SIDE_KEY = 'odysseus-sidebar-side'
const MOBILE_BREAKPOINT = 768

export function readSidebarHidden(): boolean {
  return localStorage.getItem(SIDEBAR_HIDDEN_KEY) === 'true'
}

export function useMobileSidebar() {
  const [sidebarHidden, setSidebarHidden] = useState(readSidebarHidden)
  const [sidebarSide, setSidebarSide] = useState<'left' | 'right'>(() =>
    localStorage.getItem(SIDEBAR_SIDE_KEY) === 'right' ? 'right' : 'left',
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const [railHidden, setRailHidden] = useState(false)
  const [mobileMiniRail, setMobileMiniRail] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT,
  )
  const userToggledRef = useRef(false)

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobile(mobile)
      if (!mobile) {
        setMobileOpen(false)
        setMobileMiniRail(false)
      }
      if (!userToggledRef.current && mobile && !sidebarHidden) {
        setSidebarHidden(true)
        localStorage.setItem(SIDEBAR_HIDDEN_KEY, 'true')
      }
      userToggledRef.current = false
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [sidebarHidden])

  const openSidebar = useCallback(
    (side?: 'left' | 'right') => {
      userToggledRef.current = true
      if (side) {
        setSidebarSide(side)
        localStorage.setItem(SIDEBAR_SIDE_KEY, side)
      }
      setMobileMiniRail(false)
      if (isMobile) {
        setMobileOpen(true)
        setSidebarHidden(false)
      } else {
        setSidebarHidden(false)
        localStorage.setItem(SIDEBAR_HIDDEN_KEY, 'false')
      }
    },
    [isMobile],
  )

  const closeSidebar = useCallback(() => {
    userToggledRef.current = true
    if (isMobile) {
      setMobileOpen(false)
      setSidebarHidden(true)
    } else {
      setSidebarHidden(true)
      localStorage.setItem(SIDEBAR_HIDDEN_KEY, 'true')
    }
  }, [isMobile])

  const toggleSidebar = useCallback(
    (shiftKey = false) => {
      userToggledRef.current = true
      if (shiftKey) {
        const next = sidebarSide === 'left' ? 'right' : 'left'
        setSidebarSide(next)
        localStorage.setItem(SIDEBAR_SIDE_KEY, next)
        return
      }
      if (isMobile) {
        setMobileMiniRail(false)
        if (mobileOpen) {
          closeSidebar()
        } else {
          setSidebarSide('right')
          openSidebar('right')
        }
        return
      }
      setSidebarHidden((prev) => {
        const next = !prev
        localStorage.setItem(SIDEBAR_HIDDEN_KEY, String(next))
        if (!next) setRailHidden(false)
        return next
      })
    },
    [closeSidebar, isMobile, mobileOpen, openSidebar, sidebarSide],
  )

  const showIconRail = sidebarHidden && !railHidden && !isMobile
  const showMobileSidebar = isMobile && mobileOpen
  const showMobileMiniRail = isMobile && mobileMiniRail && sidebarHidden && !mobileOpen

  const collapseForDock = useCallback(() => {
    if (!sidebarHidden) {
      setSidebarHidden(true)
      localStorage.setItem(SIDEBAR_HIDDEN_KEY, 'true')
    }
    setRailHidden(false)
  }, [sidebarHidden])

  const expandFromDock = useCallback(() => {
    setSidebarHidden(false)
    localStorage.setItem(SIDEBAR_HIDDEN_KEY, 'false')
  }, [])

  useEffect(() => {
    const onCollapse = () => collapseForDock()
    const onExpand = () => expandFromDock()
    window.addEventListener('odysseus:collapse-sidebar-to-rail', onCollapse)
    window.addEventListener('odysseus:expand-sidebar-from-rail', onExpand)
    return () => {
      window.removeEventListener('odysseus:collapse-sidebar-to-rail', onCollapse)
      window.removeEventListener('odysseus:expand-sidebar-from-rail', onExpand)
    }
  }, [collapseForDock, expandFromDock])

  return {
    sidebarHidden,
    sidebarSide,
    isMobile,
    mobileOpen,
    railHidden,
    mobileMiniRail,
    showIconRail,
    showMobileSidebar,
    showMobileMiniRail,
    setRailHidden,
    setMobileMiniRail,
    openSidebar,
    closeSidebar,
    toggleSidebar,
  }
}

/** Swipe from chat area to open sidebar on mobile; swipe sidebar to close. */
export function useSidebarSwipe(opts: {
  enabled: boolean
  isMobile: boolean
  sidebarOpen: boolean
  onOpen: (side: 'left' | 'right') => void
  onClose: () => void
  sidebarRef: React.RefObject<HTMLElement | null>
  swipeAreaRef: React.RefObject<HTMLElement | null>
}) {
  const { enabled, isMobile, sidebarOpen, onOpen, onClose, sidebarRef, swipeAreaRef } = opts
  const touchRef = useRef({ x: 0, y: 0, tracking: false, decided: false })

  useEffect(() => {
    if (!enabled || !isMobile) return

    const reset = () => {
      touchRef.current = { x: 0, y: 0, tracking: false, decided: false }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (!e.touches.length) return
      if (sidebarOpen) return
      const target = e.target as HTMLElement
      if (!swipeAreaRef.current?.contains(target)) return
      touchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        tracking: true,
        decided: false,
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      const t = touchRef.current
      if (!t.tracking || !e.touches.length) return
      const dx = e.touches[0].clientX - t.x
      const dy = e.touches[0].clientY - t.y
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      if (!t.decided) {
        if (adx < 10 && ady < 10) return
        if (ady > adx) {
          t.tracking = false
          return
        }
        t.decided = true
      }
      if (e.cancelable) e.preventDefault()
      if (adx >= 40) {
        t.tracking = false
        onOpen(dx < 0 ? 'right' : 'left')
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
    document.addEventListener('touchend', reset, { passive: true, capture: true })
    document.addEventListener('touchcancel', reset, { passive: true, capture: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart, { capture: true })
      document.removeEventListener('touchmove', onTouchMove, { capture: true })
      document.removeEventListener('touchend', reset, { capture: true })
      document.removeEventListener('touchcancel', reset, { capture: true })
    }
  }, [enabled, isMobile, onOpen, sidebarOpen, swipeAreaRef])

  useEffect(() => {
    const el = sidebarRef.current
    if (!el || !isMobile || !sidebarOpen) return
    let sx = 0
    let sy = 0
    let swiping = false

    const onStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('a, button, input')) {
        swiping = false
        return
      }
      sx = e.touches[0].clientX
      sy = e.touches[0].clientY
      swiping = true
    }

    const onMove = (e: TouchEvent) => {
      if (!swiping) return
      const dx = e.touches[0].clientX - sx
      const dy = Math.abs(e.touches[0].clientY - sy)
      if (dy > 40) {
        swiping = false
        return
      }
      const isRight = el.classList.contains('sidebar-right')
      if ((!isRight && dx < -60) || (isRight && dx > 60)) {
        swiping = false
        onClose()
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', () => {
      swiping = false
    })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
    }
  }, [isMobile, onClose, sidebarOpen, sidebarRef])
}
