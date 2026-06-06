import { useEffect } from 'react'

/** Publish icon-rail + sidebar widths as CSS vars for modal snap / fullscreen layout. */
export function useNavWidthSync(enabled = true): void {
  useEffect(() => {
    if (!enabled) return

    const root = document.documentElement
    const measure = (el: HTMLElement | null): number | null => {
      if (!el) return null
      const cs = window.getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0
      return Math.round(el.getBoundingClientRect().width)
    }

    const sync = () => {
      const rail = document.getElementById('icon-rail')
      const sidebar = document.getElementById('sidebar')
      const rw = measure(rail)
      if (rw === null) {
        root.style.removeProperty('--icon-rail-w')
      } else if (rw > 0) {
        root.style.setProperty('--icon-rail-w', `${rw}px`)
      } else {
        const cs = rail && window.getComputedStyle(rail)
        const hidden = !cs || cs.display === 'none' || cs.visibility === 'hidden'
        if (hidden) {
          root.style.setProperty('--icon-rail-w', '0px')
        } else {
          root.style.removeProperty('--icon-rail-w')
          requestAnimationFrame(sync)
          return
        }
      }

      const sw = measure(sidebar)
      if (sw === null) {
        root.style.removeProperty('--sidebar-w')
      } else {
        root.style.setProperty('--sidebar-w', `${sw}px`)
      }
    }

    sync()
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(sync)
        : null
    const rail = document.getElementById('icon-rail')
    const sidebar = document.getElementById('sidebar')
    if (rail) ro?.observe(rail)
    if (sidebar) ro?.observe(sidebar)

    const mo =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(sync)
        : null
    if (sidebar) {
      mo?.observe(sidebar, { attributes: true, attributeFilter: ['class', 'style'] })
    }
    if (rail) {
      mo?.observe(rail, { attributes: true, attributeFilter: ['class', 'style'] })
    }

    window.addEventListener('resize', sync)
    return () => {
      ro?.disconnect()
      mo?.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [enabled])
}
