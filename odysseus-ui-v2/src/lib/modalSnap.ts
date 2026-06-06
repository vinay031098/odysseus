/**
 * Edge dock snap for draggable modals — right/left panel docking with hints.
 * Simplified port of static/js/modalSnap.js (no email/doc split).
 */

const SNAP_PX = 60
const UNSNAP_PX = 80
const MIN_CHAT_WIDTH = 380
const MIN_EDGE_DOCK_WIDTH = 320

type DockSide = 'left' | 'right'

function dockClassForSide(side: DockSide): string {
  return side === 'left' ? 'modal-left-docked' : 'modal-right-docked'
}

function leftNavRight(): number {
  const sidebar = document.getElementById('sidebar')
  const rail = document.getElementById('icon-rail')
  let x = 0
  if (sidebar && !sidebar.classList.contains('hidden')) {
    const r = sidebar.getBoundingClientRect()
    if (r.width) x = Math.max(x, r.right)
  }
  if (rail) {
    const cs = window.getComputedStyle(rail)
    if (cs.display !== 'none') {
      const r = rail.getBoundingClientRect()
      if (r.width) x = Math.max(x, r.right)
    }
  }
  return x
}

function defaultDockWidth(): number {
  return Math.min(640, Math.max(420, Math.round(window.innerWidth * 0.38)))
}

function minEdgeDockWidth(): number {
  return window.innerWidth < 900 ? 280 : MIN_EDGE_DOCK_WIDTH
}

function activeDockWidth(side: DockSide): number {
  const cls = side === 'left' ? 'left-dock-active' : 'right-dock-active'
  if (!document.body.classList.contains(cls)) return 0
  const prop = side === 'left' ? '--left-dock-w' : '--right-dock-w'
  const raw = getComputedStyle(document.documentElement).getPropertyValue(prop)
  const n = parseFloat(raw || '')
  return Number.isFinite(n) && n > 0 ? n : 0
}

function clampRightDockWidth(width: number): number {
  const min = minEdgeDockWidth()
  const navRight = leftNavRight()
  const leftDockW = activeDockWidth('left')
  const maxByChat = window.innerWidth - navRight - leftDockW - MIN_CHAT_WIDTH
  const max = Math.min(Math.round(window.innerWidth * 0.82), maxByChat)
  const floor = Math.min(min, Math.max(220, Math.round(max)))
  const ceiling = Math.max(floor, Math.round(max))
  return Math.min(ceiling, Math.max(floor, Math.round(width)))
}

function clampLeftDockWidth(width: number, left = leftNavRight()): number {
  const min = minEdgeDockWidth()
  const rightDockW = activeDockWidth('right')
  const available = Math.max(0, window.innerWidth - left - rightDockW)
  const max = Math.min(Math.round(available * 0.82), available - MIN_CHAT_WIDTH)
  const floor = Math.min(min, Math.max(220, Math.round(max)))
  const ceiling = Math.max(floor, Math.round(max))
  return Math.min(ceiling, Math.max(floor, Math.round(width)))
}

function showSnapHint(on: boolean, side: DockSide = 'right'): void {
  const cls = side === 'left' ? 'modal-snap-hint-left' : 'modal-snap-hint-right'
  let hint = document.querySelector<HTMLElement>(`.${cls}`)
  if (!on) {
    hint?.remove()
    return
  }
  if (hint) return
  hint = document.createElement('div')
  hint.className = `modal-snap-hint ${cls}`
  const w = defaultDockWidth()
  const edge = side === 'left' ? 'left:0' : 'right:0'
  const borderSide = side === 'left' ? 'border-right' : 'border-left'
  hint.style.cssText = `position:fixed;${edge};top:0;bottom:0;width:${w}px;background:color-mix(in srgb, var(--color-primary, #60a5fa) 12%, transparent);${borderSide}:2px dashed color-mix(in srgb, var(--color-primary, #60a5fa) 60%, transparent);z-index:9998;pointer-events:none;transition:opacity 0.12s;`
  document.body.appendChild(hint)
}

export function clearDockSide(side: DockSide, owner: HTMLElement | null = null): void {
  const cls = dockClassForSide(side)
  const others = Array.from(document.querySelectorAll<HTMLElement>(`.${cls}`)).some(
    (el) => el !== owner && el.isConnected,
  )
  if (others) return
  document.body.classList.remove(side === 'left' ? 'left-dock-active' : 'right-dock-active')
  document.documentElement.style.removeProperty(side === 'left' ? '--left-dock-w' : '--right-dock-w')
}

function resolveDockNodes(target: HTMLElement): { modal: HTMLElement; content: HTMLElement } | null {
  const content = target.querySelector<HTMLElement>('.modal-content') ?? target
  return { modal: target, content }
}

function collapseSidebarToRail(): void {
  window.dispatchEvent(new CustomEvent('odysseus:collapse-sidebar-to-rail'))
}

function applyDockInternal(modal: HTMLElement, side: DockSide, dockClass: string): number {
  const nodes = resolveDockNodes(modal)
  if (!nodes) return 0
  const { content } = nodes
  const otherSide: DockSide = side === 'left' ? 'right' : 'left'
  const otherClass = dockClassForSide(otherSide)
  if (modal.classList.contains(otherClass)) {
    modal.classList.remove(otherClass)
    clearDockSide(otherSide, modal)
    content.style.left = ''
    content.style.right = ''
  }

  if (!content.dataset._preDockSnapshot) {
    const r = content.getBoundingClientRect()
    content.dataset._preDockSnapshot = JSON.stringify({
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      collapsedSidebar: false,
    })
  }

  modal.classList.add(dockClass)
  content.style.position = 'fixed'
  content.style.top = '0'
  content.style.bottom = '0'
  content.style.height = '100vh'
  content.style.maxHeight = '100vh'
  content.style.borderRadius = '0'
  content.style.transform = 'none'
  content.style.margin = '0'

  if (side === 'left') {
    collapseSidebarToRail()
    content.dataset._collapsedSidebar = '1'
    content.style.right = 'auto'
    const left = leftNavRight()
    const w = clampLeftDockWidth(defaultDockWidth(), left)
    content.style.left = `${left}px`
    content.style.width = `${w}px`
    content.style.maxWidth = `${w}px`
    document.body.classList.add('left-dock-active')
    document.documentElement.style.setProperty('--left-dock-w', `${w}px`)
    content.dataset._dockSide = side
    return w
  }

  const w = clampRightDockWidth(defaultDockWidth())
  content.style.left = 'auto'
  content.style.right = '0'
  content.style.width = `${w}px`
  content.style.maxWidth = `${w}px`
  document.body.classList.add('right-dock-active')
  document.documentElement.style.setProperty('--right-dock-w', `${w}px`)
  content.dataset._dockSide = side
  return w
}

export function clearRightDock(modal: HTMLElement, cx?: number, cy?: number, dockClass?: string): void {
  const nodes = resolveDockNodes(modal)
  if (!nodes) return
  const { content } = nodes
  const side = (content.dataset._dockSide as DockSide | undefined) ??
    (modal.classList.contains('modal-left-docked') ? 'left' : 'right')
  if (!dockClass) dockClass = dockClassForSide(side)
  if (!modal.classList.contains(dockClass)) return
  modal.classList.remove(dockClass)
  clearDockSide(side, modal)
  delete content.dataset._dockSide

  const snapRaw = content.dataset._preDockSnapshot
  type DockSnapshot = { rect?: SnapRect; collapsedSidebar?: boolean }
  let snap: DockSnapshot | null = null
  if (snapRaw) {
    try {
      snap = JSON.parse(snapRaw) as DockSnapshot
    } catch {
      snap = null
    }
  }

  if (snap?.collapsedSidebar) {
    window.dispatchEvent(new CustomEvent('odysseus:expand-sidebar-from-rail'))
  }

  const r = snap?.rect
  content.style.position = 'fixed'
  content.style.right = ''
  content.style.bottom = ''
  content.style.width = r?.width ? `${r.width}px` : ''
  content.style.height = r?.height ? `${r.height}px` : ''
  content.style.borderRadius = ''
  content.style.transform = ''
  content.style.margin = ''
  const refW = r?.width ?? content.offsetWidth ?? 720
  const targetLeft =
    typeof cx === 'number'
      ? Math.max(8, cx - refW / 2)
      : (r?.left ?? Math.max(8, (window.innerWidth - refW) / 2))
  const targetTop =
    typeof cy === 'number' ? Math.max(8, cy - 20) : (r?.top ?? Math.max(8, window.innerHeight * 0.15))
  content.style.left = `${targetLeft}px`
  content.style.top = `${targetTop}px`
  delete content.dataset._preDockSnapshot
  delete content.dataset._collapsedSidebar
}

type SnapRect = { left: number; top: number; width: number; height: number }

export type EdgeDockController = {
  onMove: (cx: number, cy: number) => boolean
  hovering: () => boolean
  commit: () => void
  release: () => void
  side: () => DockSide
}

export function makeEdgeDockController(
  modal: HTMLElement,
  side: DockSide = 'right',
  dockClass?: string,
): EdgeDockController {
  if (!dockClass) dockClass = dockClassForSide(side)
  let hoveringSnap = false
  const distFromEdge = (cx: number) =>
    side === 'left' ? cx - leftNavRight() : window.innerWidth - cx

  return {
    onMove(cx) {
      if (modal.classList.contains(dockClass)) {
        if (distFromEdge(cx) > UNSNAP_PX) {
          clearRightDock(modal, cx, undefined, dockClass)
          return true
        }
        return false
      }
      const nearEdge = distFromEdge(cx) <= SNAP_PX
      if (nearEdge !== hoveringSnap) {
        hoveringSnap = nearEdge
        showSnapHint(nearEdge, side)
      }
      return false
    },
    hovering() {
      return hoveringSnap
    },
    side() {
      return side
    },
    commit() {
      showSnapHint(false, side)
      hoveringSnap = false
      applyDockInternal(modal, side, dockClass)
    },
    release() {
      showSnapHint(false, side)
      hoveringSnap = false
    },
  }
}

const SNAP_TOP_PX = 6
const DOCK_EDGE_PX = 60

function leftNavWidth(): number {
  const rs = getComputedStyle(document.documentElement)
  const rail = parseInt(rs.getPropertyValue('--icon-rail-w') || '48', 10) || 0
  const sb = parseInt(rs.getPropertyValue('--sidebar-w') || '0', 10) || 0
  return rail + sb
}

function showFullscreenHint(on: boolean): void {
  let hint = document.querySelector<HTMLElement>('.modal-snap-hint-fullscreen')
  if (!on) {
    hint?.remove()
    return
  }
  if (hint) return
  hint = document.createElement('div')
  hint.className = 'modal-snap-hint modal-snap-hint-fullscreen'
  hint.style.cssText =
    'position:fixed;left:0;top:0;right:0;bottom:0;' +
    'background:color-mix(in srgb, var(--color-primary, #60a5fa) 12%, transparent);' +
    'border:2px dashed color-mix(in srgb, var(--color-primary, #60a5fa) 60%, transparent);' +
    'z-index:9998;pointer-events:none;'
  document.body.appendChild(hint)
}

/** Wire header-drag edge docking for a modal element. */
export function makeWindowDraggable(
  modal: HTMLElement,
  options: {
    content: HTMLElement
    header: HTMLElement
    fsClass?: string
    onEnterFullscreen?: () => void
    onExitFullscreen?: (cx: number, cy: number) => void
    skipSelector?: string
    enableDock?: boolean
    enableFullscreen?: boolean
    mobileSkip?: number
  },
): () => void {
  const {
    content,
    header,
    fsClass,
    onEnterFullscreen,
    onExitFullscreen,
    skipSelector = 'button, input, select',
    enableDock = true,
    enableFullscreen = !!onEnterFullscreen,
    mobileSkip = 768,
  } = options

  header.style.cursor = 'move'
  header.style.userSelect = 'none'

  const rightDock = enableDock ? makeEdgeDockController(modal, 'right') : null
  const leftDock = enableDock ? makeEdgeDockController(modal, 'left') : null

  let dragging = false
  let startX = 0
  let startY = 0
  let startLeft = 0
  let startTop = 0

  const isFullscreen = () => !!(fsClass && modal.classList.contains(fsClass))

  const startDrag = (cx: number, cy: number) => {
    dragging = true
    modal.classList.add('modal-dragging')
    const rect = content.getBoundingClientRect()
    startX = cx
    startY = cy
    startLeft = rect.left
    startTop = rect.top
    content.style.position = 'fixed'
    content.style.left = `${startLeft}px`
    content.style.top = `${startTop}px`
    content.style.transform = 'none'
    content.style.margin = '0'
  }

  const onMove = (cx: number, cy: number) => {
    if (!dragging) return
    if (isFullscreen()) {
      const inTopBand = cy <= SNAP_TOP_PX
      const nearRight = !inTopBand && window.innerWidth - cx <= DOCK_EDGE_PX
      const nearLeft = !inTopBand && cx - leftNavWidth() <= DOCK_EDGE_PX
      if (nearRight && rightDock) {
        leftDock?.release()
        rightDock.onMove(cx, cy)
        return
      }
      if (nearLeft && leftDock) {
        rightDock?.release()
        leftDock.onMove(cx, cy)
        return
      }
      if (cy > 24 && onExitFullscreen) {
        onExitFullscreen(cx, cy)
        rightDock?.onMove(cx, cy)
        leftDock?.onMove(cx, cy)
      } else {
        rightDock?.release()
        leftDock?.release()
      }
      return
    }

    if (rightDock && modal.classList.contains('modal-right-docked')) {
      if (rightDock.onMove(cx, cy)) {
        const r = content.getBoundingClientRect()
        startX = cx
        startY = cy
        startLeft = r.left
        startTop = r.top
      }
      return
    }
    if (leftDock && modal.classList.contains('modal-left-docked')) {
      if (leftDock.onMove(cx, cy)) {
        const r = content.getBoundingClientRect()
        startX = cx
        startY = cy
        startLeft = r.left
        startTop = r.top
      }
      return
    }

    content.style.left = `${startLeft + cx - startX}px`
    content.style.top = `${startTop + cy - startY}px`
    const inTopBand = cy <= SNAP_TOP_PX
    showFullscreenHint(enableFullscreen && inTopBand)
    if (inTopBand) {
      rightDock?.release()
      leftDock?.release()
    } else {
      rightDock?.onMove(cx, cy)
      leftDock?.onMove(cx, cy)
    }
  }

  const onEnd = (_cx: number, cy: number) => {
    if (!dragging) return
    dragging = false
    modal.classList.remove('modal-dragging')
    showFullscreenHint(false)
    if (enableFullscreen && cy <= SNAP_TOP_PX && onEnterFullscreen) {
      rightDock?.release()
      leftDock?.release()
      onEnterFullscreen()
      return
    }
    if (rightDock?.hovering()) {
      leftDock?.release()
      if (fsClass) modal.classList.remove(fsClass)
      rightDock.commit()
      return
    }
    if (leftDock?.hovering()) {
      rightDock?.release()
      if (fsClass) modal.classList.remove(fsClass)
      leftDock.commit()
      return
    }
    rightDock?.release()
    leftDock?.release()
  }

  const onMouseDown = (e: MouseEvent) => {
    if (mobileSkip > 0 && window.innerWidth <= mobileSkip) return
    if (skipSelector && (e.target as Element).closest(skipSelector)) return
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
    const move = (ev: MouseEvent) => onMove(ev.clientX, ev.clientY)
    const up = (ev: MouseEvent) => {
      onEnd(ev.clientX, ev.clientY)
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  header.addEventListener('mousedown', onMouseDown)
  return () => header.removeEventListener('mousedown', onMouseDown)
}

export { applyDockInternal as applyEdgeDock, makeEdgeDockController as makeRightDockController }
