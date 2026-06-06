import { useEffect, useRef } from 'react'

type UseEmailReaderSwipeOptions = {
  enabled?: boolean
  onPrev?: () => void
  onNext?: () => void
}

const SWIPE_THRESHOLD = 60
const VERT_ABORT = 14

/** Horizontal touch swipe on the reader body to move prev/next in the list. */
export function useEmailReaderSwipe(
  containerRef: React.RefObject<HTMLElement | null>,
  { enabled = true, onPrev, onNext }: UseEmailReaderSwipeOptions,
) {
  const stateRef = useRef({
    sx: 0,
    sy: 0,
    swiping: false,
    intent: null as 'swipe' | 'scroll' | null,
    scrollEl: null as HTMLElement | null,
    startScrollLeft: 0,
  })

  useEffect(() => {
    const reader = containerRef.current
    if (!reader || !enabled || (!onPrev && !onNext)) return

    const findHScroller = (el: EventTarget | null): HTMLElement | null => {
      let node = el as HTMLElement | null
      while (node && node !== reader) {
        if (node.scrollWidth - node.clientWidth > 2) return node
        node = node.parentElement
      }
      return null
    }

    const onTouchStart = (ev: TouchEvent) => {
      if (ev.touches.length !== 1) {
        stateRef.current.swiping = false
        return
      }
      const target = ev.target as HTMLElement | null
      if (
        target?.closest(
          'button, a, .recipient-chip, .email-attachment-chip, .email-reader-more-wrap, summary',
        )
      ) {
        stateRef.current.swiping = false
        return
      }
      stateRef.current = {
        sx: ev.touches[0].clientX,
        sy: ev.touches[0].clientY,
        swiping: true,
        intent: null,
        scrollEl: findHScroller(ev.target),
        startScrollLeft: findHScroller(ev.target)?.scrollLeft ?? 0,
      }
    }

    const onTouchMove = (ev: TouchEvent) => {
      const s = stateRef.current
      if (!s.swiping) return
      const dx = ev.touches[0].clientX - s.sx
      const dy = ev.touches[0].clientY - s.sy
      if (!s.intent) {
        if (Math.abs(dy) > VERT_ABORT && Math.abs(dy) > Math.abs(dx)) {
          s.intent = 'scroll'
          s.swiping = false
          return
        }
        if (Math.abs(dx) > 12) s.intent = 'swipe'
      }
    }

    const onTouchEnd = (ev: TouchEvent) => {
      const s = stateRef.current
      if (!s.swiping) return
      s.swiping = false
      const t = ev.changedTouches[0]
      if (!t || s.intent !== 'swipe') return
      const dx = t.clientX - s.sx
      const dy = t.clientY - s.sy
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return

      if (s.scrollEl) {
        const max = s.scrollEl.scrollWidth - s.scrollEl.clientWidth
        const atLeftEdge = s.scrollEl.scrollLeft <= 2
        const atRightEdge = s.scrollEl.scrollLeft >= max - 2
        if (dx < 0 && !atRightEdge) return
        if (dx > 0 && !atLeftEdge) return
        if (s.scrollEl.scrollLeft !== s.startScrollLeft) return
      }

      if (dx < 0) onNext?.()
      else onPrev?.()
    }

    reader.addEventListener('touchstart', onTouchStart, { passive: true })
    reader.addEventListener('touchmove', onTouchMove, { passive: true })
    reader.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      reader.removeEventListener('touchstart', onTouchStart)
      reader.removeEventListener('touchmove', onTouchMove)
      reader.removeEventListener('touchend', onTouchEnd)
    }
  }, [containerRef, enabled, onPrev, onNext])
}
